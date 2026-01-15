// RouteService - Domain-focused service for route operations
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyRouteResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, apiStatusTracker } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const routeService = {
  /**
   * Get all routes for an agency
   */
  async getRoutes(): Promise<TranzyRouteResponse[]> {
    const startTime = Date.now();
    try {
      // Get API credentials from app context
      const { apiKey, agencyId } = getApiConfig();

      const response = await axios.get<TranzyRouteResponse[]>(`${API_CONFIG.BASE_URL}/routes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
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
  },

  /**
   * Validate API key and agency combination by calling the routes endpoint
   * Standalone function that doesn't require app context
   * @param apiKey - API key to validate
   * @param agencyId - Agency ID to validate
   * @returns true on success, false on error
   */
  async validateAgency(apiKey: string, agencyId: number): Promise<boolean> {
    const startTime = Date.now();
    try {
      await axios.get(`${API_CONFIG.BASE_URL}/routes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        }
      });
      
      // Record successful validation - updates connection status to green
      const responseTime = Date.now() - startTime;
      apiStatusTracker.recordSuccess('validate agency', responseTime);
      
      // Update status store if available
      if (typeof window !== 'undefined') {
        const { useStatusStore } = await import('../stores/statusStore');
        useStatusStore.getState().updateFromApiCall(true, responseTime, 'validate agency');
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
};