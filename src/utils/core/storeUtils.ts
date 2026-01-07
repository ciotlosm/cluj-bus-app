// Store utilities for manual refresh functionality
// Shared utilities to eliminate code duplication across stores

/**
 * Generic localStorage persistence utilities for stores
 */
export interface StorageData<T> {
  data: T;
  lastUpdated: number | null;
  error: string | null;
}

/**
 * Configuration for retry logic with exponential backoff
 */
export interface RetryConfig {
  maxAttempts: number;
  delays: number[]; // milliseconds for each attempt
}

/**
 * Default retry configuration for network errors
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delays: [100, 200, 400] // 100ms, 200ms, 400ms
};

/**
 * Helper function for exponential backoff retry
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't wait after the last attempt
      if (attempt === config.maxAttempts - 1) {
        break;
      }
      
      const delay = config.delays[attempt];
      console.log(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Helper function to check if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('connection') || 
           message.includes('timeout') ||
           message.includes('fetch');
  }
  return false;
}

/**
 * Creates localStorage persistence methods for a store
 * @param storeName - Name of the store (used for localStorage key)
 * @param dataKey - Key name for the data property in the store state
 * @param options - Optional configuration for Map serialization
 */
export function createStorageMethods<T>(
  storeName: string, 
  dataKey: string,
  options?: {
    isMap?: boolean; // Whether the data is a Map that needs serialization
  }
) {
  const storageKey = `neary_cache_${storeName}`;
  
  return {
    persistToStorage: (getState: () => any) => {
      try {
        const state = getState();
        let dataToStore = state[dataKey];
        
        // Convert Map to Array for JSON serialization
        if (options?.isMap && dataToStore instanceof Map) {
          dataToStore = Array.from(dataToStore);
        }
        
        const storageData = {
          [dataKey]: dataToStore,
          lastUpdated: state.lastUpdated,
          error: state.error
        };
        localStorage.setItem(storageKey, JSON.stringify(storageData));
      } catch (error) {
        console.warn(`Failed to persist ${storeName} to storage:`, error);
      }
    },
    
    loadFromStorage: (setState: (updates: any) => void) => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          let loadedData = data[dataKey] || (options?.isMap ? [] : []);
          
          // Convert Array back to Map
          if (options?.isMap && Array.isArray(loadedData)) {
            loadedData = new Map(loadedData);
          }
          
          setState({
            [dataKey]: loadedData,
            lastUpdated: data.lastUpdated || null,
            error: data.error || null
          });
        }
      } catch (error) {
        console.warn(`Failed to load ${storeName} from storage:`, error);
      }
    }
  };
}

/**
 * Creates a generic refresh method for stores with retry logic and error handling
 * This method does NOT set loading states - it refreshes data in the background
 * Loading states are only used for initial loads when no cached data exists
 * @param storeName - Name of the store (for error messages)
 * @param dataKey - Key name for the data property in the store state
 * @param serviceImport - Dynamic import function for the service
 * @param serviceMethod - Method name to call on the service
 * @param options - Optional configuration (retry enabled by default)
 */
