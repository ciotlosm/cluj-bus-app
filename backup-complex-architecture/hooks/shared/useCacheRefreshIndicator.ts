/**
 * Hook for showing cache refresh indicators
 * Shows a small hourglass chip for 0.5 seconds when cache is updated
 */
import { useState, useEffect } from 'react';
import { unifiedCache } from './cache/instance';
import type { CacheEvent } from './cache/types';

export interface RefreshIndicatorState {
  isRefreshing: boolean;
  lastRefresh: Date | null;
}

/**
 * Hook that shows a refresh indicator when cache is updated
 * @param cacheKey - The cache key to monitor for updates
 * @param duration - How long to show the indicator (default: 500ms)
 */
export const useCacheRefreshIndicator = (
  cacheKey: string,
  duration: number = 500
): RefreshIndicatorState => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to cache events for this key
    const unsubscribe = unifiedCache.subscribe(cacheKey, (event: CacheEvent<any>) => {
      if (event.type === 'updated') {
        // Show refresh indicator
        setIsRefreshing(true);
        setLastRefresh(new Date(event.timestamp));

        // Hide indicator after specified duration
        const timer = setTimeout(() => {
          setIsRefreshing(false);
        }, duration);

        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, [cacheKey, duration]);

  return {
    isRefreshing,
    lastRefresh,
  };
};

/**
 * Hook that monitors multiple cache keys and shows refresh indicator
 * Useful for components that depend on multiple data sources
 */
export const useMultipleCacheRefreshIndicator = (
  cacheKeys: string[],
  duration: number = 500
): RefreshIndicatorState => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    cacheKeys.forEach(cacheKey => {
      const unsubscribe = unifiedCache.subscribe(cacheKey, (event: CacheEvent<any>) => {
        if (event.type === 'updated') {
          setIsRefreshing(true);
          setLastRefresh(new Date(event.timestamp));

          const timer = setTimeout(() => {
            setIsRefreshing(false);
          }, duration);

          // Store cleanup function
          unsubscribers.push(() => clearTimeout(timer));
        }
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(cleanup => cleanup());
    };
  }, [cacheKeys, duration]);

  return {
    isRefreshing,
    lastRefresh,
  };
};