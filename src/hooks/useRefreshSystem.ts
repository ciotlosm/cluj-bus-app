import { useEffect, useCallback } from 'react';
import { useEnhancedBusStore } from '../stores/enhancedBusStore';
import { useConfigStore } from '../stores/configStore';
import { useDebounceCallback } from '../utils/debounce';

/**
 * Custom hook to manage the real-time refresh system
 * Handles automatic refresh lifecycle and configuration changes
 */
export const useRefreshSystem = () => {
  const { isAutoRefreshEnabled } = useEnhancedBusStore();
  const { config, isConfigured } = useConfigStore();

  // Start auto refresh when configuration is available and valid
  useEffect(() => {
    const busStore = useEnhancedBusStore.getState();
    const currentAutoRefreshState = busStore.isAutoRefreshEnabled;
    
    // Only manage auto refresh if we have a fully configured system
    console.log('useRefreshSystem check:', { 
      isConfigured, 
      hasConfig: !!config, 
      hasRefreshRate: (config?.refreshRate || 0) > 0, 
      hasCity: !!config?.city, 
      hasHome: !!config?.homeLocation, 
      hasWork: !!config?.workLocation,
      currentAutoRefreshState 
    });
    
    if (isConfigured && config && config.refreshRate > 0 && config.city && config.homeLocation && config.workLocation) {
      console.log('Starting auto refresh...');
      // Start auto refresh if not already enabled
      if (!currentAutoRefreshState) {
        busStore.startAutoRefresh();
      }
    } else {
      console.log('Stopping auto refresh...');
      // Stop auto refresh if configuration is invalid or incomplete
      if (currentAutoRefreshState) {
        busStore.stopAutoRefresh();
      }
    }

    // Cleanup on unmount
    return () => {
      const currentBusStore = useEnhancedBusStore.getState();
      currentBusStore.stopAutoRefresh();
    };
  }, [isConfigured, config?.refreshRate, config?.city, config?.homeLocation, config?.workLocation]); // Removed isAutoRefreshEnabled from deps

  // Handle configuration changes that affect refresh rate (only for fully configured systems)
  useEffect(() => {
    const busStore = useEnhancedBusStore.getState();
    const currentAutoRefreshState = busStore.isAutoRefreshEnabled;
    
    if (currentAutoRefreshState && config?.refreshRate && config?.city && config?.homeLocation && config?.workLocation) {
      // Restart auto refresh with new rate for enhanced bus store
      busStore.stopAutoRefresh();
      // Small delay to ensure cleanup is complete
      const timeoutId = setTimeout(() => {
        const currentBusStore = useEnhancedBusStore.getState();
        currentBusStore.startAutoRefresh();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [config?.refreshRate, config?.city, config?.homeLocation, config?.workLocation]); // Removed isAutoRefreshEnabled from deps

  // Handle refresh rate changes for favorite bus store
  useEffect(() => {
    const updateFavoriteBusRefreshRate = async () => {
      const { useFavoriteBusStore } = await import('../stores/favoriteBusStore');
      const favoriteBusStore = useFavoriteBusStore.getState();
      favoriteBusStore.updateRefreshRate();
    };

    if (config?.refreshRate) {
      updateFavoriteBusRefreshRate();
    }
  }, [config?.refreshRate]);

  // Debounced manual refresh to prevent rapid successive calls
  const debouncedManualRefresh = useDebounceCallback(
    async () => {
      const busStore = useEnhancedBusStore.getState();
      const { useFavoriteBusStore } = await import('../stores/favoriteBusStore');
      const favoriteBusStore = useFavoriteBusStore.getState();
      
      // Refresh both enhanced buses and favorite buses
      await Promise.all([
        busStore.manualRefresh(),
        favoriteBusStore.manualRefresh()
      ]);
    },
    1000, // 1 second debounce
    [] // Empty deps to prevent infinite loop
  );

  // Memoized manual refresh function
  const handleManualRefresh = useCallback(async () => {
    debouncedManualRefresh();
  }, [debouncedManualRefresh]);

  // Memoized function to toggle auto refresh
  const toggleAutoRefresh = useCallback(() => {
    const busStore = useEnhancedBusStore.getState();
    if (isAutoRefreshEnabled) {
      busStore.stopAutoRefresh();
    } else {
      busStore.startAutoRefresh();
    }
  }, [isAutoRefreshEnabled]);

  return {
    isAutoRefreshEnabled,
    manualRefresh: handleManualRefresh,
    toggleAutoRefresh,
    refreshRate: config?.refreshRate || 0,
  };
};