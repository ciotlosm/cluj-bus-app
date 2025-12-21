// StatusStore - Lightweight aggregated API status from actual service calls
// Enhanced with network event handling for real-time updates

import { create } from 'zustand';
import { apiStatusTracker } from '../services/errorHandler';

type ApiStatus = 'online' | 'offline' | 'error';

interface StatusStore {
  // Minimal state
  apiStatus: ApiStatus;
  networkOnline: boolean;
  lastApiCheck: number | null;
  responseTime: number | null;
  consecutiveFailures: number;
  
  // Actions
  updateFromApiCall: (success: boolean, responseTime?: number, operation?: string) => void;
  refreshStatus: () => void;
  setNetworkStatus: (online: boolean) => void;
}

export const useStatusStore = create<StatusStore>()((set, get) => ({
  // Initial state
  apiStatus: 'offline',
  networkOnline: navigator.onLine,
  lastApiCheck: null,
  responseTime: null,
  consecutiveFailures: 0,
  
  // Update status from actual API calls
  updateFromApiCall: (success: boolean, responseTime?: number, operation?: string) => {
    const timestamp = Date.now();
    const currentNetworkStatus = navigator.onLine;
    
    if (success && responseTime) {
      set({ 
        apiStatus: 'online',
        networkOnline: currentNetworkStatus,
        lastApiCheck: timestamp,
        responseTime,
        consecutiveFailures: 0
      });
    } else {
      const state = get();
      const newFailures = state.consecutiveFailures + 1;
      
      // Determine status based on network and failure count
      let newStatus: ApiStatus = 'error';
      if (!currentNetworkStatus) {
        newStatus = 'offline';
      } else if (newFailures < 3) {
        newStatus = 'offline';
      }
      
      set({ 
        apiStatus: newStatus,
        networkOnline: currentNetworkStatus,
        lastApiCheck: timestamp,
        responseTime: null,
        consecutiveFailures: newFailures
      });
    }
  },
  
  // Refresh status from tracker
  refreshStatus: () => {
    const status = apiStatusTracker.getStatus();
    const responseTime = apiStatusTracker.getLastResponseTime();
    const lastCheck = apiStatusTracker.getLastCheckTime();
    const currentNetworkStatus = navigator.onLine;
    
    set({ 
      apiStatus: status,
      networkOnline: currentNetworkStatus,
      responseTime,
      lastApiCheck: lastCheck,
      consecutiveFailures: apiStatusTracker.consecutiveFailures
    });
  },

  // Set network status (for immediate network event updates)
  setNetworkStatus: (online: boolean) => {
    const state = get();
    
    // Update network status and adjust API status if needed
    let newApiStatus = state.apiStatus;
    if (!online && state.apiStatus === 'online') {
      newApiStatus = 'offline';
    }
    
    set({ 
      networkOnline: online,
      apiStatus: newApiStatus,
      lastApiCheck: Date.now()
    });
  }
}));