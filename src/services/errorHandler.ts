// Shared error handling utility for services
// Eliminates duplication and keeps services focused

import axios from 'axios';

/**
 * Handles API errors with consistent error messages
 */
export function handleApiError(error: unknown, operation: string): never {
  console.error(`Failed to ${operation}:`, error);
  
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      throw new Error('Invalid API key');
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied - check API key permissions');
    }
    if (error.response?.status === 404) {
      throw new Error('Agency not found - check agency ID');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error - please try again later');
    }
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      throw new Error('Network error - check your connection');
    }
    throw new Error(`API error: ${error.response?.status || 'Unknown'}`);
  }
  
  // Handle non-axios errors or when axios.isAxiosError doesn't work properly
  if (error && typeof error === 'object') {
    if ('isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as any; // Type assertion for fallback handling
      if (axiosError.response?.status === 401) {
        throw new Error('Invalid API key');
      }
      if (axiosError.response?.status === 403) {
        throw new Error('Access denied - check API key permissions');
      }
      if (axiosError.response?.status === 404) {
        throw new Error('Agency not found - check agency ID');
      }
      if (axiosError.response?.status >= 500) {
        throw new Error('Server error - please try again later');
      }
      if (axiosError.code === 'NETWORK_ERROR' || !axiosError.response) {
        throw new Error('Network error - check your connection');
      }
      throw new Error(`API error: ${axiosError.response?.status || 'Unknown'}`);
    }
  }
  
  throw new Error(`Failed to ${operation}`);
}

/**
 * Validates API key input
 */
export function validateApiKey(apiKey: string): void {
  if (!apiKey?.trim()) {
    throw new Error('API key is required');
  }
}

/**
 * Validates agency ID input
 */
export function validateAgencyId(agency_id: number): void {
  if (!agency_id || agency_id <= 0) {
    throw new Error('Valid agency ID is required');
  }
}