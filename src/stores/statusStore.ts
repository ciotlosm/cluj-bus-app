// StatusStore - Clean state management for API connectivity and network status
// No cross-store dependencies, simple loading and error states

import { create } from 'zustand';

type ApiStatus = 'online' | 'offline' | 'error';

interface StatusStore {
  // API Status
  apiStatus: ApiStatus;
  networkOnline: boolean;
  lastApiCheck: number | null;
  responseTime: number | null;
  consecutiveFailures: number;
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Internal monitoring state
  healthCheckInterval: NodeJS.Timeout | null;
  isMonitoring: boolean;
  
  // Actions
  checkApiHealth: () => Promise<void>;
  setNetworkStatus: (online: boolean) => void;
  startHealthMonitoring: () => void;
  stopHealthMonitoring: () => void;
  clearError: () => void;
  
  // Internal actions
  handleApiSuccess: (responseTime: number) => void;
  handleApiFailure: (error: unknown) => void;
  setupNetworkListeners: () => void;
  cleanupNetworkListeners: () => void;
}

export const useStatusStore = create<StatusStore>()((set, get) => ({
  // API Status
  apiStatus: 'offline',
  networkOnline: navigator.onLine,
  lastApiCheck: null,
  responseTime: null,
  consecutiveFailures: 0,
  
  // Simple states
  loading: false,
  error: null,
  
  // Internal monitoring state
  healthCheckInterval: null,
  isMonitoring: false,
  
  // Actions
  checkApiHealth: async () => {
    const state = get();
    
    // Don't check if network is offline
    if (!state.networkOnline) {
      set({ 
        apiStatus: 'offline',
        lastApiCheck: Date.now(),
        responseTime: null 
      });
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const startTime = Date.now();
      
      // Simple health check - try to fetch a lightweight endpoint
      const response = await fetch('/api/tranzy/v1/opendata/health', {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        get().handleApiSuccess(responseTime);
      } else {
        get().handleApiFailure(new Error(`API returned ${response.status}`));
      }
    } catch (error) {
      get().handleApiFailure(error);
    } finally {
      set({ loading: false });
    }
  },
  
  setNetworkStatus: (online: boolean) => {
    const state = get();
    set({ networkOnline: online });
    
    // If network comes back online, check API immediately
    if (online && !state.networkOnline) {
      get().checkApiHealth();
    }
    
    // If network goes offline, update API status
    if (!online) {
      set({ apiStatus: 'offline' });
    }
  },
  
  startHealthMonitoring: () => {
    const state = get();
    
    if (state.isMonitoring) {
      return; // Already monitoring
    }
    
    // Setup network listeners
    get().setupNetworkListeners();
    
    // Start periodic health checks (every 30 seconds)
    const interval = setInterval(() => {
      get().checkApiHealth();
    }, 30000);
    
    set({ 
      healthCheckInterval: interval,
      isMonitoring: true 
    });
    
    // Do initial health check
    get().checkApiHealth();
  },
  
  stopHealthMonitoring: () => {
    const state = get();
    
    if (state.healthCheckInterval) {
      clearInterval(state.healthCheckInterval);
    }
    
    get().cleanupNetworkListeners();
    
    set({ 
      healthCheckInterval: null,
      isMonitoring: false 
    });
  },
  
  clearError: () => set({ error: null }),
  
  // Internal actions
  handleApiSuccess: (responseTime: number) => {
    set({ 
      apiStatus: 'online',
      lastApiCheck: Date.now(),
      responseTime,
      consecutiveFailures: 0,
      error: null 
    });
  },
  
  handleApiFailure: (error: unknown) => {
    const state = get();
    const errorMessage = error instanceof Error ? error.message : 'API health check failed';
    
    set({ 
      apiStatus: 'error',
      lastApiCheck: Date.now(),
      responseTime: null,
      consecutiveFailures: state.consecutiveFailures + 1,
      error: errorMessage 
    });
  },
  
  setupNetworkListeners: () => {
    const handleOnline = () => get().setNetworkStatus(true);
    const handleOffline = () => get().setNetworkStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Store cleanup functions for later removal
    (window as any).__statusStoreCleanup = {
      handleOnline,
      handleOffline
    };
  },
  
  cleanupNetworkListeners: () => {
    const cleanup = (window as any).__statusStoreCleanup;
    if (cleanup) {
      window.removeEventListener('online', cleanup.handleOnline);
      window.removeEventListener('offline', cleanup.handleOffline);
      delete (window as any).__statusStoreCleanup;
    }
  }
}));

// Auto-start monitoring when store is created
if (typeof window !== 'undefined') {
  // Start monitoring after a short delay to allow store initialization
  setTimeout(() => {
    useStatusStore.getState().startHealthMonitoring();
  }, 1000);
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useStatusStore.getState().stopHealthMonitoring();
  });
}