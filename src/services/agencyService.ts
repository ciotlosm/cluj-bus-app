// AgencyService - Domain-focused service for agency operations
// Uses raw API field names, no transformations

import axios from 'axios';
import type { TranzyAgencyResponse } from '../types/rawTranzyApi.ts';
import { handleApiError, validateApiKey } from './errorHandler';

const API_BASE = '/api/tranzy/v1/opendata';

export const agencyService = {
  /**
   * Get all available agencies
   * Note: Agency endpoint doesn't require X-Agency-Id header
   */
  async getAgencies(apiKey: string): Promise<TranzyAgencyResponse[]> {
    validateApiKey(apiKey);

    try {
      const response = await axios.get(`${API_BASE}/agency`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetch agencies');
    }
  }
};