// TripService - Domain-focused service for trip operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyStopTimeResponse, TranzyTripResponse } from '../types/rawTranzyApi.ts';
import { handleApiError } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const tripService = {
  /**
   * Get stop times for an agency
   */
  async getStopTimes(): Promise<TranzyStopTimeResponse[]> {
    try {
      // Get API credentials from app context
      const { apiKey, agencyId } = getApiConfig();

      const response = await axios.get<TranzyStopTimeResponse[]>(`${API_CONFIG.BASE_URL}/stop_times`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        }
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch stop times');
    }
  },

  /**
   * Get trips for an agency
   */
  async getTrips(): Promise<TranzyTripResponse[]> {
    try {
      // Get API credentials from app context
      const { apiKey, agencyId } = getApiConfig();

      const response = await axios.get<TranzyTripResponse[]>(`${API_CONFIG.BASE_URL}/trips`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        }
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch trips');
    }
  }
};