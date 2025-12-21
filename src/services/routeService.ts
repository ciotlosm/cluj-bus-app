// RouteService - Domain-focused service for route operations
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyRouteResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey, validateAgencyId, apiStatusTracker } from './errorHandler';

const API_BASE = '/api/tranzy/v1/opendata';

export const routeService = {
  /**
   * Get all routes for an agency
   */
  async getRoutes(apiKey: string, agency_id: number): Promise<TranzyRouteResponse[]> {
    validateApiKey(apiKey);
    validateAgencyId(agency_id);
    
    const startTime = Date.now();
    try {
      const response = await axios.get<TranzyRouteResponse[]>(`${API_BASE}/routes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
      });
      
      // Record successful API call
      const responseTime = Date.now() - startTime;
      apiStatusTracker.recordSuccess('fetch routes', responseTime);
      
      // Update status store if available
      if (typeof window !== 'undefined') {
        const { useStatusStore } = await import('../stores/statusStore');
        useStatusStore.getState().updateFromApiCall(true, responseTime, 'fetch routes');
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch routes');
    }
  }
};