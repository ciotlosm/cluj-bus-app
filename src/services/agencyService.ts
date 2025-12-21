// AgencyService - Domain-focused service for agency operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyAgencyResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy/v1/opendata';

export const agencyService = {
  /**
   * Get all available agencies
   * Note: Agency endpoint doesn't require X-Agency-Id header
   */
  async getAgencies(apiKey: string): Promise<TranzyAgencyResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/agency`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch agencies:', error);
      throw error;
    }
  },

  /**
   * Get agency by city name
   */
  async getAgencyByCity(apiKey: string, city: string): Promise<TranzyAgencyResponse | null> {
    try {
      const agencies = await this.getAgencies(apiKey);
      return agencies.find(agency => 
        agency.agency_name.toLowerCase().includes(city.toLowerCase())
      ) || null;
    } catch (error) {
      console.error('Failed to fetch agency by city:', error);
      throw error;
    }
  }
};