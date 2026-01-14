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

interface RefreshCountdownDotsProps {
  size: number; // Circle diameter
  dotCount: number; // Number of dots around the circle
}

/**
 * Dot-based countdown animation component
 * Shows dots around a circle that disappear smoothly over 60 seconds
 */
const RefreshCountdownDots: FC<RefreshCountdownDotsProps> = ({ 
  size, 
  dotCount 
}) => {
  const [animationStartTime, setAnimationStartTime] = useState<number>(Date.now());
  const [currentProgress, setCurrentProgress] = useState(0);
  const [key, setKey] = useState(0); // Force re-render when refresh happens

  // Reset animation when component mounts or refresh happens
  const resetAnimation = useCallback(() => {
    setAnimationStartTime(Date.now());
    setCurrentProgress(0);
    setKey(prev => prev + 1); // Force re-render
  }, []);

  // Listen for manual refresh to reset animation
  useEffect(() => {
    const unsubscribe = manualRefreshService.subscribeToProgress((progress) => {
      // If refresh just started (progress has items), reset animation
      if (Object.keys(progress).length > 0 && currentProgress > 0) {
        setAnimationStartTime(Date.now());
        setCurrentProgress(0);
        setKey(prev => prev + 1); // Force re-render
      }
    });

    return unsubscribe;
  }, [currentProgress]); // Remove resetAnimation from dependencies

  // Run smooth 60-second animation
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - animationStartTime;
      const progress = Math.min(elapsed / 60000, 1); // 60 seconds
      setCurrentProgress(progress);
      
      if (progress >= 1) {
        // Loop the animation - inline instead of calling resetAnimation
        setAnimationStartTime(Date.now());
        setCurrentProgress(0);
        setKey(prev => prev + 1);
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [animationStartTime]); // Remove resetAnimation from dependencies

  const radius = size / 2 - 3;
  const center = size / 2;
  
  // Calculate visible dots based on progress
  const visibleDots = Math.ceil(dotCount * (1 - currentProgress));
  
  // Generate dot positions
  const dots = Array.from({ length: dotCount }, (_, index) => {
    const angle = (index / dotCount) * 2 * Math.PI - Math.PI / 2; // Start from top
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    const isVisible = index >= dotCount - visibleDots;
    
    // Determine if this is the next dot to disappear (flash green)
    const nextToDisappear = index === dotCount - visibleDots - 1 && visibleDots > 0;
    
    return { x, y, isVisible, nextToDisappear, key: `${key}-${index}` };
  });

  return (
    <Box
      key={key} // Force re-render when key changes
      sx={{
        position: 'absolute',
        top: (48 - size) / 2,
        left: (48 - size) / 2,
        width: size,
        height: size,
        pointerEvents: 'none',
      }}
    >
      <svg width={size} height={size}>
        {dots.map(dot => (
          <circle
            key={dot.key}
            cx={dot.x}
            cy={dot.y}
            r={1.5}
            fill={dot.nextToDisappear ? '#4caf50' : 'currentColor'} // Green for next to disappear
            opacity={dot.isVisible ? 0.4 : 0}
            style={{
              transition: 'opacity 0.3s ease-out, fill 0.5s ease-in-out',
              color: 'inherit',
              // Add pulsing animation for the next dot
              ...(dot.nextToDisappear && {
                animation: 'pulse 1s ease-in-out infinite alternate'
              })
            }}
          />
        ))}
        {/* Add CSS animation for pulsing */}
        <defs>
          <style>
            {`
              @keyframes pulse {
                from { opacity: 0.4; }
                to { opacity: 0.8; }
              }
            `}
          </style>
        </defs>
      </svg>
    </Box>
  );
};

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
    staticDataAge: Infinity,
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
    
    return `${statusText}${countdownText} • Click to refresh`;
  };

  // Check if any refresh is happening and get button color
  const buttonColor = getButtonColor();

  // Calculate animation progress (0 to 1)
  const animationProgress = freshnessStatus.nextVehicleRefresh > 0 
    ? (60 - freshnessStatus.nextVehicleRefresh) / 60 
    : 0;

  return (
    <Tooltip title={getTooltipContent()} arrow>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        {/* Dot-based countdown animation - only show when not refreshing */}
        {!isRefreshing && (
          <RefreshCountdownDots 
            size={40} // Smaller circle around the icon
            dotCount={12} // 12 dots for clean visual spacing
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