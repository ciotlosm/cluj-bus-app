// VehicleService - Domain-focused service for vehicle tracking
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy';

export const vehicleService = {
  /**
   * Get all vehicles for an agency, optionally filtered by route
   */
  async getVehicles(agency_id: number, route_id?: number): Promise<TranzyVehicleResponse[]> {
    try {
      const params: any = { agency_id };
      if (route_id) {
        params.route_id = route_id;
      }
      
      const response = await axios.get(`${API_BASE}/vehicles`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      throw error;
    }
  },

  /**
   * Get vehicles serving a specific stop
   */
  async getVehiclesByStop(stop_id: number): Promise<TranzyVehicleResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/vehicles/by-stop`, {
        params: { stop_id }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vehicles by stop:', error);
      throw error;
    }
  }
};