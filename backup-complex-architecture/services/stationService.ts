// StationService - Domain-focused service for stop operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyStopResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy';

export const stationService = {
  /**
   * Get all stops for an agency
   */
  async getStops(agency_id: number): Promise<TranzyStopResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/stops`, {
        params: { agency_id }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stops:', error);
      throw error;
    }
  },

  /**
   * Get stops by location within radius
   */
  async getStopsByLocation(
    lat: number, 
    lon: number, 
    radius: number = 1000
  ): Promise<TranzyStopResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/stops/nearby`, {
        params: { lat, lon, radius }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stops by location:', error);
      throw error;
    }
  }
};