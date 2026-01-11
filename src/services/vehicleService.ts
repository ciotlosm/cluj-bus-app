// VehicleService - Domain-focused service for vehicle tracking
// Applies position predictions at service layer before returning data
// Integrated with status tracking and position prediction

import axios from 'axios';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi.ts';
import type { EnhancedVehicleData } from '../utils/vehicle/vehicleEnhancementUtils.ts';
import { enhanceVehiclesWithPredictions } from '../utils/vehicle/vehicleEnhancementUtils.ts';
import { handleApiError, apiStatusTracker } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const vehicleService = {
  /**
   * Get vehicles with position predictions applied (primary method)
   * Enhancement happens at service layer before returning to consumers
   */
  async getVehicles(): Promise<EnhancedVehicleData[]> {
    try {
      // Get raw vehicle data from API
      const rawVehicles = await this.getRawVehicles();
      
      // Get additional data needed for predictions in parallel
      const [routeShapes, stopTimesByTrip, stops] = await Promise.all([
        this.getRouteShapes(rawVehicles),
        this.getStopTimesByTrip(),
        this.getStops()
      ]);
      
      console.log(`[VehicleService] Enhancement data: routeShapes=${routeShapes?.size || 0}, stopTimesByTrip=${stopTimesByTrip?.size || 0}, stops=${stops?.length || 0}`);
      
      // Apply position predictions at service layer
      return enhanceVehiclesWithPredictions(rawVehicles, routeShapes, stopTimesByTrip, stops);
    } catch (error) {
      // If enhancement fails, fall back to raw vehicles without predictions
      console.warn('Failed to enhance vehicles with predictions, falling back to raw data:', error);
      const rawVehicles = await this.getRawVehicles();
      
      // Convert to enhanced format without predictions for consistency
      return rawVehicles.map(vehicle => ({
        ...vehicle,
        apiLatitude: vehicle.latitude,
        apiLongitude: vehicle.longitude,
        predictionMetadata: {
          predictedDistance: 0,
          stationsEncountered: 0,
          totalDwellTime: 0,
          predictionMethod: 'fallback' as const,
          predictionApplied: false,
          timestampAge: 0
        }
      }));
    }
  },

  /**
   * Get raw vehicles from API (internal method)
   * Use this only for debugging or when you specifically need original API data
   */
  async getRawVehicles(): Promise<TranzyVehicleResponse[]> {
    const startTime = Date.now();
    try {
      // Get API credentials from app context
      const { apiKey, agencyId } = getApiConfig();

      const response = await axios.get(`${API_CONFIG.BASE_URL}/vehicles`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        }
      });
      
      // Validate response is JSON array, not HTML error page
      if (!Array.isArray(response.data)) {
        console.error('API returned non-array response:', typeof response.data, response.data);
        throw new Error('API returned invalid data format (expected array, got ' + typeof response.data + ')');
      }
      
      // Record successful API call
      const responseTime = Date.now() - startTime;
      apiStatusTracker.recordSuccess('fetch vehicles', responseTime);
      
      // Update status store if available
      if (typeof window !== 'undefined') {
        const { useStatusStore } = await import('../stores/statusStore');
        useStatusStore.getState().updateFromApiCall(true, responseTime, 'fetch vehicles');
      }
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetch vehicles');
    }
  },

  /**
   * Get enhanced vehicles with position predictions applied
   * @deprecated Use getVehicles() instead - it now returns enhanced vehicles by default
   */
  async getEnhancedVehicles(): Promise<EnhancedVehicleData[]> {
    return this.getVehicles();
  },

  /**
   * Helper methods to get additional data for predictions
   */
  async getRouteShapes(vehicles: TranzyVehicleResponse[]): Promise<Map<string, any> | undefined> {
    try {
      const { fetchRouteShapesForVehicles } = await import('./routeShapeService');
      const { tripService } = await import('./tripService');
      
      // Get trips needed for route shapes
      const trips = await tripService.getTrips();
      
      // Fetch route shapes for the vehicles (keyed by shape_id)
      const routeShapesByShapeId = await fetchRouteShapesForVehicles(vehicles, trips);
      
      // Create a mapping from trip_id to route shape for easier lookup
      const routeShapesByTripId = new Map<string, any>();
      
      for (const vehicle of vehicles) {
        if (vehicle.trip_id) {
          // Find the trip for this vehicle
          const trip = trips.find(t => t.trip_id === vehicle.trip_id);
          if (trip && trip.shape_id) {
            // Get the route shape for this trip's shape_id
            const routeShape = routeShapesByShapeId.get(trip.shape_id);
            if (routeShape) {
              routeShapesByTripId.set(vehicle.trip_id, routeShape);
            }
          }
        }
      }
      
      return routeShapesByTripId;
    } catch (error) {
      console.warn('Route shapes not available for predictions:', error);
    }
    return undefined;
  },

  async getStopTimesByTrip(): Promise<Map<string, any> | undefined> {
    try {
      const { tripService } = await import('./tripService');
      const stopTimes = await tripService.getStopTimes();
      
      // Group stop times by trip_id for efficient lookup
      const stopTimesByTrip = new Map();
      for (const stopTime of stopTimes) {
        if (!stopTimesByTrip.has(stopTime.trip_id)) {
          stopTimesByTrip.set(stopTime.trip_id, []);
        }
        stopTimesByTrip.get(stopTime.trip_id).push(stopTime);
      }
      
      return stopTimesByTrip;
    } catch (error) {
      console.warn('Stop times not available for predictions:', error);
    }
    return undefined;
  },

  async getStops(): Promise<any[] | undefined> {
    try {
      const { stationService } = await import('./stationService');
      return await stationService.getStops();
    } catch (error) {
      console.warn('Stops not available for predictions:', error);
    }
    return undefined;
  }
};