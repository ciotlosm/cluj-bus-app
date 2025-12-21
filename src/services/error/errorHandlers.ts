// Core error processing and handling logic
// Processes different types of errors and converts them to user-friendly messages

import axios from 'axios';
import { LocationErrorTypes, type LocationError, type RetryConfig, DEFAULT_RETRY_CONFIG } from './errorTypes';

/**
 * Maps HTTP status codes to user-friendly error messages
 */
function getErrorMessageForStatus(status: number): string {
  switch (status) {
    case 401: return 'Invalid API key';
    case 403: return 'Access denied - check API key permissions';
    case 404: return 'Agency not found - check agency ID';
    default: return status >= 500 
      ? 'Server error - please try again later'
      : `API error: ${status}`;
  }
}

/**
 * Processes axios-like error objects with consistent logic
 */
function processAxiosError(errorObj: any): string {
  if (errorObj.response?.status) {
    return getErrorMessageForStatus(errorObj.response.status);
  }
  if (errorObj.code === 'NETWORK_ERROR' || !errorObj.response) {
    return 'Network error - check your connection';
  }
  return `API error: ${errorObj.response?.status || 'Unknown'}`;
}

/**
 * Handles API errors with consistent error messages and status tracking
 */
export function handleApiError(error: unknown, operation: string): never {
  console.error(`Failed to ${operation}:`, error);
  
  // Record failure for status tracking (imported dynamically to avoid circular deps)
  import('./errorReporting').then(({ apiStatusTracker }) => {
    apiStatusTracker.recordFailure(operation);
  }).catch(() => {
    // Ignore import errors - status tracker may not be available
  });
  
  // Update status store if available
  if (typeof window !== 'undefined') {
    // Use dynamic import to avoid circular dependencies
    import('../../stores/statusStore').then(({ useStatusStore }) => {
      useStatusStore.getState().updateFromApiCall(false, undefined, operation);
    }).catch(() => {
      // Ignore import errors - status store may not be available
    });
  }
  
  // Handle axios errors (primary method)
  if (axios.isAxiosError(error)) {
    throw new Error(processAxiosError(error));
  }
  
  // Handle non-axios errors with axios-like structure (fallback)
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    throw new Error(processAxiosError(error));
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

/**
 * Handles location service errors with specific error types and messages
 */
export function handleLocationError(error: GeolocationPositionError | Error | unknown, operation: string): LocationError {
  console.error(`Location service failed to ${operation}:`, error);

  // Handle GeolocationPositionError
  if (error && typeof error === 'object' && 'code' in error) {
    const geoError = error as GeolocationPositionError;
    const errorMap = {
      1: { message: 'Location access denied by user. Please enable location permissions in your browser settings.', type: LocationErrorTypes.PERMISSION_DENIED, retryable: false },
      2: { message: 'Location position unavailable. GPS signal may be weak or blocked.', type: LocationErrorTypes.POSITION_UNAVAILABLE, retryable: true },
      3: { message: 'Location request timed out. Please try again.', type: LocationErrorTypes.TIMEOUT, retryable: true }
    };
    
    const errorInfo = errorMap[geoError.code as keyof typeof errorMap] || {
      message: 'Unknown location error occurred.',
      type: LocationErrorTypes.NETWORK_ERROR,
      retryable: true
    };
    
    return { code: geoError.code, ...errorInfo };
  }

  // Handle generic errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not supported') || message.includes('geolocation')) {
      return { code: 0, message: 'Location services not supported by this browser. Please use manual location entry.', type: LocationErrorTypes.NOT_SUPPORTED, retryable: false };
    }
    if (message.includes('network') || message.includes('connection')) {
      return { code: 0, message: 'Network error during location request. Check your internet connection.', type: LocationErrorTypes.NETWORK_ERROR, retryable: true };
    }
    if (message.includes('retry') || message.includes('exhausted')) {
      return { code: 0, message: 'Location request failed after multiple attempts. Please try manual location entry.', type: LocationErrorTypes.RETRY_EXHAUSTED, retryable: false };
    }
  }

  // Fallback for unknown errors
  return { code: 0, message: `Failed to ${operation}. Please try again or use manual location entry.`, type: LocationErrorTypes.NETWORK_ERROR, retryable: true };
}

/**
 * Implements exponential backoff retry logic for location requests
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'location request'
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const locationError = handleLocationError(error, operationName);
      if (!locationError.retryable) {
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.log(`Location ${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All attempts failed, throw the last error with retry exhausted message
  throw new Error(`Location request failed after ${config.maxAttempts} attempts. Please try manual location entry.`);
}