import { useEffect, useCallback, useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useLocationStore } from '../stores/locationStore';
import { useEnhancedBusStore } from '../stores/enhancedBusStore';
import { useFavoriteBusStore } from '../stores/favoriteBusStore';
import { useAgencyStore } from '../stores/agencyStore';
import { logger } from '../utils/logger';

export interface AppInitializationState {
  isInitializing: boolean;
  initializationProgress: number;
  initializationStep: string;
  initializationError: string | null;
  isInitialized: boolean;
}

/**
 * Custom hook to handle comprehensive app initialization
 * Fetches all required data including GPS coordinates, agencies, routes, and initial vehicle data
 */
export const useAppInitialization = () => {
  const [state, setState] = useState<AppInitializationState>({
    isInitializing: false,
    initializationProgress: 0,
    initializationStep: '',
    initializationError: null,
    isInitialized: false,
  });

  const { config, isFullyConfigured } = useConfigStore();
  const { requestLocation, checkLocationPermission } = useLocationStore();
  const { refreshBuses, startAutoRefresh } = useEnhancedBusStore();
  const { refreshFavorites, startAutoRefresh: startFavoritesRefresh } = useFavoriteBusStore();
  const { fetchAgencies } = useAgencyStore();

  const updateProgress = useCallback((progress: number, step: string) => {
    setState(prev => ({
      ...prev,
      initializationProgress: progress,
      initializationStep: step,
    }));
    logger.info('Initialization progress', { progress, step }, 'INIT');
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      initializationError: error,
      isInitializing: false,
    }));
    logger.error('Initialization error', { error }, 'INIT');
  }, []);

  const initializeApp = useCallback(async () => {
    if (!isFullyConfigured || !config) {
      logger.debug('Skipping initialization - app not fully configured', { isFullyConfigured, hasConfig: !!config }, 'INIT');
      return;
    }

    setState(prev => ({
      ...prev,
      isInitializing: true,
      initializationProgress: 0,
      initializationStep: 'Starting initialization...',
      initializationError: null,
      isInitialized: false,
    }));

    try {
      logger.info('Starting comprehensive app initialization', { 
        city: config.city, 
        agencyId: config.agencyId,
        hasApiKey: !!config.apiKey,
        hasHomeLocation: !!config.homeLocation,
        hasWorkLocation: !!config.workLocation
      }, 'INIT');

      // Step 1: Check and request GPS location (10%)
      updateProgress(10, 'Checking GPS permissions...');
      
      try {
        const permission = await checkLocationPermission();
        
        if (permission === 'granted') {
          updateProgress(20, 'Getting current location...');
          await requestLocation();
          logger.info('GPS location obtained successfully', {}, 'INIT');
        } else if (permission === 'prompt') {
          updateProgress(20, 'Requesting location permission...');
          try {
            await requestLocation();
            logger.info('GPS location permission granted and location obtained', {}, 'INIT');
          } catch (locationError) {
            logger.warn('GPS location request failed, continuing without location', { error: locationError }, 'INIT');
            // Continue initialization even if GPS fails
          }
        } else {
          logger.warn('GPS location permission denied, continuing without location', {}, 'INIT');
          // Continue initialization even if GPS is denied
        }
      } catch (locationError) {
        logger.warn('GPS location setup failed, continuing initialization', { error: locationError }, 'INIT');
        // Don't fail initialization if GPS fails
      }

      // Step 2: Load agency data (30%)
      updateProgress(30, 'Loading transit agencies...');
      
      try {
        await fetchAgencies();
        logger.info('Agency data loaded successfully', {}, 'INIT');
      } catch (agencyError) {
        logger.warn('Failed to load agency data, continuing with cached data', { error: agencyError }, 'INIT');
        // Continue even if agency loading fails (might have cached data)
      }

      // Step 3: Initialize enhanced bus store with fresh data (50%)
      updateProgress(50, 'Loading vehicle data...');
      
      try {
        await refreshBuses(true); // Force refresh to get fresh data
        logger.info('Vehicle data loaded successfully', {}, 'INIT');
      } catch (busError) {
        logger.error('Failed to load vehicle data', { error: busError }, 'INIT');
        // This is more critical, but still continue
      }

      // Step 4: Initialize favorite buses (70%)
      updateProgress(70, 'Loading favorite routes...');
      
      try {
        await refreshFavorites(); // Refresh favorites
        logger.info('Favorite routes loaded successfully', {}, 'INIT');
      } catch (favoritesError) {
        logger.warn('Failed to load favorite routes', { error: favoritesError }, 'INIT');
        // Continue even if favorites fail
      }

      // Step 5: Start auto-refresh systems (90%)
      updateProgress(90, 'Starting auto-refresh...');
      
      try {
        // Start auto-refresh for enhanced buses
        startAutoRefresh();
        
        // Start auto-refresh for favorites
        startFavoritesRefresh();
        
        logger.info('Auto-refresh systems started successfully', {}, 'INIT');
      } catch (refreshError) {
        logger.warn('Failed to start auto-refresh systems', { error: refreshError }, 'INIT');
        // Continue even if auto-refresh fails
      }

      // Step 6: Complete initialization (100%)
      updateProgress(100, 'Initialization complete');
      
      setState(prev => ({
        ...prev,
        isInitializing: false,
        isInitialized: true,
      }));

      logger.info('App initialization completed successfully', {
        totalSteps: 6,
        city: config.city,
        agencyId: config.agencyId
      }, 'INIT');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setError(errorMessage);
      logger.error('App initialization failed', { error: errorMessage }, 'INIT');
    }
  }, [
    isFullyConfigured,
    config,
    checkLocationPermission,
    requestLocation,
    fetchAgencies,
    refreshBuses,
    refreshFavorites,
    startAutoRefresh,
    startFavoritesRefresh,
    updateProgress,
    setError
  ]);

  const retryInitialization = useCallback(() => {
    setState(prev => ({
      ...prev,
      initializationError: null,
    }));
    initializeApp();
  }, [initializeApp]);

  // Auto-initialize when app becomes fully configured
  useEffect(() => {
    if (isFullyConfigured && !state.isInitialized && !state.isInitializing) {
      logger.info('App became fully configured, starting initialization', {}, 'INIT');
      initializeApp();
    }
  }, [isFullyConfigured, state.isInitialized, state.isInitializing, initializeApp]);

  // Re-initialize when critical config changes
  useEffect(() => {
    if (isFullyConfigured && state.isInitialized && config) {
      logger.info('Configuration changed, re-initializing app', {
        city: config.city,
        agencyId: config.agencyId
      }, 'INIT');
      
      // Reset initialization state and restart
      setState(prev => ({
        ...prev,
        isInitialized: false,
      }));
      
      // Small delay to ensure state update is processed
      setTimeout(() => {
        initializeApp();
      }, 100);
    }
  }, [config?.city, config?.agencyId, config?.apiKey]); // Only re-init on critical config changes

  return {
    ...state,
    initializeApp,
    retryInitialization,
  };
};