// VehicleService - Domain-focused service for vehicle tracking
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy/v1/opendata';

export const vehicleService = {
  /**
   * Get all vehicles for an agency
   */
  async getVehicles(apiKey: string, agency_id: number): Promise<TranzyVehicleResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/vehicles`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      throw error;
    }
  }
};