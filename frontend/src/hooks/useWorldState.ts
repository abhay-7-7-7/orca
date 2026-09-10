import { useEffect, useCallback, useRef } from 'react'
import { useMapStore } from '../store/mapStore'
import { getWorldState } from '../services/fusion'
import { getPFZData } from '../services/agents'
import { getVesselData } from '../services/agents'

const REFRESH_INTERVAL = 60000 // 60 seconds periodic background refresh
const DEBOUNCE_MS = 750 // 750ms debounce for viewport shifts

export function useWorldState() {
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)
  const setWorldState = useMapStore((s) => s.setWorldState)
  const setPFZZones = useMapStore((s) => s.setPFZZones)
  const setVessels = useMapStore((s) => s.setVessels)
  const setLoading = useMapStore((s) => s.setLoading)

  const intervalRef = useRef<number | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const isFetchingRef = useRef(false)
  const hasInitialLoadedRef = useRef(false)
  const lastFetchedCenterRef = useRef<[number, number] | null>(null)
  const lastFetchedZoomRef = useRef<number | null>(null)

  const executeFetch = useCallback(
    async (isBackground = false) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      if (!isBackground && !hasInitialLoadedRef.current) {
        setLoading(true)
      }

      const latSpan = (180 / Math.pow(2, zoom)) * 2
      const lonSpan = (360 / Math.pow(2, zoom)) * 2

      const bounds = {
        min_lat: center[0] - latSpan,
        max_lat: center[0] + latSpan,
        min_lon: center[1] - lonSpan,
        max_lon: center[1] + lonSpan,
      }

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

        lastFetchedCenterRef.current = center
        lastFetchedZoomRef.current = zoom
        hasInitialLoadedRef.current = true
      } catch (err) {
        console.error('Failed to fetch world state:', err)
      } finally {
        isFetchingRef.current = false
        setLoading(false)
      }
    },
    [center, zoom, setWorldState, setPFZZones, setVessels, setLoading]
  )

  useEffect(() => {
    // Check if shift is significant enough to warrant re-fetching
    const lastCenter = lastFetchedCenterRef.current
    const lastZoom = lastFetchedZoomRef.current

    const isFirstTime = !hasInitialLoadedRef.current
    const isSignificantMove =
      !lastCenter ||
      Math.abs(lastCenter[0] - center[0]) > 1.2 ||
      Math.abs(lastCenter[1] - center[1]) > 1.2 ||
      Math.abs((lastZoom || 0) - zoom) >= 1

    if (isFirstTime) {
      executeFetch(false)
    } else if (isSignificantMove) {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = window.setTimeout(() => {
        executeFetch(true)
      }, DEBOUNCE_MS)
    }

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [center, zoom, executeFetch])

  // Periodic automatic sync
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      executeFetch(true)
    }, REFRESH_INTERVAL)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [executeFetch])

  return { refresh: () => executeFetch(false) }
}
