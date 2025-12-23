// StationService - Domain-focused service for stop operations
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyStopResponse } from '../types/rawTranzyApi.ts';
import type { ArrivalTimeResult } from '../types/arrivalTime.ts';
import { handleApiError, apiStatusTracker } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const stationService = {
  /**
   * Get all stops for an agency
   */
  async getStops(): Promise<TranzyStopResponse[]> {
    const { apiKey, agencyId } = getApiConfig();

    const startTime = Date.now();
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/stops`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        }
      });
      
      // Record successful API call
      const responseTime = Date.now() - startTime;
      apiStatusTracker.recordSuccess('fetch stops', responseTime);
      
      // Update status store if available
      if (typeof window !== 'undefined') {
        const { useStatusStore } = await import('../stores/statusStore');
        useStatusStore.getState().updateFromApiCall(true, responseTime, 'fetch stops');
      }
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetch stops');
    }
  },

  /**
   * Get arrival times for vehicles approaching a specific stop
   * Delegates to dedicated arrival service for real-time calculations
   */
  async getStopArrivals(stopId: string): Promise<ArrivalTimeResult[]> {
    try {
      const { arrivalService } = await import('./arrivalService');
      return arrivalService.calculateArrivalsForStop(stopId);
    } catch (error) {
      handleApiError(error, 'fetch stop arrivals');
    }
  }
};