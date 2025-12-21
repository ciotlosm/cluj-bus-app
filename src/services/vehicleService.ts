// VehicleService - Domain-focused service for vehicle tracking
// Uses raw API field names, no transformations
// Integrated with status tracking

import axios from 'axios';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey, validateAgencyId, apiStatusTracker } from './errorHandler';

const API_BASE = '/api/tranzy/v1/opendata';

export const vehicleService = {
  /**
   * Get all vehicles for an agency
   */
  async getVehicles(apiKey: string, agency_id: number): Promise<TranzyVehicleResponse[]> {
    validateApiKey(apiKey);
    validateAgencyId(agency_id);

    const startTime = Date.now();
    try {
      const response = await axios.get(`${API_BASE}/vehicles`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
      });
      
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
  }
};