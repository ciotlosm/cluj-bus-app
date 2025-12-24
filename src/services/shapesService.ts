// ShapesService - Domain-focused service for route shape operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyShapeResponse } from '../types/rawTranzyApi.ts';
import { handleApiError } from './error';
import { getApiConfig } from '../context/appContext';
import { API_CONFIG } from '../utils/core/constants';

export const shapesService = {
  /**
   * Get shape points for a specific shape_id
   */
  async getShapePoints(shapeId: string): Promise<TranzyShapeResponse[]> {
    try {
      // Get API credentials from app context
      const { apiKey, agencyId } = getApiConfig();

      const response = await axios.get<TranzyShapeResponse[]>(`${API_CONFIG.BASE_URL}/shapes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        },
        params: {
          shape_id: shapeId
        }
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, `Failed to fetch shape points for shape_id: ${shapeId}`);
    }
  }
};