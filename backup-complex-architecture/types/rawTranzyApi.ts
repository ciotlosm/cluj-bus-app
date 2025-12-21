// Raw Tranzy API interfaces - field names exactly as returned by API
// No transformations, no field renaming, no computed properties

export interface TranzyAgencyResponse {
  agency_id: number;
  agency_name: string;
  agency_url?: string;
  agency_timezone?: string;
  agency_lang?: string;
}

export interface TranzyRouteResponse {
  route_id: number;
  agency_id: number;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string;
  route_type: number; // 0=Tram, 1=Metro, 2=Rail, 3=Bus, 4=Ferry, 11=Trolleybus
  route_url?: string;
  route_color?: string;
  route_text_color?: string;
}

export interface TranzyStopResponse {
  stop_id: number;
  stop_code?: string;
  stop_name: string;
  stop_desc?: string;
  stop_lat: number;
  stop_lon: number;
  zone_id?: string;
  stop_url?: string;
  location_type?: number;
  parent_station?: number;
  stop_timezone?: string;
  wheelchair_boarding?: number;
}

export interface TranzyVehicleResponse {
  vehicle_id: string;
  trip_id?: string;
  route_id?: number;
  position_latitude: number;
  position_longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
  vehicle_type?: number;
  bike_accessible?: 'BIKE_INACCESSIBLE' | 'BIKE_ACCESSIBLE' | 'UNKNOWN';
  wheelchair_accessible?: 'NO_VALUE' | 'UNKNOWN' | 'WHEELCHAIR_ACCESSIBLE' | 'WHEELCHAIR_INACCESSIBLE';
  occupancy_status?: 'EMPTY' | 'MANY_SEATS_AVAILABLE' | 'FEW_SEATS_AVAILABLE' | 'STANDING_ROOM_ONLY' | 'CRUSHED_STANDING_ROOM_ONLY' | 'FULL' | 'NOT_ACCEPTING_PASSENGERS';
}

export interface TranzyStopTimeResponse {
  trip_id: string;
  arrival_time: string; // HH:MM:SS format
  departure_time: string; // HH:MM:SS format
  stop_id: number;
  stop_sequence: number;
  stop_headsign?: string;
  pickup_type?: number;
  drop_off_type?: number;
  shape_dist_traveled?: number;
  timepoint?: number;
}

export interface TranzyTripResponse {
  route_id: number;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: number; // 0 or 1
  block_id?: string;
  shape_id?: string;
  wheelchair_accessible?: number;
  bikes_allowed?: number;
}

// API endpoint configuration
export type TranzyEndpoint = 
  | 'agency'
  | 'routes'
  | 'trips'
  | 'stops'
  | 'stop_times'
  | 'vehicles'
  | 'shapes';

export interface TranzyApiOptions {
  agencyId?: number;
  routeId?: number;
  stopId?: number;
  tripId?: string;
  date?: string; // YYYY-MM-DD format
}