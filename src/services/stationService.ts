// StationService - Domain-focused service for stop operations
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyStopResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey, validateAgencyId, apiStatusTracker } from './errorHandler';

const API_BASE = '/api/tranzy/v1/opendata';

export const stationService = {
  /**
   * Get all stops for an agency
   */
  async getStops(apiKey: string, agency_id: number): Promise<TranzyStopResponse[]> {
    validateApiKey(apiKey);
    validateAgencyId(agency_id);

    const startTime = Date.now();
    try {
      const response = await axios.get(`${API_BASE}/stops`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
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
  }
};