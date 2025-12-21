import { useEffect, useCallback, useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useLocationStore } from '../../stores/locationStore';
import { useRefreshSystem } from './useRefreshSystem';
import { useApiConfig } from './useApiConfig';
import { logger } from '../../utils/shared/logger';

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
  const { refreshAll, startAutoRefresh } = useRefreshSystem();
  const { fetchAgencies } = useConfigStore(); // Agencies are now managed in configStore
  const { setupApi, isConfigured: isApiConfigured } = useApiConfig();

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

      // Step 0: Initialize API configuration (5%)
      updateProgress(5, 'Setting up API configuration...');
      
      try {
        const agencyId = setupApi();
        logger.info('API configuration initialized successfully', { agencyId }, 'INIT');
      } catch (apiError) {
        const errorMessage = `API setup failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
        setError(errorMessage);
        return; // Can't continue without API setup
      }

      // Step 1: Check and request GPS location (15%)
      updateProgress(15, 'Checking GPS permissions...');
      
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

      // Step 3: Initialize modern data system with fresh data (50%)
      updateProgress(50, 'Loading transit data...');
      
      try {
        await refreshAll(true); // Force refresh to get fresh data
        logger.info('Transit data loaded successfully', {}, 'INIT');
      } catch (dataError) {
        const errorToLog = dataError instanceof Error ? dataError : new Error(String(dataError));
        logger.error('Failed to load transit data', errorToLog, 'INIT');
        // This is more critical, but still continue
      }

      // Step 4: Initialize favorite buses (70%)
      updateProgress(70, 'Loading favorite routes...');
      
      // Favorites are now managed in configStore and don't need separate refresh
      logger.info('Favorite routes ready', {}, 'INIT');

      // Step 5: Start auto-refresh systems (90%)
      updateProgress(90, 'Starting auto-refresh...');
      
      try {
        // Start auto-refresh for modern data system
        startAutoRefresh();
        
        // Favorites auto-refresh is now handled by configStore
        
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
      const errorToLog = error instanceof Error ? error : new Error(errorMessage);
      setError(errorMessage);
      logger.error('App initialization failed', errorToLog, 'INIT');
    }
  }, [
    isFullyConfigured,
    config,
    checkLocationPermission,
    requestLocation,
    fetchAgencies,
    refreshAll,
    startAutoRefresh,
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