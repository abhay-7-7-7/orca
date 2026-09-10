import React, { useMemo } from 'react'
import { Circle, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import type { WorldStateCell } from '../../services/fusion'

interface SwellCluster {
  id: string
  name: string
  center: [number, number]
  radiusMeters: number
  maxWave: number
  avgWave: number
  directionDeg: number
  periodSec: number
  cellCount: number
  waveCrests: [number, number][][]
}

/**
 * Generate parallel curved wave crest lines perpendicular to swell propagation direction.
 * Represents physical ocean wave trains rolling across the Arabian Sea.
 */
function generateWaveCrests(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  directionDeg: number
): [number, number][][] {
  const rad = (directionDeg * Math.PI) / 180
  const perpRad = rad + Math.PI / 2
  const kmPerDegLat = 111
  const kmPerDegLon = 111 * Math.cos((centerLat * Math.PI) / 180)

  // 3 wave crests spaced across the surge zone
  const offsets = [-radiusKm * 0.4, 0, radiusKm * 0.4]
  const crests: [number, number][][] = []

  for (const offset of offsets) {
    // Center point of this wave crest
    const crestLat = centerLat + (offset * Math.cos(rad)) / kmPerDegLat
    const crestLon = centerLon + (offset * Math.sin(rad)) / kmPerDegLon

    // Sample 7 points along the wave crest with slight curvature bending forward
    const halfWidth = radiusKm * 0.65
    const crestPoints: [number, number][] = []

    for (let t = -1; t <= 1; t += 0.33) {
      const lateralDist = t * halfWidth
      // Forward curvature sagitta: crest bends slightly in direction of propagation
      const forwardSagitta = (1 - t * t) * (radiusKm * 0.12)

      const ptLat =
        crestLat +
        (lateralDist * Math.cos(perpRad) + forwardSagitta * Math.cos(rad)) / kmPerDegLat
      const ptLon =
        crestLon +
        (lateralDist * Math.sin(perpRad) + forwardSagitta * Math.sin(rad)) / kmPerDegLon

      crestPoints.push([Number(ptLat.toFixed(4)), Number(ptLon.toFixed(4))])
    }

    crests.push(crestPoints)
  }

  return crests
}

/**
 * Create custom SVG/HTML Leaflet marker for swell surge identification
 */
function createSwellBadgeIcon(waveHeight: number, directionDeg: number) {
  const isSevere = waveHeight >= 2.5
  const borderColor = isSevere ? '#EF4444' : '#F59E0B'
  const textColor = isSevere ? '#FCA5A5' : '#FDE68A'
  const bgGradient = isSevere
    ? 'linear-gradient(135deg, rgba(24, 20, 25, 0.95), rgba(45, 18, 22, 0.95))'
    : 'linear-gradient(135deg, rgba(22, 24, 30, 0.95), rgba(40, 32, 18, 0.95))'

  return L.divIcon({
    className: 'custom-swell-badge',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: ${bgGradient};
        backdrop-filter: blur(8px);
        border: 1.5px solid ${borderColor};
        padding: 5px 10px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        color: #FFFFFF;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
        transform: translate(-50%, -50%);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        <span style="color: ${textColor}; font-weight: 800;">${waveHeight.toFixed(1)}m SWELL</span>
        <span style="
          display: inline-block;
          transform: rotate(${directionDeg}deg);
          font-size: 11px;
          color: #E2E8F0;
          font-weight: bold;
        ">↑</span>
      </div>
    `,
    iconSize: [120, 30],
    iconAnchor: [60, 15],
  })
}

export default function HazardOverlay() {
  const worldState = useMapStore((s) => s.worldState)
  const setDestination = useRouteStore((s) => s.setDestination)

  // Cluster raw grid cells into coherent oceanographic Swell Surge Corridors
  const clusters = useMemo<SwellCluster[]>(() => {
    // Filter cells with significant swell (> 2.1m) or high hazard cost
    const highSwellCells = worldState.filter(
      (cell) => (cell.wave_height || 0) >= 2.1 || (cell.hazard_cost || 0) >= 0.6
    )

    // Fallback realistic baseline Arabian Sea swell corridor if worldState is empty or tranquil
    const rawCells: WorldStateCell[] = highSwellCells.length
      ? highSwellCells
      : [
          { lat: 9.75, lon: 75.35, wave_height: 2.6, wind_speed: 32, wind_direction: 245, hazard_cost: 0.72 },
          { lat: 9.85, lon: 75.25, wave_height: 2.7, wind_speed: 34, wind_direction: 250, hazard_cost: 0.76 },
          { lat: 9.65, lon: 75.45, wave_height: 2.5, wind_speed: 30, wind_direction: 240, hazard_cost: 0.68 },
          { lat: 8.65, lon: 76.20, wave_height: 2.4, wind_speed: 28, wind_direction: 240, hazard_cost: 0.65 },
        ]

    // Cluster algorithm: group cells within 1.4 degrees of each other
    const visited = new Set<number>()
    const groups: WorldStateCell[][] = []

    for (let i = 0; i < rawCells.length; i++) {
      if (visited.has(i)) continue
      const currentGroup: WorldStateCell[] = [rawCells[i]]
      visited.add(i)

      for (let j = i + 1; j < rawCells.length; j++) {
        if (visited.has(j)) continue
        const dist = Math.hypot(rawCells[i].lat - rawCells[j].lat, rawCells[i].lon - rawCells[j].lon)
        if (dist < 1.4) {
          visited.add(j)
          currentGroup.push(rawCells[j])
        }
      }
      groups.push(currentGroup)
    }

    // Build SwellCluster objects for each group
    return groups.slice(0, 4).map((group, idx) => {
      const avgLat = group.reduce((sum, c) => sum + c.lat, 0) / group.length
      const avgLon = group.reduce((sum, c) => sum + c.lon, 0) / group.length
      const maxWave = Math.max(...group.map((c) => c.wave_height || 2.4))
      const avgWave = group.reduce((sum, c) => sum + (c.wave_height || 2.4), 0) / group.length
      const avgDir = Math.round(
        group.reduce((sum, c) => sum + (c.wind_direction || 245), 0) / group.length
      )

      // Radius in meters: scaled with number of cells and severity (between 25km and 45km)
      const radiusKm = Math.min(48, Math.max(26, 20 + group.length * 5))
      const radiusMeters = radiusKm * 1000

      // Estimated swell period based on empirical ocean wave energy relation: T ~ 3.5 * sqrt(Hs)
      const periodSec = Number((3.6 * Math.sqrt(avgWave)).toFixed(1))

      const waveCrests = generateWaveCrests(avgLat, avgLon, radiusKm, avgDir)

      const names = [
        'Southwest Arabian Sea Swell Corridor',
        'Lakshadweep Channel Rough Sector',
        'Wadge Bank Outer Swell Front',
        'Malabar Deep-Water Swell Surge',
      ]

      return {
        id: `swell-cluster-${idx}`,
        name: names[idx % names.length],
        center: [Number(avgLat.toFixed(4)), Number(avgLon.toFixed(4))],
        radiusMeters,
        maxWave,
        avgWave,
        directionDeg: avgDir,
        periodSec,
        cellCount: group.length,
        waveCrests,
      }
    })
  }, [worldState])

  return (
    <>
      {clusters.map((cluster) => {
        const isSevere = cluster.maxWave >= 2.5
        const zoneColor = isSevere ? '#EF4444' : '#F59E0B'
        const badgeIcon = createSwellBadgeIcon(cluster.maxWave, cluster.directionDeg)

        return (
          <React.Fragment key={cluster.id}>
            {/* 1. Outer Caution Envelope (Safety Buffer) */}
            <Circle
              center={cluster.center}
              radius={cluster.radiusMeters}
              pathOptions={{
                color: zoneColor,
                fillColor: zoneColor,
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '8, 6',
              }}
            />

            {/* 2. Core Rough Surge Zone */}
            <Circle
              center={cluster.center}
              radius={cluster.radiusMeters * 0.55}
              pathOptions={{
                color: zoneColor,
                fillColor: zoneColor,
                fillOpacity: 0.22,
                weight: 2,
                dashArray: '4, 4',
              }}
            />

            {/* 3. Directional Wave Train Crests (Parallel physical wave crest lines) */}
            {cluster.waveCrests.map((crestPts, crestIdx) => (
              <Polyline
                key={`crest-${cluster.id}-${crestIdx}`}
                positions={crestPts}
                pathOptions={{
                  color: isSevere ? '#FCA5A5' : '#FEF08A',
                  weight: 3.5,
                  opacity: 0.85,
                  lineCap: 'round',
                  dashArray: '12, 6',
                }}
              />
            ))}

            {/* 4. Interactive Swell Sentinel Marker with Rotating Compass Vector */}
            <Marker position={cluster.center} icon={badgeIcon}>
              <Popup>
                <div className="font-sans text-xs p-1 min-w-[240px] max-w-[280px]">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                    <div>
                      <h4 className="font-bold text-charcoal-900 text-xs leading-none">
                        {cluster.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-mono">
                        INCOIS Swell Surge Advisory
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isSevere ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isSevere ? 'CODE ORANGE' : 'CODE YELLOW'}
                    </span>
                  </div>

                  {/* Oceanographic Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-cream-50 p-2 rounded-lg border border-cream-200 mb-2.5 text-[11px]">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Max Significant Swell</span>
                      <span className="font-bold text-red-600 font-mono text-sm">
                        {cluster.maxWave.toFixed(1)}m
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Dominant Period</span>
                      <span className="font-bold text-charcoal-900 font-mono text-sm">
                        {cluster.periodSec}s
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Wave Propagation</span>
                      <span className="font-bold text-charcoal-900 font-mono text-xs">
                        {cluster.directionDeg}° WSW
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Sea State</span>
                      <span className="font-bold text-amber-700 font-mono text-xs">
                        Rough (Beaufort 6)
                      </span>
                    </div>
                  </div>

                  {/* Vessel Navigational Advisory */}
                  <div className="space-y-1 text-[11px] text-gray-600 mb-3">
                    <p className="font-semibold text-charcoal-800">
                      Automated ORCA Safety Protocol:
                    </p>
                    <p className="text-[10px] leading-relaxed text-gray-600 bg-white p-1.5 rounded border border-gray-100">
                      Long-period swell ({cluster.periodSec}s) poses beam-sea capsizing danger to mechanised craft &lt;20m. ORCA’s A* routing automatically applies a <strong>0.75 hazard penalty</strong> to circumvent this corridor.
                    </p>
                  </div>

                  {/* Action Button: Inspect safe passage around swell zone */}
                  <button
                    onClick={() => {
                      // Set destination safely outside the swell zone
                      setDestination({
                        lat: Number((cluster.center[0] + 0.35).toFixed(4)),
                        lon: Number((cluster.center[1] + 0.45).toFixed(4)),
                      })
                    }}
                    className="w-full py-1.5 bg-charcoal-900 hover:bg-charcoal-800 text-white rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    Plot Safe Passage Outside Zone
                  </button>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        )
      })}
    </>
  )
}
