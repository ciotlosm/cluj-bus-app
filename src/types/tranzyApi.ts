// Enhanced Tranzy API interfaces based on GTFS specification

export interface TranzyAgencyResponse {
  agency_id: number;
  agency_name: string;
  agency_url?: string;
  agency_timezone?: string;
  agency_lang?: string;
  agency_urls?: string[];
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

export interface TranzyVehicleResponse {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  vehicle_type: number;
  bike_accessible: 'BIKE_INACCESSIBLE' | 'BIKE_ACCESSIBLE' | 'UNKNOWN';
  wheelchair_accessible: 'NO_VALUE' | 'UNKNOWN' | 'WHEELCHAIR_ACCESSIBLE' | 'WHEELCHAIR_INACCESSIBLE';
  speed: number;
  route_id: number;
  trip_id?: string;
  bearing?: number;
  occupancy_status?: 'EMPTY' | 'MANY_SEATS_AVAILABLE' | 'FEW_SEATS_AVAILABLE' | 'STANDING_ROOM_ONLY' | 'CRUSHED_STANDING_ROOM_ONLY' | 'FULL' | 'NOT_ACCEPTING_PASSENGERS';
}

export interface TranzyShapeResponse {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
  shape_dist_traveled?: number;
}

// Enhanced data structures for internal use
export interface Route {
  id: string;
  agencyId: string;
  routeName: string;
  routeDesc: string;
  type: 'tram' | 'metro' | 'rail' | 'bus' | 'ferry' | 'trolleybus' | 'other';
  color?: string;
  textColor?: string;
  url?: string;
}

export interface Trip {
  id: string;
  routeId: string;
  serviceId: string;
  headsign?: string;
  shortName?: string;
  direction: 'inbound' | 'outbound';
  blockId?: string;
  shapeId?: string;
  isWheelchairAccessible: boolean;
  areBikesAllowed: boolean;
}

export interface StopTime {
  tripId: string;
  stopId: string;
  arrivalTime: string;
  departureTime: string;
  sequence: number;
  headsign?: string;
  isPickupAvailable: boolean;
  isDropOffAvailable: boolean;
}

// Alias for conceptual clarity - StopTime represents vehicle route paths
export type VehicleRoutePath = StopTime;

export interface Schedule {
  stopId: string;
  routeId: string;
  tripId: string;
  direction: 'inbound' | 'outbound';
  headsign: string;
  scheduledTimes: {
    arrival: Date;
    departure: Date;
  }[];
}

export interface LiveVehicle {
  id: string;
  routeId: string;
  tripId?: string;
  label: string;
  position: {
    latitude: number;
    longitude: number;
    bearing?: number;
  };
  timestamp: Date;
  speed: number;
  occupancy?: string;
  isWheelchairAccessible: boolean;
  isBikeAccessible: boolean;
}

// Vehicle route path data (from stop_times)
export interface VehicleRoute {
  tripId: string;
  stopId: string;
  arrivalTime: string;
  departureTime: string;
  sequence: number;
  headsign?: string;
  isPickupAvailable: boolean;
  isDropOffAvailable: boolean;
}

// Combined data for enhanced vehicle information (live vehicle + route + schedule data)
export interface EnhancedVehicleInfo {
  // Live vehicle data
  vehicle?: LiveVehicle;
  
  // Schedule data
  schedule?: Schedule;
  
  // Computed information
  id: string;
  route: string; // Display name (route_short_name like "42", "43B")
  routeId: string; // Internal route ID for API calls
  destination: string; // From trip_headsign or route_long_name
  direction: 'work' | 'home' | 'unknown';
  routeType?: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
  
  // Timing information
  scheduledArrival?: Date;
  liveArrival?: Date;
  estimatedArrival: Date;
  minutesAway: number;
  delay?: number; // Minutes late/early (positive = late)
  
  // Status
  isLive: boolean;
  isScheduled: boolean;
  confidence: 'high' | 'medium' | 'low';
  
  // Location
  station: {
    id: string;
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    isFavorite: boolean;
  };
}

// Legacy alias for backward compatibility (will be removed)
export type EnhancedBusInfo = EnhancedVehicleInfo;

// API endpoint types
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