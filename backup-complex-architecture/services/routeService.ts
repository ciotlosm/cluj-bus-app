// RouteService - Domain-focused service for route operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyRouteResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy';

export const routeService = {
  /**
   * Get all routes for an agency
   */
  async getRoutes(agency_id: number): Promise<TranzyRouteResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/routes`, {
        params: { agency_id }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      throw error;
    }
  },

  /**
   * Get specific route by ID
   */
  async getRouteById(route_id: number): Promise<TranzyRouteResponse | null> {
    try {
      const response = await axios.get(`${API_BASE}/routes/${route_id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch route by ID:', error);
      return null;
    }
  }
};