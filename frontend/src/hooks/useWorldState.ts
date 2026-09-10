import { useEffect, useCallback, useRef } from 'react'
import { useMapStore } from '../store/mapStore'
import { getWorldState } from '../services/fusion'
import { getPFZData } from '../services/agents'
import { getVesselData } from '../services/agents'

const REFRESH_INTERVAL = 60000 // 60 seconds

export function useWorldState() {
  const { center, zoom, setWorldState, setPFZZones, setVessels, setLoading } = useMapStore()
  const intervalRef = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    const latSpan = 180 / Math.pow(2, zoom) * 2
    const lonSpan = 360 / Math.pow(2, zoom) * 2

    const bounds = {
      min_lat: center[0] - latSpan,
      max_lat: center[0] + latSpan,
      min_lon: center[1] - lonSpan,
      max_lon: center[1] + lonSpan,
    }

    setLoading(true)
    try {
      const [worldState, pfzData, vesselData] = await Promise.allSettled([
        getWorldState({ ...bounds, resolution: 0.5 }),
        getPFZData(bounds),
        getVesselData(),
      ])

      if (worldState.status === 'fulfilled') {
        setWorldState(worldState.value.cells)
      }
      if (pfzData.status === 'fulfilled') {
        setPFZZones(pfzData.value.zones)
      }
      if (vesselData.status === 'fulfilled') {
        setVessels(vesselData.value.vessels)
      }
    } catch (err) {
      console.error('Failed to fetch world state:', err)
    } finally {
      setLoading(false)
    }
  }, [center, zoom, setWorldState, setPFZZones, setVessels, setLoading])

  useEffect(() => {
    fetchData()
    intervalRef.current = window.setInterval(fetchData, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  return { refresh: fetchData }
}
