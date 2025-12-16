import React from 'react';
import {
  Box,
  Chip,
  Stack,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Wifi as OnlineIcon,
  WifiOff as OfflineIcon,
  LocationOn as LocationOnIcon,
  LocationOff as LocationOffIcon,
  LocationDisabled as LocationDisabledIcon,
} from '@mui/icons-material';

import { useOfflineStore } from '../../../stores/offlineStore';
import { useLocationStore } from '../../../stores/locationStore';

interface StatusIndicatorsProps {
  compact?: boolean;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ compact = false }) => {
  const { isOnline, isApiOnline, lastApiError, lastApiSuccess } = useOfflineStore();
  const { currentLocation, locationPermission } = useLocationStore();
  const theme = useTheme();

  const getLocationStatus = () => {
    if (locationPermission === 'denied') {
      return {
        icon: <LocationDisabledIcon sx={{ fontSize: 16 }} />,
        label: compact ? 'GPS Off' : 'GPS Disabled',
        color: theme.palette.error.main,
        bgColor: alpha(theme.palette.error.main, 0.1),
        tooltip: 'GPS access denied.',
      };
    }
    
    if (currentLocation) {
      return {
        icon: <LocationOnIcon sx={{ fontSize: 16 }} />,
        label: compact ? 'GPS On' : 'GPS Active',
        color: theme.palette.success.main,
        bgColor: alpha(theme.palette.success.main, 0.1),
        tooltip: `GPS location available: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`,
      };
    }
    
    return {
      icon: <LocationOffIcon sx={{ fontSize: 16 }} />,
      label: compact ? 'No GPS' : 'GPS Inactive',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1),
      tooltip: 'GPS location not available.',
    };
  };

  const getConnectivityStatus = () => {
    // Show API connectivity status, not just network status
    if (isApiOnline && isOnline) {
      const lastSuccessTime = lastApiSuccess ? new Date(lastApiSuccess).toLocaleTimeString() : 'unknown';
      return {
        icon: <OnlineIcon sx={{ fontSize: 16 }} />,
        label: compact ? 'Online' : 'Connected',
        color: theme.palette.success.main,
        bgColor: alpha(theme.palette.success.main, 0.1),
        tooltip: `API connection active. Real-time data available. Last success: ${lastSuccessTime}`,
      };
    }
    
    if (!isOnline) {
      return {
        icon: <OfflineIcon sx={{ fontSize: 16 }} />,
        label: compact ? 'Offline' : 'No Internet',
        color: theme.palette.error.main,
        bgColor: alpha(theme.palette.error.main, 0.1),
        tooltip: 'No internet connection. Showing cached data only.',
      };
    }
    
    // Network is online but API is not accessible
    const lastErrorTime = lastApiError ? new Date(lastApiError).toLocaleTimeString() : 'unknown';
    return {
      icon: <OfflineIcon sx={{ fontSize: 16 }} />,
      label: compact ? 'API Error' : 'API Unavailable',
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.1),
      tooltip: `Network connected but API unavailable. Check API key or service status. Last error: ${lastErrorTime}`,
    };
  };

  const connectivityStatus = getConnectivityStatus();
  const locationStatus = getLocationStatus();

  return (
    <Stack 
      direction="row" 
      spacing={compact ? 0.5 : 1} 
      alignItems="center"
    >
      {/* Connectivity Status */}
      <Tooltip title={connectivityStatus.tooltip} arrow>
        <Chip
          icon={connectivityStatus.icon}
          label={connectivityStatus.label}
          size={compact ? 'small' : 'medium'}
          sx={{
            bgcolor: connectivityStatus.bgColor,
            color: connectivityStatus.color,
            border: `1px solid ${alpha(connectivityStatus.color, 0.3)}`,
            fontWeight: 600,
            fontSize: compact ? '0.7rem' : '0.75rem',
            height: compact ? 24 : 32,
            '& .MuiChip-icon': {
              color: connectivityStatus.color,
            },
            '& .MuiChip-label': {
              px: compact ? 0.5 : 1,
            },
          }}
        />
      </Tooltip>

      {/* GPS Location Status */}
      <Tooltip title={locationStatus.tooltip} arrow>
        <Chip
          icon={locationStatus.icon}
          label={locationStatus.label}
          size={compact ? 'small' : 'medium'}
          sx={{
            bgcolor: locationStatus.bgColor,
            color: locationStatus.color,
            border: `1px solid ${alpha(locationStatus.color, 0.3)}`,
            fontWeight: 600,
            fontSize: compact ? '0.7rem' : '0.75rem',
            height: compact ? 24 : 32,
            '& .MuiChip-icon': {
              color: locationStatus.color,
            },
            '& .MuiChip-label': {
              px: compact ? 0.5 : 1,
            },
          }}
        />
      </Tooltip>
    </Stack>
  );
};

export default StatusIndicators;