import React from 'react';
import {
  Alert,
  Chip,
  Box,
  Typography,
  Collapse,
} from '@mui/material';
import {
  SignalWifiOff as OfflineIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';

import { useVehicleStore } from '../../../stores/vehicleStore';
import { useThemeUtils } from '../../../hooks';

export const OfflineIndicator: React.FC = () => {
  // Offline functionality is now integrated into vehicleStore
  const { error, cacheStats } = useVehicleStore();
  const isOnline = navigator.onLine;
  const isApiOnline = !error || error.type !== 'network';
  const lastApiError = error?.timestamp;
  const isUsingCachedData = cacheStats?.totalEntries > 0;
  const { getStatusColors, alpha } = useThemeUtils();

  // Show indicator if either network is offline OR API is unavailable
  const showOfflineIndicator = !isOnline || !isApiOnline;
  
  if (!showOfflineIndicator) {
    return null;
  }

  const getOfflineMessage = () => {
    if (!isOnline) {
      return {
        title: "You're offline",
        message: isUsingCachedData 
          ? 'Showing cached data. Some information may be outdated.'
          : 'No cached data available. Connect to internet for live updates.',
        chipLabel: 'Offline'
      };
    } else if (!isApiOnline) {
      return {
        title: "API unavailable",
        message: isUsingCachedData
          ? 'API service unavailable. Showing cached data until service is restored.'
          : 'API service unavailable. Check your API key or try again later.',
        chipLabel: 'API Error'
      };
    }
    return { title: '', message: '', chipLabel: '' };
  };

  const offlineInfo = getOfflineMessage();
  const colors = getStatusColors();

  return (
    <Collapse in={showOfflineIndicator}>
      <Alert
        severity="warning"
        icon={<OfflineIcon />}
        sx={{
          mb: 2,
          borderRadius: 2,
          bgcolor: colors.warning.light,
          border: `1px solid ${colors.warning.border}`,
          '& .MuiAlert-icon': {
            color: colors.warning.main,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {offlineInfo.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {offlineInfo.message}
            </Typography>
            {lastApiError && !isOnline && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Last error: {new Date(lastApiError).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          
          <Chip
            icon={<CloudOffIcon sx={{ fontSize: 16 }} />}
            label={offlineInfo.chipLabel}
            size="small"
            sx={{
              bgcolor: colors.warning.hover,
              color: colors.warning.text,
              fontWeight: 600,
              '& .MuiChip-icon': {
                color: colors.warning.text,
              },
            }}
          />
        </Box>
      </Alert>
    </Collapse>
  );
};

export default OfflineIndicator;