import * as fc from 'fast-check';
import { 
  Coordinates, 
  Station, 
  Route, 
  StopTime,
  TranzyVehicleResponse,
  TranzyStopResponse,
  TranzyRouteResponse,
  TranzyStopTimeResponse
} from '@/types';
import type { CoreVehicle } from '../../types/coreVehicle';

/**
 * Generator for valid coordinates
 */
export const coordinatesArb = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
  accuracy: fc.option(fc.double({ min: 0, max: 1000 }))
});

/**
 * Generator for Cluj-Napoca area coordinates (more realistic for testing)
 */
export const clujCoordinatesArb = fc.record({
  latitude: fc.double({ min: 46.7, max: 46.8 }), // Cluj-Napoca latitude range
  longitude: fc.double({ min: 23.5, max: 23.7 }), // Cluj-Napoca longitude range
  accuracy: fc.option(fc.double({ min: 0, max: 100 }))
});

/**
 * Generator for station data
 */
export const stationArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  coordinates: clujCoordinatesArb,
  isFavorite: fc.boolean()
});

/**
 * Generator for route data
 */
export const routeArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  agencyId: fc.string({ minLength: 1, maxLength: 10 }),
  routeName: fc.oneof(
    fc.integer({ min: 1, max: 999 }).map(n => n.toString()), // Numeric routes like "42"
    fc.string({ minLength: 1, maxLength: 5 }) // Alphanumeric routes like "43B"
  ),
  routeDesc: fc.string({ minLength: 10, maxLength: 100 }),
  type: fc.constantFrom('bus', 'trolleybus', 'tram', 'metro', 'rail', 'ferry', 'other'),
  color: fc.option(fc.constantFrom('FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF')),
  textColor: fc.option(fc.constantFrom('FFFFFF', '000000', 'CCCCCC', '333333')),
  url: fc.option(fc.webUrl())
});

/**
 * Generator for core vehicle data (updated to use CoreVehicle interface)
 */
export const coreVehicleArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  routeId: fc.string({ minLength: 1, maxLength: 20 }),
  tripId: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
  label: fc.string({ minLength: 1, maxLength: 10 }),
  position: fc.record({
    latitude: fc.double({ min: 46.7, max: 46.8 }),
    longitude: fc.double({ min: 23.5, max: 23.7 }),
    accuracy: fc.option(fc.double({ min: 0, max: 100 }))
  }),
  timestamp: fc.date({ min: new Date(Date.now() - 3600000), max: new Date() }),
  speed: fc.option(fc.double({ min: 0, max: 80 })),
  bearing: fc.option(fc.double({ min: 0, max: 360 })),
  isWheelchairAccessible: fc.boolean(),
  isBikeAccessible: fc.boolean()
});

// Legacy alias removed - use coreVehicleArb directly

/**
 * Generator for stop time data
 */
export const stopTimeArb = fc.record({
  tripId: fc.string({ minLength: 1, maxLength: 30 }),
  stopId: fc.string({ minLength: 1, maxLength: 20 }),
  arrivalTime: fc.integer({ min: 0, max: 86399 }).map(seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }),
  departureTime: fc.integer({ min: 0, max: 86399 }).map(seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }),
  sequence: fc.integer({ min: 1, max: 100 }),
  headsign: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
  isPickupAvailable: fc.boolean(),
  isDropOffAvailable: fc.boolean()
});

/**
 * Generator for Tranzy API vehicle response
 */
export const tranzyVehicleResponseArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  label: fc.string({ minLength: 1, maxLength: 10 }),
  latitude: fc.double({ min: 46.7, max: 46.8 }),
  longitude: fc.double({ min: 23.5, max: 23.7 }),
  timestamp: fc.date().map(d => d.toISOString()),
  vehicle_type: fc.integer({ min: 0, max: 11 }),
  bike_accessible: fc.constantFrom('BIKE_INACCESSIBLE', 'BIKE_ACCESSIBLE', 'UNKNOWN'),
  wheelchair_accessible: fc.constantFrom(
    'NO_VALUE', 'UNKNOWN', 'WHEELCHAIR_ACCESSIBLE', 'WHEELCHAIR_INACCESSIBLE'
  ),
  speed: fc.double({ min: 0, max: 80 }),
  route_id: fc.integer({ min: 1, max: 9999 }),
  trip_id: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
  bearing: fc.option(fc.double({ min: 0, max: 360 })),
  occupancy_status: fc.option(fc.constantFrom(
    'EMPTY', 'MANY_SEATS_AVAILABLE', 'FEW_SEATS_AVAILABLE',
    'STANDING_ROOM_ONLY', 'CRUSHED_STANDING_ROOM_ONLY', 'FULL', 'NOT_ACCEPTING_PASSENGERS'
  ))
});

