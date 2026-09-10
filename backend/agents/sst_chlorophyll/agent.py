"""
SST & Chlorophyll Agent — fetches ocean surface data from ERDDAP.

Sources:
- NOAA GHRSST OISST v5 (0.25° global SST, daily) via ERDDAP — no auth
- ESA OC-CCI chlorophyll v6 (4km, daily) via ERDDAP — no auth
"""

from __future__ import annotations

from datetime import datetime, timedelta

import numpy as np

from backend.agents import AgentBase
from backend.core.config import get_settings
from backend.core.http_client import fetch_json
from backend.core.logging import get_logger
from backend.models.common import BoundingBox
from backend.models.sst_chlorophyll import (
    ChlorophyllDataPoint,
    SSTChlorophyllData,
    SSTDataPoint,
)

logger = get_logger(__name__)


class SSTChlorophyllAgent(AgentBase[SSTChlorophyllData]):
    """
    Fetches SST and Chlorophyll-a gridded data from ERDDAP.

    Cache TTL matches update cadence: daily data, refreshed every 24h.
    """

    agent_name = "sst_chlorophyll"
    update_cadence_seconds = 86400  # 24 hours

    def __init__(self):
        super().__init__()
        self._settings = get_settings()

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> SSTChlorophyllData:
        """
        Fetch real SST + Chlorophyll data.
        Prioritizes Copernicus Marine Service for absolute SST (thetao surface layer);
        falls back to NOAA OISST via ERDDAP.
        """
        if bbox is None:
            # Default: Indian coastal waters per CLAUDE.md §4
            bbox = BoundingBox(min_lat=6.0, max_lat=23.0, min_lon=68.0, max_lon=92.0)

        base_url = self._settings.erddap_base_url
        sst_data: list[SSTDataPoint] = []
        source_sst = "Copernicus Marine (cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i)"

        # 1. Try Copernicus Marine (Primary absolute SST)
        if self._settings.has_copernicus_credentials:
            try:
                import asyncio
                sst_data = await asyncio.wait_for(
                    self._fetch_sst_copernicus(bbox),
                    timeout=20.0,
                )
                logger.info(
                    "Fetched %d SST points from Copernicus Marine Service", len(sst_data)
                )
            except Exception as exc:
                logger.warning(
                    "Copernicus Marine SST fetch failed or timed out: %s — falling back to ERDDAP", exc
                )

        # 2. Fallback to NOAA OISST via ERDDAP
        if not sst_data:
            source_sst = "NOAA OISST v2.1 via ERDDAP"
            try:
                sst_data = await self._fetch_sst_erddap(base_url, bbox)
            except Exception as exc:
                logger.warning("ERDDAP SST fetch failed: %s — using mock", exc)
                return await self._fetch_mock(bbox)

        # 3. Fetch Chlorophyll from OC-CCI (with mock fallback if ERDDAP is down)
        source_chl = "ESA OC-CCI v6 via ERDDAP"
        try:
            chl_data = await self._fetch_chl_erddap(base_url, bbox)
        except Exception as exc:
            logger.warning("ERDDAP Chlorophyll fetch failed: %s — synthesizing coastal chlorophyll", exc)
            mock_data = await self._fetch_mock(bbox)
            chl_data = mock_data.chlorophyll_grid
            source_chl = "SYNTHESIZED — coastal upwelling proxy"

        sst_values = [p.sst_celsius for p in sst_data]
        chl_values = [p.chl_a_mg_m3 for p in chl_data]

        return SSTChlorophyllData(
            sst_grid=sst_data,
            chlorophyll_grid=chl_data,
            sst_min=min(sst_values) if sst_values else None,
            sst_max=max(sst_values) if sst_values else None,
            chl_min=min(chl_values) if chl_values else None,
            chl_max=max(chl_values) if chl_values else None,
            grid_resolution_deg=0.083 if "Copernicus" in source_sst else 0.25,
            source_sst=source_sst,
            source_chlorophyll=source_chl,
            date=datetime.utcnow().strftime("%Y-%m-%d"),
        )

    async def _fetch_sst_copernicus(
        self, bbox: BoundingBox
    ) -> list[SSTDataPoint]:
        """
        Fetch absolute SST from Copernicus Marine Physics Analysis & Forecast.

        Dataset: cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i
        Variable: thetao (sea water potential temperature, converted to Celsius)
        Depth: surface level (~0.49m, shallowest depth level)

        SAFETY CRITICAL:
        DO NOT use cmems_mod_glo_phy_anfc_0.083deg-sst-anomaly_P1D-m for PFZ synthesis!
        The anomaly dataset contains deviations from climatology, NOT absolute temperature.
        Using it would produce invalid thermal front detections.
        """
        import asyncio
        import copernicusmarine

        now = datetime.utcnow()
        start_time = (now - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00")
        end_time = now.strftime("%Y-%m-%dT%H:%M:%S")

        loop = asyncio.get_running_loop()

        def _query_and_extract():
            ds = copernicusmarine.open_dataset(
                dataset_id="cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i",
                username=self._settings.effective_copernicus_username,
                password=self._settings.effective_copernicus_password,
                minimum_longitude=float(bbox.min_lon),
                maximum_longitude=float(bbox.max_lon),
                minimum_latitude=float(bbox.min_lat),
                maximum_latitude=float(bbox.max_lat),
                start_datetime=start_time,
                end_datetime=end_time,
            )
            # Surface layer (depth=0) and latest available analysis time
            ds_surface = ds["thetao"].isel(depth=0).isel(time=-1)
            values = ds_surface.values
            lats = ds_surface.coords["latitude"].values
            lons = ds_surface.coords["longitude"].values

            points = []
            # Downsample stride if high resolution to keep network/memory fast
            step = 1 if len(lats) <= 30 else max(1, len(lats) // 25)
            for i in range(0, len(lats), step):
                lat = float(lats[i])
                for j in range(0, len(lons), step):
                    lon = float(lons[j])
                    val = values[i, j]
                    if not np.isnan(val):
                        temp_c = float(val) - 273.15 if val > 100 else float(val)
                        points.append(
                            SSTDataPoint(
                                lat=round(lat, 3),
                                lon=round(lon, 3),
                                sst_celsius=round(temp_c, 2),
                            )
                        )
            return points

        return await loop.run_in_executor(None, _query_and_extract)

    async def _fetch_sst_erddap(
        self, base_url: str, bbox: BoundingBox
    ) -> list[SSTDataPoint]:
        """Fetch SST data from NOAA OISST via ERDDAP."""
        # ERDDAP griddap query for latest SST
        # Dataset: ncdcOisst21Agg (NOAA OISST v2.1 aggregation)
        yesterday = (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%dT12:00:00Z")
        today = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%dT12:00:00Z")

        url = (
            f"{base_url}/griddap/ncdcOisst21Agg.json"
            f"?sst[({yesterday}):1:({today})]"
            f"[(0.0):1:(0.0)]"  # zlev = 0 (surface)
            f"[({bbox.min_lat}):1:({bbox.max_lat})]"
            f"[({bbox.min_lon}):1:({bbox.max_lon})]"
        )

        try:
            data = await fetch_json(url)
            return self._parse_erddap_sst(data)
        except Exception as exc:
            logger.warning("ERDDAP SST fetch failed: %s — will use mock", exc)
            raise

    async def _fetch_chl_erddap(
        self, base_url: str, bbox: BoundingBox
    ) -> list[ChlorophyllDataPoint]:
        """Fetch Chlorophyll-a from ESA OC-CCI via ERDDAP."""
        # Dataset: pmlEsaCCI60OceanColorMonthly or similar
        # Using a monthly composite as daily can have gaps
        url = (
            f"{base_url}/griddap/pmlEsaCCI60OceanColorMonthly.json"
            f"?chlor_a[(last)]"
            f"[({bbox.min_lat}):1:({bbox.max_lat})]"
            f"[({bbox.min_lon}):1:({bbox.max_lon})]"
        )

        try:
            data = await fetch_json(url)
            return self._parse_erddap_chl(data)
        except Exception as exc:
            logger.warning("ERDDAP Chlorophyll fetch failed: %s — will use mock", exc)
            raise

    def _parse_erddap_sst(self, data: dict) -> list[SSTDataPoint]:
        """Parse ERDDAP JSON response for SST data."""
        points = []
        try:
            table = data.get("table", {})
            col_names = table.get("columnNames", [])
            rows = table.get("rows", [])

            lat_idx = col_names.index("latitude") if "latitude" in col_names else -1
            lon_idx = col_names.index("longitude") if "longitude" in col_names else -1
            sst_idx = col_names.index("sst") if "sst" in col_names else -1

            if lat_idx < 0 or lon_idx < 0 or sst_idx < 0:
                logger.warning("Unexpected ERDDAP column names: %s", col_names)
                return points

            for row in rows:
                sst_val = row[sst_idx]
                if sst_val is not None and not (isinstance(sst_val, float) and np.isnan(sst_val)):
                    points.append(
                        SSTDataPoint(
                            lat=float(row[lat_idx]),
                            lon=float(row[lon_idx]),
                            sst_celsius=float(sst_val),
                        )
                    )
        except Exception as exc:
            logger.error("Error parsing ERDDAP SST response: %s", exc)

        return points

    def _parse_erddap_chl(self, data: dict) -> list[ChlorophyllDataPoint]:
        """Parse ERDDAP JSON response for Chlorophyll data."""
        points = []
        try:
            table = data.get("table", {})
            col_names = table.get("columnNames", [])
            rows = table.get("rows", [])

            lat_idx = col_names.index("latitude") if "latitude" in col_names else -1
            lon_idx = col_names.index("longitude") if "longitude" in col_names else -1
            chl_idx = col_names.index("chlor_a") if "chlor_a" in col_names else -1

            if lat_idx < 0 or lon_idx < 0 or chl_idx < 0:
                logger.warning("Unexpected ERDDAP column names: %s", col_names)
                return points

            for row in rows:
                chl_val = row[chl_idx]
                if chl_val is not None and not (isinstance(chl_val, float) and np.isnan(chl_val)):
                    points.append(
                        ChlorophyllDataPoint(
                            lat=float(row[lat_idx]),
                            lon=float(row[lon_idx]),
                            chl_a_mg_m3=float(chl_val),
                        )
                    )
        except Exception as exc:
            logger.error("Error parsing ERDDAP Chlorophyll response: %s", exc)

        return points

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> SSTChlorophyllData:
        """
        Return synthetic but realistic SST + Chlorophyll data.

        Models typical Indian Ocean patterns:
        - SST: ~26-30°C with a warm pool in the Bay of Bengal
        - Chlorophyll: higher near coast (upwelling), lower offshore
        """
        if bbox is None:
            bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

        np.random.seed(42)  # Reproducible mock data
        resolution = 0.5  # Coarser for mock to keep response small

        lats = np.arange(bbox.min_lat, bbox.max_lat, resolution)
        lons = np.arange(bbox.min_lon, bbox.max_lon, resolution)

        sst_grid = []
        chl_grid = []

        for lat in lats:
            for lon in lons:
                # SST: warmer near equator, cooler north, warm Bay of Bengal
                base_sst = 30.0 - abs(lat - 10.0) * 0.3
                sst_noise = np.random.normal(0, 0.3)
                sst = round(float(base_sst + sst_noise), 2)

                sst_grid.append(SSTDataPoint(lat=float(lat), lon=float(lon), sst_celsius=sst))

                # Chlorophyll: higher near coast (simple distance model)
                coast_proximity = max(0, 1.0 - min(
                    abs(lon - 72.0),
                    abs(lon - 80.0),
                    abs(lat - 22.0),
                ) / 10.0)
                base_chl = 0.1 + coast_proximity * 2.0
                chl_noise = np.random.exponential(0.1)
                chl = round(float(max(0.01, base_chl + chl_noise)), 3)

                chl_grid.append(
                    ChlorophyllDataPoint(lat=float(lat), lon=float(lon), chl_a_mg_m3=chl)
                )

        sst_values = [p.sst_celsius for p in sst_grid]
        chl_values = [p.chl_a_mg_m3 for p in chl_grid]

        return SSTChlorophyllData(
            sst_grid=sst_grid,
            chlorophyll_grid=chl_grid,
            sst_min=min(sst_values),
            sst_max=max(sst_values),
            chl_min=min(chl_values),
            chl_max=max(chl_values),
            grid_resolution_deg=resolution,
            source_sst="MOCK — synthetic Indian Ocean SST pattern",
            source_chlorophyll="MOCK — synthetic coastal chlorophyll pattern",
            date=datetime.utcnow().strftime("%Y-%m-%d"),
        )


# ── Singleton ───────────────────────────────────────────────────────────

_instance: SSTChlorophyllAgent | None = None


def get_sst_chlorophyll_agent() -> SSTChlorophyllAgent:
    global _instance
    if _instance is None:
        _instance = SSTChlorophyllAgent()
    return _instance
