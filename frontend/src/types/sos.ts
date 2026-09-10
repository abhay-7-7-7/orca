export type DistressType =
  | 'capsized'
  | 'taking_water'
  | 'engine_failure'
  | 'fire'
  | 'medical'
  | 'cyclone_trapped'
  | 'collision'
  | 'man_overboard'
  | 'unknown'

export type DistressSeverity = 'critical' | 'high' | 'moderate'

export type DistressStatus =
  | 'active'
  | 'acknowledged'
  | 'dispatched'
  | 'on_scene'
  | 'resolved'
  | 'false_alarm'

export interface GeoLocation {
  lat: number
  lon: number
}

export interface ActionLogItem {
  id: string
  timestamp: string
  author: string
  action_type: string
  note: string
}

export interface RescueAsset {
  id: string
  name: string
  asset_type: 'patrol_vessel' | 'interceptor' | 'helicopter' | 'dornier' | 'station'
  callsign: string
  location: GeoLocation
  base_port: string
  status: 'ready' | 'dispatched' | 'maintenance'
  eta_minutes?: number
}

export interface DistressSignal {
  id: string
  vessel_name: string
  registration_no: string
  boat_type: string
  skipper_name: string
  contact_phone: string
  crew_count: number
  location: GeoLocation
  nearest_port: string
  distance_to_coast_nm: number
  bearing_deg?: number
  water_depth_m?: number
  distress_type: DistressType
  severity: DistressSeverity
  status: DistressStatus
  emergency_message: string
  wave_height_m?: number
  wind_speed_knots?: number
  sea_state?: string
  vhf_channel?: string
  battery_pct?: number
  navic_beacon_id?: string
  assigned_asset?: RescueAsset
  action_log: ActionLogItem[]
  created_at: string
  updated_at: string
}

export interface DistressCreatePayload {
  vessel_name: string
  registration_no: string
  boat_type?: string
  skipper_name: string
  contact_phone: string
  crew_count: number
  lat: number
  lon: number
  distress_type: DistressType
  severity: DistressSeverity
  emergency_message: string
  nearest_port?: string
  vhf_channel?: string
  wave_height_m?: number
  wind_speed_knots?: number
}

export interface DistressStatusUpdatePayload {
  status: DistressStatus
  note?: string
  author?: string
  assigned_asset_id?: string
}

export interface SOSStats {
  total: number
  activeCount: number
  dispatchedCount: number
  resolvedCount: number
  livesAtRisk: number
  readyAssetsCount: number
}
