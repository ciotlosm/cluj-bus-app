import React from 'react';
import {
  Box,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Wifi as OnlineIcon,
  WifiOff as OfflineIcon,
  GpsFixed as GpsIcon,
  GpsOff as GpsDisabledIcon,
} from '@mui/icons-material';

import { useVehicleStore } from '../../../stores/vehicleStore';
import { useLocationStore } from '../../../stores/locationStore';
import { useStoreEvents, StoreEvents } from '../../../stores/shared/storeEvents';
import { useThemeUtils, useMuiUtils } from '../../../hooks';

interface StatusIndicatorsProps {
  compact?: boolean;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ compact = false }) => {
  // Get initial state from stores
  const { error: initialError, lastUpdate: initialLastUpdate } = useVehicleStore();
  const { currentLocation: initialLocation, locationPermission: initialPermission } = useLocationStore();
  
  // Use local state to track changes via events
  const [vehicleState, setVehicleState] = React.useState({
    error: initialError,
    lastUpdate: initialLastUpdate
  });
  
  const [locationState, setLocationState] = React.useState({
    currentLocation: initialLocation,
    locationPermission: initialPermission
  });
  
  const isOnline = navigator.onLine;
  const isApiOnline = !vehicleState.error || vehicleState.error.type !== 'network';
  const lastApiError = vehicleState.error?.timestamp;
  const lastApiSuccess = vehicleState.lastUpdate;
  
  // Subscribe to store events instead of direct store access
  useStoreEvents([
    {
      event: StoreEvents.VEHICLES_UPDATED,
      handler: React.useCallback((data: any) => {
        setVehicleState(prev => ({
          ...prev,
          lastUpdate: data.timestamp,
          error: null // Clear error on successful update
        }));
      }, [])
    },
    {
      event: StoreEvents.LOCATION_CHANGED,
      handler: React.useCallback((data: any) => {
        setLocationState(prev => ({
          ...prev,
          currentLocation: data.location
        }));
      }, [])
    }
  ], []);
  const { getStatusColors, alpha } = useThemeUtils();
  const { getStatusIndicatorStyles } = useMuiUtils();
  
  const statusColors = getStatusColors();

  const getLocationStatus = () => {
    // GPS denied - red GPS isDisabled icon
    if (locationState.locationPermission === 'denied') {
      return {
        icon: <GpsDisabledIcon sx={{ fontSize: 16 }} />,
        label: 'OFF',
        color: statusColors.error.main,
        bgColor: statusColors.error.light,
        tooltip: 'GPS access denied.',
      };
    }
    
    // GPS active with location data
    if (locationState.currentLocation) {
      const accuracy = locationState.currentLocation.accuracy;
      let color: string, bgColor: string, tooltip: string, label: string;
      
      if (accuracy && accuracy <= 20) {
        // High accuracy (≤20m) - green GPS fixed
        color = statusColors.success.main;
        bgColor = statusColors.success.light;
        label = `${accuracy.toFixed(0)}m`;
        tooltip = `GPS active with high accuracy (±${accuracy.toFixed(0)}m)`;
      } else if (accuracy && accuracy <= 100) {
        // Medium accuracy (21-100m) - yellow GPS fixed
        color = statusColors.warning.main;
        bgColor = statusColors.warning.light;
        label = `${accuracy.toFixed(0)}m`;
        tooltip = `GPS active with low accuracy (±${accuracy.toFixed(0)}m)`;
      } else {
        // Unknown or poor accuracy - yellow GPS not fixed
        color = statusColors.warning.main;
        bgColor = statusColors.warning.light;
        label = accuracy ? `${accuracy.toFixed(0)}m` : '?';
        tooltip = accuracy 
          ? `GPS active with poor accuracy (±${accuracy.toFixed(0)}m)`
          : 'GPS active (accuracy unknown)';
      }
      
      return {
        icon: <GpsIcon sx={{ fontSize: 16 }} />,
        label,
        color,
        bgColor,
        tooltip,
      };
    }
    
    // No GPS location - red GPS isDisabled
    return {
      icon: <GpsDisabledIcon sx={{ fontSize: 16 }} />,
      label: 'OFF',
      color: statusColors.error.main,
      bgColor: statusColors.error.light,
      tooltip: 'GPS location not available.',
    };
  };

  const getConnectivityStatus = () => {
    // Show API connectivity status, not just network status
    if (isApiOnline && isOnline) {
      const lastSuccessTime = lastApiSuccess ? new Date(lastApiSuccess).toLocaleTimeString() : 'unknown';
      return {
        icon: <OnlineIcon sx={{ fontSize: 16 }} />,
        label: 'ON',
        color: statusColors.success.main,
        bgColor: statusColors.success.light,
        tooltip: `API connection active. Real-time data available. Last success: ${lastSuccessTime}`,
      };
    }
    
    if (!isOnline) {
      return {
        icon: <OfflineIcon sx={{ fontSize: 16 }} />,
        label: 'OFF',
        color: statusColors.error.main,
        bgColor: statusColors.error.light,
        tooltip: 'No internet connection. Showing cached data only.',
      };
    }
    
    // Network is online but API is not accessible
    const lastErrorTime = lastApiError ? new Date(lastApiError).toLocaleTimeString() : 'unknown';
    return {
      icon: <OfflineIcon sx={{ fontSize: 16 }} />,
      label: 'ERR',
      color: statusColors.error.main,
      bgColor: statusColors.error.light,
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
        <Box
          sx={{
            ...getStatusIndicatorStyles(
              isApiOnline && isOnline ? 'success' : 'error',
              compact
            ),
            bgcolor: connectivityStatus.bgColor,
            border: `1px solid ${alpha(connectivityStatus.color, 0.3)}`,
            color: connectivityStatus.color,
          }}
        >
          {connectivityStatus.icon}
          <Box
            component="span"
            sx={{
              fontSize: compact ? '0.7rem' : '0.75rem',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {connectivityStatus.label}
          </Box>
        </Box>
      </Tooltip>

      {/* GPS Location Status */}
      <Tooltip title={locationStatus.tooltip} arrow>
        <Box
          sx={{
            ...getStatusIndicatorStyles(
              locationState.locationPermission === 'denied' ? 'error' : 
              locationState.currentLocation ? 'success' : 'error',
              compact
            ),
            bgcolor: locationStatus.bgColor,
            border: `1px solid ${alpha(locationStatus.color, 0.3)}`,
            color: locationStatus.color,
          }}
        >
          {locationStatus.icon}
          <Box
            component="span"
            sx={{
              fontSize: compact ? '0.7rem' : '0.75rem',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {locationStatus.label}
          </Box>
        </Box>
      </Tooltip>
    </Stack>
  );
};

export default StatusIndicators;