export function createRefreshMethod<T>(
  storeName: string,
  dataKey: string,
  serviceImport: () => Promise<any>,
  serviceMethod: string,
  options?: {
    useRetry?: boolean; // Default: true
    retryConfig?: RetryConfig;
    allowCachedDataOnError?: boolean; // Default: true
    processData?: (data: any) => any;
  }
) {
  return async (getState: () => any, setState: (updates: any) => void, persistToStorage: () => void) => {
    const currentState = getState();
    
    // Set sensible defaults
    const useRetry = options?.useRetry ?? true; // Default: true
    const allowCachedDataOnError = options?.allowCachedDataOnError ?? true; // Default: true
    
    try {
      const refreshOperation = async () => {
        // Import service dynamically to avoid circular dependencies
        const serviceModule = await serviceImport();
        
        // Get the service (pattern: export const tripService = { ... })
        const service = serviceModule[`${storeName}Service`];
        
        if (!service || typeof service[serviceMethod] !== 'function') {
          throw new Error(`Service method ${serviceMethod} not found in ${storeName}Service`);
        }
        
        const rawData = await service[serviceMethod]();
        
        // Process data if processor provided
        return options?.processData ? options.processData(rawData) : rawData;
      };
      
      // Use retry logic by default
      const data = useRetry 
        ? await retryWithBackoff(refreshOperation, `${storeName} refresh`, options?.retryConfig)
        : await refreshOperation();
      
      // Update data without affecting loading state (background refresh)
      setState({ 
        [dataKey]: data,
        error: null, 
        lastUpdated: Date.now() 
      });
      
      // Persist to storage after successful refresh
      persistToStorage();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to refresh ${storeName}`;
      
      // Handle errors gracefully if we have cached data (default behavior)
      if (allowCachedDataOnError && currentState[dataKey] && 
          (Array.isArray(currentState[dataKey]) ? currentState[dataKey].length > 0 : 
           currentState[dataKey] instanceof Map ? currentState[dataKey].size > 0 : true)) {
        
        const isNetworkErr = isNetworkError(error);
        const errorPrefix = isNetworkErr ? 'Network error during refresh' : 'Background refresh failed';
        
        // Don't update error state for background refresh - just log it
        console.warn(`${errorPrefix}: ${errorMessage}. Continuing with cached data.`);
      } else {
        // Only update error state if we have no cached data
        setState({ 
          error: errorMessage
        });
      }
    }
  };
}

/**
 * Creates an initial load method that shows loading states when no cached data exists
 * This is the ONLY method that should set loading: true
 */
export function createInitialLoadMethod<T>(
  storeName: string,
  dataKey: string,
  serviceImport: () => Promise<any>,
  serviceMethod: string,
  options?: {
    useRetry?: boolean;
    retryConfig?: RetryConfig;
    processData?: (data: any) => any;
  }
) {
  return async (getState: () => any, setState: (updates: any) => void, persistToStorage: () => void) => {
    const currentState = getState();
    
    // Only show loading if we have no cached data
    const hasData = currentState[dataKey] && 
      (Array.isArray(currentState[dataKey]) ? currentState[dataKey].length > 0 : 
       currentState[dataKey] instanceof Map ? currentState[dataKey].size > 0 : true);
    
    if (!hasData) {
      setState({ loading: true, error: null });
    }
    
    // Set sensible defaults
    const useRetry = options?.useRetry ?? true;
    
    try {
      const loadOperation = async () => {
        // Import service dynamically to avoid circular dependencies
        const serviceModule = await serviceImport();
        
        // Get the service
        const service = serviceModule[`${storeName}Service`];
        
        if (!service || typeof service[serviceMethod] !== 'function') {
          throw new Error(`Service method ${serviceMethod} not found in ${storeName}Service`);
        }
        
        const rawData = await service[serviceMethod]();
        
        // Process data if processor provided
        return options?.processData ? options.processData(rawData) : rawData;
      };
      
      // Use retry logic by default
      const data = useRetry 
        ? await retryWithBackoff(loadOperation, `${storeName} initial load`, options?.retryConfig)
        : await loadOperation();
      
      setState({ 
        [dataKey]: data,
        loading: false, 
        error: null, 
        lastUpdated: Date.now() 
      });
      
      // Persist to storage after successful load
      persistToStorage();
    } catch (error) {
      setState({ 
        loading: false, 
        error: error instanceof Error ? error.message : `Failed to load ${storeName}`
      });
    }
  };
}

/**
 * Creates a data freshness checker
 * @param defaultMaxAge - Default maximum age in milliseconds
 */
export function createFreshnessChecker(defaultMaxAge: number) {
  return (getState: () => any, maxAgeMs: number = defaultMaxAge): boolean => {
    const { lastUpdated } = getState();
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < maxAgeMs;
  };
}