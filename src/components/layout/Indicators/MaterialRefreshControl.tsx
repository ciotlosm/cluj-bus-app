import React from 'react';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  alpha,
  Box,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useRefreshSystem } from '../../../hooks/useRefreshSystem';
import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';

export const MaterialRefreshControl: React.FC = () => {
  const { manualRefresh, refreshRate, isAutoRefreshEnabled } = useRefreshSystem();
  const { lastUpdate, lastApiUpdate, cacheStats } = useEnhancedBusStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null);
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await manualRefresh();
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };
  const theme = useTheme();

  // Update current time every second for accurate timing
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get the most recent timestamp available
  const getLastRefreshTime = (): Date | null => {
    // Check each timestamp and ensure it's a valid Date object
    const timestamps = [lastApiUpdate, lastUpdate, cacheStats.lastRefresh];
    
    for (const timestamp of timestamps) {
      if (timestamp && timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        return timestamp;
      }
    }
    
    return null;
  };

  const formatTimeDifference = (timestamp?: Date | null): string => {
    if (!timestamp || !(timestamp instanceof Date)) return 'Never';
    
    try {
      const diff = Math.floor((currentTime - timestamp.getTime()) / 1000);
      
      if (diff < 60) return `${diff}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      return `${Math.floor(diff / 3600)}h`;
    } catch (error) {
      console.warn('Error formatting time difference:', error, timestamp);
      return 'Unknown';
    }
  };

  const getTimeToNextRefresh = (): string => {
    const lastRefreshTime = getLastRefreshTime();
    
    if (!isAutoRefreshEnabled || !lastRefreshTime || !(lastRefreshTime instanceof Date) || refreshRate <= 0) {
      return 'Off';
    }

    try {
      const nextRefreshTime = lastRefreshTime.getTime() + refreshRate;
      const timeUntilNext = Math.floor((nextRefreshTime - currentTime) / 1000);
      
      if (timeUntilNext <= 0) return 'Now';
      if (timeUntilNext < 60) return `${timeUntilNext}s`;
      return `${Math.floor(timeUntilNext / 60)}m`;
    } catch (error) {
      console.warn('Error calculating next refresh time:', error, lastRefreshTime);
      return 'Error';
    }
  };

  const getTooltipContent = () => {
    const lastRefreshTime = getLastRefreshTime();
    const timeSinceLastRefresh = formatTimeDifference(lastRefreshTime);
    const timeToNextRefresh = getTimeToNextRefresh();
    
    const refreshRateText = refreshRate > 0 ? `${refreshRate / 1000}s` : 'Off';
    const statusText = isAutoRefreshEnabled ? 'Active' : 'Inactive';
    
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
          Auto: {refreshRateText} ({statusText})
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
          Last: {timeSinceLastRefresh} • Next: {timeToNextRefresh}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', opacity: 0.8 }}>
          Click to refresh now
        </Typography>
      </Box>
    );
  };

  // Force tooltip to re-render by including currentTime in the key
  const tooltipKey = `${currentTime}-${isAutoRefreshEnabled}-${refreshRate}`;
  
  return (
    <Tooltip 
      title={getTooltipContent()} 
      arrow
      key={tooltipKey}
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: alpha(theme.palette.grey[900], 0.95),
            color: theme.palette.common.white,
            fontSize: '0.7rem',
            maxWidth: 200,
          }
        }
      }}
    >
      <IconButton
        onClick={refresh}
        disabled={isRefreshing}
        sx={{
          bgcolor: alpha(theme.palette.common.white, 0.1),
          color: theme.palette.common.white,
          border: isAutoRefreshEnabled 
            ? `1px solid ${alpha(theme.palette.success.main, 0.3)}` 
            : `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
          '&:hover': {
            bgcolor: alpha(theme.palette.common.white, 0.2),
            transform: 'scale(1.05)',
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
            size={20}
            sx={{
              color: theme.palette.common.white,
            }}
          />
        ) : (
          <RefreshIcon sx={{ 
            fontSize: 20,
            color: isAutoRefreshEnabled 
              ? alpha(theme.palette.success.light, 0.9)
              : theme.palette.common.white
          }} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default MaterialRefreshControl;