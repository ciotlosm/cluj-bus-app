// AgencyService - Domain-focused service for agency operations
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyAgencyResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, apiStatusTracker } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const agencyService = {
  /**
   * Get all available agencies
   * Note: Agency endpoint doesn't require X-Agency-Id header
   */
  async getAgencies(): Promise<TranzyAgencyResponse[]> {
    const startTime = Date.now();
    try {
      // Get API credentials from app context
      const { apiKey } = getApiConfig();

      const response = await axios.get(`${API_CONFIG.BASE_URL}/agency`, {
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