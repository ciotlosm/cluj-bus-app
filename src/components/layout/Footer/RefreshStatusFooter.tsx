import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';
import { useRefreshSystem } from '../../../hooks/useRefreshSystem';

export const RefreshStatusFooter: React.FC = () => {
  const theme = useTheme();
  const { cacheStats, lastUpdate, lastApiUpdate, lastCacheUpdate } = useEnhancedBusStore();
  const { refreshRate, isAutoRefreshEnabled } = useRefreshSystem();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Debug: log available timestamps
  useEffect(() => {
    console.log('RefreshStatusFooter - Available timestamps:', {
      'cacheStats.lastRefresh': cacheStats.lastRefresh,
      'lastUpdate': lastUpdate,
      'lastApiUpdate': lastApiUpdate,
      'lastCacheUpdate': lastCacheUpdate,
      'refreshRate': refreshRate,
      'isAutoRefreshEnabled': isAutoRefreshEnabled
    });
  }, [cacheStats.lastRefresh, lastUpdate, lastApiUpdate, lastCacheUpdate, refreshRate, isAutoRefreshEnabled]);

  // Update current time every second for accurate timing
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ensure cache stats are loaded
  useEffect(() => {
    const { getCacheStats } = useEnhancedBusStore.getState();
    getCacheStats();
  }, []);

  const formatTimeDifference = (timestamp?: Date): string => {
    if (!timestamp) return 'Never';
    
    const diff = Math.floor((currentTime - timestamp.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  // Use the most recent timestamp available
  const getLastRefreshTime = (): Date | null => {
    return lastApiUpdate || lastUpdate || cacheStats.lastRefresh || null;
  };

  const getTimeToNextRefresh = (): string => {
    const lastRefreshTime = getLastRefreshTime();
    
    if (!isAutoRefreshEnabled || !lastRefreshTime || refreshRate <= 0) {
      return 'Disabled';
    }

    const nextRefreshTime = lastRefreshTime.getTime() + refreshRate;
    const timeUntilNext = Math.floor((nextRefreshTime - currentTime) / 1000);
    
    if (timeUntilNext <= 0) return 'Now';
    if (timeUntilNext < 60) return `${timeUntilNext}s`;
    return `${Math.floor(timeUntilNext / 60)}m ${timeUntilNext % 60}s`;
  };

  const timeSinceLastRefresh = formatTimeDifference(getLastRefreshTime());
  const timeToNextRefresh = getTimeToNextRefresh();

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 90, // Above bottom navigation
        left: 0,
        right: 0,
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(8px)',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        px: 2,
        py: 1,
        zIndex: theme.zIndex.appBar - 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 'md',
          mx: 'auto',
        }}
      >
        {/* Last Refresh */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <RefreshIcon 
            sx={{ 
              fontSize: 12, 
              color: theme.palette.text.disabled 
            }} 
          />
          <Typography 
            variant="caption" 
            color="text.disabled"
            sx={{ fontSize: '0.65rem' }}
          >
            Last: {timeSinceLastRefresh}
          </Typography>
        </Box>

        {/* Next Refresh */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ScheduleIcon 
            sx={{ 
              fontSize: 12, 
              color: isAutoRefreshEnabled 
                ? theme.palette.success.main 
                : theme.palette.text.disabled 
            }} 
          />
          <Typography 
            variant="caption" 
            color={isAutoRefreshEnabled ? 'success.main' : 'text.disabled'}
            sx={{ fontSize: '0.65rem' }}
          >
            Next: {timeToNextRefresh}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};