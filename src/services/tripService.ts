// TripService - Domain-focused service for trip operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyStopTimeResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey, validateAgencyId } from './error';

const API_BASE = '/api/tranzy/v1/opendata';

export const tripService = {
  /**
   * Get stop times for an agency
   */
  async getStopTimes(apiKey: string, agency_id: number): Promise<TranzyStopTimeResponse[]> {
    validateApiKey(apiKey);
    validateAgencyId(agency_id);
    
    try {
      const response = await axios.get<TranzyStopTimeResponse[]>(`${API_BASE}/stop_times`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch stop times');
    }
  }
};