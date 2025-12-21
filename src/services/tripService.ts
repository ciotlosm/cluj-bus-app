// TripService - Domain-focused service for trip operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyStopTimeResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy/v1/opendata';

export const tripService = {
  /**
   * Get stop times for an agency
   * Note: API only returns trip_id, stop_id, and stop_sequence
   * No arrival_time or departure_time fields are included
   */
  async getStopTimes(apiKey: string, agency_id: number): Promise<TranzyStopTimeResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/stop_times`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stop times:', error);
      throw error;
    }
  }
};