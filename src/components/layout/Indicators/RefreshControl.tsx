import React from 'react';
import {
  IconButton,
  CircularProgress,
  Box,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useRefreshSystem } from '../../../hooks/shared/useRefreshSystem';
import { useLocationStore } from '../../../stores/locationStore';
import { logger } from '../../../utils/shared/logger';
import { useThemeUtils } from '../../../hooks';

export const RefreshControl: React.FC = () => {
  const { 
    refreshAll, 
    isAutoRefreshEnabled, 
    lastUpdate, 
    lastApiUpdate 
  } = useRefreshSystem();
  const { requestLocation } = useLocationStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  const { theme, getStatusColors, getTextColors, alpha } = useThemeUtils();

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      // Always attempt to refresh GPS location first, regardless of current permission status
      // This handles cases where permission was granted but location is stale
      try {
        await requestLocation();
        logger.info('GPS location refreshed successfully', undefined, 'REFRESH');
      } catch (locationError) {
        logger.warn('Failed to refresh GPS location', locationError, 'REFRESH');
        // Continue with data refresh even if GPS fails
        // This is expected behavior if user denied location or GPS is unavailable
      }
      
      // Refresh all data using modern system
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update current time every second for accurate timing
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get the most recent timestamp available
  const getLastRefreshTime = (): Date | null => {
    const timestamps = [lastApiUpdate, lastUpdate];
    
    for (const timestamp of timestamps) {
      if (timestamp && timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        return timestamp;
      }
    }
    
    return null;
  };

  // Calculate refresh status and progress
  const getRefreshStatus = () => {
    const lastRefreshTime = getLastRefreshTime();
    const colors = getStatusColors();
    const refreshRate = 30000; // 30 seconds for modern system
    
    if (!isAutoRefreshEnabled || !lastRefreshTime) {
      return {
        color: colors.warning.main,
        progress: 0,
        hasUpdate: false,
      };
    }

    const timeSinceLastRefresh = currentTime - lastRefreshTime.getTime();
    const timeUntilNext = refreshRate - timeSinceLastRefresh;
    
    // If no cache update happened (red)
    if (timeSinceLastRefresh > refreshRate * 2) {
      return {
        color: colors.error.main,
        progress: 0,
        hasUpdate: false,
      };
    }
    
    // If cache was updated (green) and counting down
    if (timeUntilNext > 0) {
      const progress = ((refreshRate - timeUntilNext) / refreshRate) * 100;
      return {
        color: colors.success.main,
        progress: Math.min(100, Math.max(0, progress)),
        hasUpdate: true,
      };
    }
    
    // Time for next refresh
    return {
      color: colors.success.main,
      progress: 100,
      hasUpdate: true,
    };
  };

  const { color, progress, hasUpdate } = getRefreshStatus();
  const textColors = getTextColors();

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Background circle (empty state) */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={40}
        thickness={3}
        sx={{
          color: textColors.whiteLight,
          position: 'absolute',
        }}
      />
      
      {/* Progress circle (filling indicator) */}
      <CircularProgress
        variant="determinate"
        value={progress}
        size={40}
        thickness={3}
        sx={{
          color: alpha(color, 0.8),
          position: 'absolute',
          transform: 'rotate(-90deg) !important',
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      
      {/* Refresh button */}
      <IconButton
        onClick={refresh}
        disabled={isRefreshing}
        sx={{
          width: 40,
          height: 40,
          bgcolor: textColors.whiteLight,
          color: textColors.white,
          border: `2px solid ${alpha(color, 0.3)}`,
          '&:hover': {
            bgcolor: textColors.whiteHover,
            transform: 'scale(1.05)',
            border: `2px solid ${alpha(color, 0.5)}`,
          },
          '&:disabled': {
            bgcolor: alpha(textColors.white, 0.05),
            color: textColors.whiteFaded,
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {isRefreshing ? (
          <CircularProgress
            size={16}
            sx={{
              color: textColors.white,
            }}
          />
        ) : (
          <RefreshIcon 
            sx={{ 
              fontSize: 16,
              color: hasUpdate 
                ? textColors.whiteFaded
                : textColors.white
            }} 
          />
        )}
      </IconButton>
    </Box>
  );
};

export default RefreshControl;