// RouteService - Domain-focused service for route operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyRouteResponse } from '../types/rawTranzyApi';

const API_BASE = '/api/tranzy/v1/opendata';

export const routeService = {
  /**
   * Get all routes for an agency
   */
  async getRoutes(apiKey: string, agency_id: number): Promise<TranzyRouteResponse[]> {
    try {
      const response = await axios.get(`${API_BASE}/routes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agency_id.toString()
        }
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
  async getRouteById(apiKey: string, agency_id: number, route_id: number): Promise<TranzyRouteResponse | null> {
    try {
      const routes = await this.getRoutes(apiKey, agency_id);
      return routes.find(route => route.route_id === route_id) || null;
    } catch (error) {
      console.error('Failed to fetch route by ID:', error);
      return null;
    }
  }
};