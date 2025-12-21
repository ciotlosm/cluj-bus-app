// StationService - Domain-focused service for stop operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyStopResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey, validateAgencyId } from './errorHandler';

const API_BASE = '/api/tranzy/v1/opendata';

export const stationService = {
  /**
   * Get all stops for an agency
   */
  async getStops(apiKey: string, agency_id: number): Promise<TranzyStopResponse[]> {
    validateApiKey(apiKey);
    validateAgencyId(agency_id);

    try {
      const response = await axios.get(`${API_BASE}/stops`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetch stops');
    }
  }
};