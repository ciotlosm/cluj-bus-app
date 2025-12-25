// ShapesService - Domain-focused service for route shape operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyShapeResponse } from '../types/rawTranzyApi.ts';
import { handleApiError } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const shapesService = {
  /**
   * Get all shapes in bulk (no shape_id parameter)
   * Used for bulk caching strategy with enhanced error handling
   */
  async getAllShapes(): Promise<TranzyShapeResponse[]> {
    try {
      // Get API credentials from app context
      const { apiKey, agencyId } = getApiConfig();

      const response = await axios.get<TranzyShapeResponse[]>(`${API_CONFIG.BASE_URL}/shapes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        },
        // Add timeout for better error handling
        timeout: 30000, // 30 seconds
        // No shape_id parameter - fetches all shapes
      });
      
      // Validate response is an array
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array of shapes');
      }
      
      return response.data;
    } catch (error) {
      // Enhanced error handling with network error detection
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') {
          throw new Error('Network timeout - check your connection and try again');
        }
        if (!error.response) {
          throw new Error('Network error - unable to reach server');
        }
      }
      
      throw handleApiError(error, 'Failed to fetch all shapes');
    }
  }
};