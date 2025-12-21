// ScheduleService - Domain-focused service for schedule operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyStopTimeResponse, TranzyTripResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy';

export const scheduleService = {
  /**
   * Get stop times for an agency, optionally filtered by stop
   */
  async getStopTimes(agency_id: number, stop_id?: number): Promise<TranzyStopTimeResponse[]> {
    try {
      const params: any = { agency_id };
      if (stop_id) {
        params.stop_id = stop_id;
      }
      
      const response = await axios.get(`${API_BASE}/stop_times`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stop times:', error);
      throw error;
    }
  },

  /**
   * Get trips for an agency, optionally filtered by route
   */
  async getTrips(agency_id: number, route_id?: number): Promise<TranzyTripResponse[]> {
    try {
      const params: any = { agency_id };
      if (route_id) {
        params.route_id = route_id;
      }
      
      const response = await axios.get(`${API_BASE}/trips`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      throw error;
    }
  }
};