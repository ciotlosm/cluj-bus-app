import React from 'react';
import { useRefreshSystem } from '../../../hooks/useRefreshSystem';
import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';
import { useFavoriteBusStore } from '../../../stores/favoriteBusStore';
import { MaterialButton } from '../../ui/Button/MaterialButton';
import { logger } from '../../../utils/logger';
import { formatRefreshTime } from '../../../utils/timeFormat';

interface RefreshControlProps {
  className?: string;
}

/**
 * Component that provides manual refresh controls and displays auto-refresh status
 */
export const RefreshControl: React.FC<RefreshControlProps> = ({ className = '' }) => {
  const { manualRefresh } = useRefreshSystem();
  const { isLoading: enhancedBusLoading, lastUpdate, lastApiUpdate, lastCacheUpdate } = useEnhancedBusStore();
  const { isLoading: favoriteBusLoading, lastUpdate: favoriteBusLastUpdate } = useFavoriteBusStore();



  const handleManualRefresh = () => {
    logger.info('Manual refresh triggered by user', { 
      lastUpdate, 
      lastApiUpdate, 
      lastCacheUpdate, 
      favoriteBusLastUpdate,
      enhancedBusLoading,
      favoriteBusLoading
    }, 'UI');
    manualRefresh();
  };

  // Determine which timestamp to show and its source
  const getDisplayInfo = () => {
    // Consider both enhanced bus and favorite bus timestamps
    const allTimestamps = [lastApiUpdate, lastCacheUpdate, favoriteBusLastUpdate].filter(Boolean);
    
    if (allTimestamps.length === 0) {
      return {
        time: 'Never',
        source: '',
        title: 'No data available'
      };
    }

    // Find the most recent timestamp
    const mostRecent = allTimestamps.reduce((latest, current) => 
      current && (!latest || current > latest) ? current : latest
    );

    if (!mostRecent) {
      return {
        time: 'Never',
        source: '',
        title: 'No data available'
      };
    }

    // Determine the source of the most recent update
    let source = '';
    let title = '';

    if (mostRecent === lastApiUpdate) {
      source = 'Live';
      title = `Live data received ${formatRefreshTime(lastApiUpdate)}`;
      if (lastCacheUpdate) title += ` • Cache updated ${formatRefreshTime(lastCacheUpdate)}`;
      if (favoriteBusLastUpdate) title += ` • Favorites updated ${formatRefreshTime(favoriteBusLastUpdate)}`;
    } else if (mostRecent === lastCacheUpdate) {
      source = 'Cache';
      title = `Using cached data from ${formatRefreshTime(lastCacheUpdate)}`;
      if (lastApiUpdate) title += ` • Last live data ${formatRefreshTime(lastApiUpdate)}`;
      if (favoriteBusLastUpdate) title += ` • Favorites updated ${formatRefreshTime(favoriteBusLastUpdate)}`;
    } else if (mostRecent === favoriteBusLastUpdate) {
      source = 'Favorites';
      title = `Favorites updated ${formatRefreshTime(favoriteBusLastUpdate)}`;
      if (lastApiUpdate) title += ` • Last live data ${formatRefreshTime(lastApiUpdate)}`;
      if (lastCacheUpdate) title += ` • Cache updated ${formatRefreshTime(lastCacheUpdate)}`;
    }

    return {
      time: formatRefreshTime(mostRecent),
      source,
      title
    };
  };

  const displayInfo = getDisplayInfo();

  return (
    <div className={`refresh-control ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Cache update timestamp */}
        <div className="text-xs text-white/70 hidden sm:block" title={displayInfo.title}>
          <span className="opacity-60">Cache updated </span>
          <span className="ml-1">{displayInfo.time}</span>
        </div>

        {/* Mobile: Show just cache update */}
        <span className="text-xs text-white/70 sm:hidden" title={displayInfo.title}>
          Cache {displayInfo.time}
        </span>

        {/* Refresh button - always visible */}
        <MaterialButton
          size="small"
          variant="outlined"
          onClick={handleManualRefresh}
          loading={enhancedBusLoading || favoriteBusLoading}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/50"
          title="Cache updated now"
          startIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          <span className="hidden sm:inline">{(enhancedBusLoading || favoriteBusLoading) ? 'Refreshing...' : 'Refresh'}</span>
        </MaterialButton>
      </div>
    </div>
  );
};