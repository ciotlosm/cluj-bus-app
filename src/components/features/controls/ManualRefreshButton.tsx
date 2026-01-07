// ManualRefreshButton - Color-coded refresh button with timer countdown
// Integrates with Data Freshness Monitor and Manual Refresh System
// Requirements: 1.4, 1.5, 2.1, 2.2, 2.4, 2.5, 2.6, 8.2, 8.3, 8.5

import type { FC } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { IconButton, Tooltip, Box, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getDataFreshnessMonitor, type DataFreshnessStatus } from '../../../utils/core/dataFreshnessMonitor';
import { automaticRefreshService } from '../../../services/automaticRefreshService';
import { manualRefreshService } from '../../../services/manualRefreshService';

interface ManualRefreshButtonProps {
  className?: string;
  disabled?: boolean;
}

/**
 * Manual Refresh Button Component
 * 
 * Features:
 * - Color-coded status indicator (green for fresh, red for stale)
 * - Loading state during refresh operations
 * - Timer countdown for next vehicle refresh
 * - Integrates with Material-UI design system
 * - Prevents concurrent refresh operations
 */
export const ManualRefreshButton: FC<ManualRefreshButtonProps> = ({
  className,
  disabled = false
}) => {
  const [freshnessStatus, setFreshnessStatus] = useState<DataFreshnessStatus>({
    status: 'stale',
    vehicleDataAge: Infinity,
    generalDataAge: Infinity,
    isRefreshing: false, // We won't use this anymore
    nextVehicleRefresh: 0
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ [storeName: string]: 'starting' | 'completed' | 'error' }>({});

  // Subscribe to freshness monitor for countdown and fresh/stale status (but not isRefreshing)
  useEffect(() => {
    const monitor = getDataFreshnessMonitor();
    
    // Get initial status
    const initialStatus = monitor.calculateFreshness();
    setFreshnessStatus(initialStatus);
    
    // Subscribe to changes
    const unsubscribe = monitor.subscribeToChanges((status) => {
      setFreshnessStatus(status);
    });

    return unsubscribe;
  }, []);

  // Subscribe to progress updates - this tells us when refresh is happening
  useEffect(() => {
    const unsubscribe = manualRefreshService.subscribeToProgress((progress) => {
      setRefreshProgress(progress);
      // If we have any progress, we're refreshing. If progress is empty, we're not.
      setIsRefreshing(Object.keys(progress).length > 0);
    });

    return unsubscribe;
  }, []);

  /**
   * Manual refresh system - triggers automatic refresh service and resets timer
   * This keeps both manual and automatic refreshes in sync
   */
  const handleManualRefresh = useCallback(async () => {
    // Prevent concurrent operations
    if (isRefreshing || disabled) {
      return;
    }

    try {
      // Use automatic refresh service to trigger refresh and reset timer
      await automaticRefreshService.triggerManualRefresh();
    } catch (error) {
      // Error handling - let automatic refresh service handle errors
      console.warn('Manual refresh encountered errors:', error);
    }
  }, [
    isRefreshing,
    disabled
  ]);

  // Determine button color based on data freshness
  // Requirements: 2.1, 2.2, 2.5
  const getButtonColor = (): 'success' | 'error' | 'default' => {
    if (isRefreshing) {
      return 'default';
    }
    return freshnessStatus.status === 'fresh' ? 'success' : 'error';
  };

  // Format countdown timer display
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  // Create tooltip content with freshness info, countdown, and refresh progress
  const getTooltipContent = (): string => {
    if (isRefreshing) {
      // Show which stores are currently being refreshed
      const inProgress = Object.entries(refreshProgress)
        .filter(([_, status]) => status === 'starting')
        .map(([storeName]) => storeName);
      
      const completed = Object.entries(refreshProgress)
        .filter(([_, status]) => status === 'completed')
        .map(([storeName]) => storeName);

      if (inProgress.length > 0) {
        return `Refreshing: ${inProgress.join(', ')}...`;
      } else if (completed.length > 0) {
        return `Completed: ${completed.join(', ')}. Continuing...`;
      } else {
        return 'Refreshing data...';
      }
    }

    const statusText = freshnessStatus.status === 'fresh' ? 'Data is fresh' : 'Data is stale';
    const countdownText = freshnessStatus.nextVehicleRefresh > 0 
      ? ` • Next auto-refresh: ${formatCountdown(freshnessStatus.nextVehicleRefresh)}`
      : '';
    
    return `${statusText}${countdownText}`;
  };

  // Check if any refresh is happening and get button color
  const buttonColor = getButtonColor();

  return (
    <Tooltip title={getTooltipContent()} arrow>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        {/* Subtle countdown progress ring - only show when not refreshing and countdown > 0 */}
        {!isRefreshing && freshnessStatus.nextVehicleRefresh > 0 && (
          <CircularProgress
            variant="determinate"
            value={((60 - freshnessStatus.nextVehicleRefresh) / 60) * 100} // Progress from 0 to 100 as countdown decreases
            size={52} // Slightly larger than button (48px)
            thickness={2}
            sx={{
              position: 'absolute',
              top: -2,
              left: -2,
              color: 'action.disabled',
              opacity: 0.3,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
                // Smooth transition for progress changes
                transition: 'stroke-dashoffset 0.5s ease-out',
              },
            }}
          />
        )}
        
        <IconButton
          className={className}
          color={buttonColor}
          onClick={handleManualRefresh}
          disabled={disabled || isRefreshing} // Disable during both manual AND automatic refresh
          aria-label="Manual refresh data"
          size="medium"
          sx={{
            // Ensure consistent sizing with other header controls
            width: 48,
            height: 48,
            // Add subtle animation for state changes
            transition: 'color 0.2s ease-in-out',
          }}
        >
          {isRefreshing ? ( // Show spinner for both manual and automatic refresh
            <CircularProgress
              size={24}
              color="inherit"
              sx={{
                // Match the icon size
                width: '24px !important',
                height: '24px !important',
              }}
            />
          ) : (
            <RefreshIcon />
          )}
        </IconButton>
      </Box>
    </Tooltip>
  );
};