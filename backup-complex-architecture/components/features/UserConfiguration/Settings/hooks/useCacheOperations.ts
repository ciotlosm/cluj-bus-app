import { useState, useEffect } from 'react';
import { useUnifiedCacheManager } from '../../../../hooks/shared/useUnifiedCacheManager';
import { StoreErrorHandler } from '../../../../stores/shared/errorHandler';
import { logger } from '../../../../utils/shared/logger';

export type CacheOperationState = 'idle' | 'refreshing' | 'clearing' | 'error';
export type CacheError = 'network' | 'inconsistent' | 'storage' | 'unknown';

export interface CacheOperationStatus {
  state: CacheOperationState;
  error?: CacheError;
  message: string;
}

export const useCacheOperations = () => {
  const {
    getCacheStats,
    clearCache,
    refreshCache,
    isRefreshing,
    isClearing,
    error,
  } = useUnifiedCacheManager();

  const cacheStats = getCacheStats();

  const [operationStatus, setOperationStatus] = useState<CacheOperationStatus>({
    state: isRefreshing ? 'refreshing' : isClearing ? 'clearing' : 'idle',
    message: error || ''
  });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Update operation status based on modern cache manager state
  useEffect(() => {
    if (isRefreshing) {
      setOperationStatus({ state: 'refreshing', message: 'Refreshing cached data...' });
    } else if (isClearing) {
      setOperationStatus({ state: 'clearing', message: 'Clearing all cached data...' });
    } else if (error) {
      setOperationStatus({ state: 'error', message: error });
    } else {
      setOperationStatus({ state: 'idle', message: '' });
    }
  }, [isRefreshing, isClearing, error]);

  const handleRefreshCache = async () => {
    if (!navigator.onLine) {
      setOperationStatus({
        state: 'error',
        error: 'network',
        message: 'Cannot refresh cache while offline'
      });
      return;
    }

    try {
      await refreshCache();
      // Force component re-render to update timestamps
      setRefreshTrigger(prev => prev + 1);
      setOperationStatus({ 
        state: 'idle', 
        message: 'Cache refreshed successfully' 
      });
      logger.info('Cache refresh completed from settings', {}, 'CACHE_MGMT');
    } catch (error: any) {
      // Use standardized error handler to classify and format error
      const errorState = StoreErrorHandler.createError(error, {
        storeName: 'CacheManagerPanel',
        operation: 'refreshCache',
        timestamp: new Date()
      });

      // Map standardized error types to cache-specific error types
      let cacheErrorType: CacheError = 'unknown';
      switch (errorState.type) {
        case 'network':
          cacheErrorType = 'network';
          break;
        case 'parsing':
          cacheErrorType = 'inconsistent';
          break;
        case 'noData':
        case 'partial':
          cacheErrorType = 'storage';
          break;
        default:
          cacheErrorType = 'unknown';
      }

      setOperationStatus({
        state: 'error',
        error: cacheErrorType,
        message: errorState.message || 'Failed to refresh cache'
      });
      
      logger.error('Cache refresh failed', { error: errorState }, 'CACHE_MGMT');
    }
  };

  const handleClearCache = async () => {
    if (!navigator.onLine) {
      setOperationStatus({
        state: 'error',
        error: 'network',
        message: 'Cannot clear cache while offline'
      });
      return;
    }

    const confirmed = confirm(
      'Clear all cached data?\n\n' +
      '• All cached Tranzy API data will be removed\n' +
      '• Fresh data will be downloaded on next use\n' +
      '• This may temporarily slow down the app\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      await clearCache();
      setRefreshTrigger(prev => prev + 1);
      setOperationStatus({ 
        state: 'idle', 
        message: 'Cache cleared successfully' 
      });
      logger.info('Cache cleared from settings', {}, 'CACHE_MGMT');
    } catch (error: any) {
      // Use standardized error handler to classify and format error
      const errorState = StoreErrorHandler.createError(error, {
        storeName: 'CacheManagerPanel',
        operation: 'clearCache',
        timestamp: new Date()
      });

      // Map to cache-specific error type
      const cacheErrorType: CacheError = errorState.type === 'network' ? 'network' : 'storage';

      setOperationStatus({
        state: 'error',
        error: cacheErrorType,
        message: errorState.message || 'Failed to clear cache'
      });
      
      logger.error('Cache clear failed', { error: errorState }, 'CACHE_MGMT');
    }
  };

  return {
    cacheStats,
    operationStatus,
    refreshTrigger,
    handleRefreshCache,
    handleClearCache,
    isOperationInProgress: operationStatus.state === 'refreshing' || operationStatus.state === 'clearing'
  };
};