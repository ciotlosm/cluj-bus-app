import React from 'react';
import {
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
  Box,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useRefreshSystem } from '../../../hooks/useRefreshSystem';
import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';
import { useLocationStore } from '../../../stores/locationStore';

export const RefreshControl: React.FC = () => {
  const { manualRefresh, refreshRate, isAutoRefreshEnabled } = useRefreshSystem();
  const { lastUpdate, lastApiUpdate, cacheStats } = useEnhancedBusStore();
  const { requestLocation, locationPermission } = useLocationStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  const theme = useTheme();

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh GPS location if permission is granted
      if (locationPermission === 'granted') {
        try {
          await requestLocation();
        } catch (locationError) {
          console.warn('Failed to refresh GPS location:', locationError);
          // Continue with data refresh even if GPS fails
        }
      }
      
      // Refresh bus data
      await manualRefresh();
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
    const timestamps = [lastApiUpdate, lastUpdate, cacheStats.lastRefresh];
    
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
    
    if (!isAutoRefreshEnabled || !lastRefreshTime || refreshRate <= 0) {
      return {
        color: theme.palette.warning.main,
        progress: 0,
        hasUpdate: false,
      };
    }

    const timeSinceLastRefresh = currentTime - lastRefreshTime.getTime();
    const timeUntilNext = refreshRate - timeSinceLastRefresh;
    
    // If no cache update happened (red)
    if (timeSinceLastRefresh > refreshRate * 2) {
      return {
        color: theme.palette.error.main,
        progress: 0,
        hasUpdate: false,
      };
    }
    
    // If cache was updated (green) and counting down
    if (timeUntilNext > 0) {
      const progress = ((refreshRate - timeUntilNext) / refreshRate) * 100;
      return {
        color: theme.palette.success.main,
        progress: Math.min(100, Math.max(0, progress)),
        hasUpdate: true,
      };
    }
    
    // Time for next refresh
    return {
      color: theme.palette.success.main,
      progress: 100,
      hasUpdate: true,
    };
  };

  const { color, progress, hasUpdate } = getRefreshStatus();

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Background circle (empty state) */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={40}
        thickness={3}
        sx={{
          color: alpha(theme.palette.common.white, 0.1),
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
          bgcolor: alpha(theme.palette.common.white, 0.1),
          color: theme.palette.common.white,
          border: `2px solid ${alpha(color, 0.3)}`,
          '&:hover': {
            bgcolor: alpha(theme.palette.common.white, 0.2),
            transform: 'scale(1.05)',
            border: `2px solid ${alpha(color, 0.5)}`,
          },
          '&:disabled': {
            bgcolor: alpha(theme.palette.common.white, 0.05),
            color: alpha(theme.palette.common.white, 0.5),
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {isRefreshing ? (
          <CircularProgress
            size={16}
            sx={{
              color: theme.palette.common.white,
            }}
          />
        ) : (
          <RefreshIcon 
            sx={{ 
              fontSize: 16,
              color: hasUpdate 
                ? alpha(theme.palette.success.light, 0.9)
                : theme.palette.common.white
            }} 
          />
        )}
      </IconButton>
    </Box>
  );
};

export default RefreshControl;