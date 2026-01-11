// ArrivalService - Dedicated service for real-time arrival calculations
// Uses enhanced vehicles (service layer handles predictions automatically)
// Single responsibility: calculate arrival times on-demand

import type { 
  TranzyVehicleResponse, 
  TranzyStopResponse, 
  TranzyStopTimeResponse,
  TranzyTripResponse 
} from '../types/rawTranzyApi.ts';
import type { EnhancedVehicleData } from '../utils/vehicle/vehicleEnhancementUtils.ts';
import type { ArrivalTimeResult } from '../types/arrivalTime.ts';
import { handleApiError } from './error';
import { 
  calculateMultipleArrivals, 
  sortVehiclesByArrival 
} from '../utils/arrival/arrivalUtils.ts';

export const arrivalService = {
  /**
   * Calculate arrival times for vehicles approaching a specific stop
   * Uses enhanced vehicles with position predictions for improved accuracy
   */
  async calculateArrivalsForStop(stopId: string): Promise<ArrivalTimeResult[]> {
    try {
      // Get enhanced vehicles with predictions and other required data in parallel
      const [vehicles, trips, stopTimes, stops] = await Promise.all([
        this.getVehicles(), // Now returns enhanced vehicles by default
        this.getTrips(),
        this.getStopTimes(),
        this.getStops()
      ]);

      // Find target stop
      const targetStop = stops.find(s => s.stop_id === parseInt(stopId));
      if (!targetStop) {
        throw new Error(`Stop ${stopId} not found`);
      }

      // Calculate and sort arrival times using enhanced vehicle data with predictions
      const arrivals = calculateMultipleArrivals(vehicles, targetStop, trips, stopTimes, stops);
      return sortVehiclesByArrival(arrivals);
    } catch (error) {
      handleApiError(error, 'calculate arrivals for stop');
    }
  },

  /**
   * Helper methods to fetch data from other services
   */
  async getVehicles(): Promise<EnhancedVehicleData[]> {
    const { vehicleService } = await import('./vehicleService');
    return vehicleService.getEnhancedVehicles();
  },

  async getTrips() {
    const { tripService } = await import('./tripService');
    return tripService.getTrips();
  },

  async getStopTimes() {
    const { tripService } = await import('./tripService');
    return tripService.getStopTimes();
  },

  async getStops() {
    const { stationService } = await import('./stationService');
    return stationService.getStops();
  }
};