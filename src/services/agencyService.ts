// AgencyService - Domain-focused service for agency operations
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyAgencyResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey, apiStatusTracker } from './errorHandler';

const API_BASE = '/api/tranzy/v1/opendata';

export const agencyService = {
  /**
   * Get all available agencies
   * Note: Agency endpoint doesn't require X-Agency-Id header
   */
  async getAgencies(apiKey: string): Promise<TranzyAgencyResponse[]> {
    validateApiKey(apiKey);

    const startTime = Date.now();
    try {
      const response = await axios.get(`${API_BASE}/agency`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      // Record successful API call
      const responseTime = Date.now() - startTime;
      apiStatusTracker.recordSuccess('fetch agencies', responseTime);
      
      // Update status store if available
      if (typeof window !== 'undefined') {
        const { useStatusStore } = await import('../stores/statusStore');
        useStatusStore.getState().updateFromApiCall(true, responseTime, 'fetch agencies');
      }
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetch agencies');
    }
  }
};