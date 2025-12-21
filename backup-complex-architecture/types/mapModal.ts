/**
 * Types for map modal components
 * 
 * These types are specifically for map visualization and should not be confused
 * with core vehicle types. They represent a simplified view of vehicle data
 * optimized for map display purposes.
 */

import { RouteType } from './coreVehicle';

/**
 * Bus stop information for map display
 */
export interface BusStopInfo {
  id: string;
  name: string;
  sequence: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  arrivalTime?: string;
  isCurrent?: boolean;
  isClosestToUser?: boolean;
  distanceToUser?: number;
  distanceFromBus?: number;
}

/**
 * Simplified bus information for map modal display
 * 
 * This interface contains only the properties actually used by the map modal
 * and utility functions. It's a presentation layer type, not a core data type.
 */
export interface MapModalBusInfo {
  routeName: string;
  routeDesc?: string;
  routeType: RouteType;
  vehicleId: string;
  tripId: string;
  label?: string;
  destination?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  bearing?: number;
  lastUpdate: Date;
  stopSequence?: BusStopInfo[];
  currentStation?: {
    id: string;
    name: string;
    distance: number;
    isAtStation: boolean;
  } | null;
  direction?: 'inbound' | 'outbound';
  distanceFromUser?: number;
}