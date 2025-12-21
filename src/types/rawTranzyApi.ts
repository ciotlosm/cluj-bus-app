// Raw Tranzy API interfaces - field names exactly as returned by API
// Based on actual API responses from https://api.tranzy.ai/v1/opendata/
// No transformations, no field renaming, no computed properties

export interface TranzyAgencyResponse {
  agency_id: number;
  agency_name: string;
  agency_url?: string;
  agency_timezone?: string;
  agency_phone?: string | null;
  agency_lang?: string;
  agency_fare_url?: string | null;
  agency_urls?: string[]; // Some agencies have multiple URLs
}

export interface TranzyRouteResponse {
  agency_id: number;
  route_id: number;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_type: number; // 0=Tram, 3=Bus, 11=Trolleybus
  route_desc: string;
}

export interface TranzyStopResponse {
  stop_id: number;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  location_type: number;
  stop_code: string | null;
}

export interface TranzyVehicleResponse {
  id: number; // Note: API uses 'id', not 'vehicle_id'
  label: string;
  latitude: number; // Note: API uses 'latitude', not 'position_latitude'
  longitude: number; // Note: API uses 'longitude', not 'position_longitude'
  timestamp: string; // ISO string format, not number
  speed: number;
  route_id: number | null;
  trip_id: string | null;
  vehicle_type: number;
  bike_accessible: 'BIKE_INACCESSIBLE' | 'BIKE_ACCESSIBLE';
  wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE' | 'WHEELCHAIR_INACCESSIBLE';
}

export interface TranzyStopTimeResponse {
  trip_id: string;
  stop_id: number;
  stop_sequence: number;
  // Note: arrival_time and departure_time are NOT included in the API response
  // The API only returns trip_id, stop_id, and stop_sequence
}