/**
 * Generator for Tranzy API stop response
 */
export const tranzyStopResponseArb = fc.record({
  stop_id: fc.integer({ min: 1, max: 99999 }),
  stop_code: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
  stop_name: fc.string({ minLength: 5, maxLength: 50 }),
  stop_desc: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  stop_lat: fc.double({ min: 46.7, max: 46.8 }),
  stop_lon: fc.double({ min: 23.5, max: 23.7 }),
  zone_id: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
  stop_url: fc.option(fc.webUrl()),
  location_type: fc.option(fc.integer({ min: 0, max: 4 })),
  parent_station: fc.option(fc.integer({ min: 1, max: 99999 })),
  stop_timezone: fc.option(fc.string()),
  wheelchair_boarding: fc.option(fc.integer({ min: 0, max: 2 }))
});

/**
 * Generator for Tranzy API route response
 */
export const tranzyRouteResponseArb = fc.record({
  route_id: fc.integer({ min: 1, max: 9999 }),
  agency_id: fc.integer({ min: 1, max: 99 }),
  route_short_name: fc.oneof(
    fc.integer({ min: 1, max: 999 }).map(n => n.toString()),
    fc.string({ minLength: 1, maxLength: 5 })
  ),
  route_long_name: fc.string({ minLength: 10, maxLength: 100 }),
  route_desc: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
  route_type: fc.constantFrom(0, 1, 2, 3, 4, 11), // GTFS route types
  route_url: fc.option(fc.webUrl()),
  route_color: fc.option(fc.constantFrom('FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF')),
  route_text_color: fc.option(fc.constantFrom('FFFFFF', '000000', 'CCCCCC', '333333'))
});

/**
 * Generator for Tranzy API stop time response
 */
export const tranzyStopTimeResponseArb = fc.record({
  trip_id: fc.string({ minLength: 1, maxLength: 30 }),
  arrival_time: fc.integer({ min: 0, max: 86399 }).map(seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }),
  departure_time: fc.integer({ min: 0, max: 86399 }).map(seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }),
  stop_id: fc.integer({ min: 1, max: 99999 }),
  stop_sequence: fc.integer({ min: 1, max: 100 }),
  stop_headsign: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
  pickup_type: fc.option(fc.integer({ min: 0, max: 3 })),
  drop_off_type: fc.option(fc.integer({ min: 0, max: 3 })),
  shape_dist_traveled: fc.option(fc.double({ min: 0, max: 100000 })),
  timepoint: fc.option(fc.integer({ min: 0, max: 1 }))
});

/**
 * Generator for arrays of data with realistic sizes
 */
export const stationArrayArb = fc.array(stationArb, { minLength: 1, maxLength: 50 });
export const vehicleArrayArb = fc.array(coreVehicleArb, { minLength: 0, maxLength: 20 });
export const routeArrayArb = fc.array(routeArb, { minLength: 1, maxLength: 30 });
export const stopTimeArrayArb = fc.array(stopTimeArb, { minLength: 0, maxLength: 100 });

/**
 * Helper function to create mock data for testing
 */
export const createMockData = {
  coordinates: (overrides?: Partial<Coordinates>): Coordinates => ({
    latitude: 46.75,
    longitude: 23.6,
    accuracy: 10,
    ...overrides
  }),

  station: (overrides?: Partial<Station>): Station => ({
    id: 'station-1',
    name: 'Test Station',
    coordinates: createMockData.coordinates(),
    isFavorite: false,
    ...overrides
  }),

  coreVehicle: (overrides?: Partial<CoreVehicle>): CoreVehicle => ({
    id: 'vehicle-1',
    routeId: 'route-42',
    tripId: 'trip-123',
    label: '42',
    position: {
      latitude: 46.75,
      longitude: 23.6,
      accuracy: 10
    },
    timestamp: new Date(),
    speed: 25,
    bearing: 90,
    isWheelchairAccessible: true,
    isBikeAccessible: false,
    ...overrides
  }),

  route: (overrides?: Partial<Route>): Route => ({
    id: 'route-42',
    agencyId: 'agency-1',
    routeName: '42',
    routeDesc: 'Piața Unirii - Mănăștur',
    type: 'bus',
    color: 'FF0000',
    textColor: 'FFFFFF',
    ...overrides
  }),

  stopTime: (overrides?: Partial<StopTime>): StopTime => ({
    tripId: 'trip-123',
    stopId: 'stop-456',
    arrivalTime: '08:30:00',
    departureTime: '08:30:30',
    sequence: 1,
    headsign: 'Mănăștur',
    isPickupAvailable: true,
    isDropOffAvailable: true,
    ...overrides
  })
};