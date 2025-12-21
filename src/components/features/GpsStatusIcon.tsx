import type { FC } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import {
  GpsFixed,
  GpsNotFixed,
  GpsOff,
  LocationDisabled,
} from '@mui/icons-material';
import type { PermissionState, LocationAccuracy } from '../../types/location';

interface GpsStatusIconProps {
  status: 'available' | 'unavailable' | 'disabled';
  accuracy: LocationAccuracy | null;
  permissionState: PermissionState | null;
  lastUpdated: number | null;
  onClick?: () => void;
}

const getGpsVisualState = (
  status: 'available' | 'unavailable' | 'disabled',
  accuracy: LocationAccuracy | null,
  permissionState: PermissionState | null
) => {
  // Permission denied takes priority
  if (permissionState === 'denied') {
    return { icon: LocationDisabled, color: 'error' as const, tooltip: 'Location permission denied' };
  }
  
  // Disabled state
  if (status === 'disabled' || permissionState === 'disabled') {
    return { icon: LocationDisabled, color: 'error' as const, tooltip: 'Location services disabled' };
  }
  
  // Unavailable state
  if (status === 'unavailable') {
    return { icon: GpsOff, color: 'error' as const, tooltip: 'GPS signal unavailable' };
  }
  
  // Available state with accuracy levels
  if (status === 'available') {
    switch (accuracy) {
      case 'high':
        return { icon: GpsFixed, color: 'success' as const, tooltip: 'GPS available with high accuracy' };
      case 'balanced':
        return { icon: GpsFixed, color: 'warning' as const, tooltip: 'GPS available with balanced accuracy' };
      case 'low':
        return { icon: GpsNotFixed, color: 'warning' as const, tooltip: 'GPS available with low accuracy' };
    }
  }
  
  // Default fallback
  return { icon: GpsOff, color: 'error' as const, tooltip: 'GPS signal unavailable' };
};

export const GpsStatusIcon: FC<GpsStatusIconProps> = ({
  status,
  accuracy,
  permissionState,
  lastUpdated,
  onClick
}) => {
  const { icon: IconComponent, color, tooltip } = getGpsVisualState(status, accuracy, permissionState);
  
  const tooltipText = lastUpdated 
    ? `${tooltip} (Updated: ${new Date(lastUpdated).toLocaleTimeString()})`
    : tooltip;

  return (
    <Tooltip title={tooltipText} arrow>
      <IconButton
        color={color}
        onClick={onClick}
        aria-label="GPS status"
        size="small"
        sx={{
          // Smooth transition animations between states
          transition: 'all 0.3s ease-in-out',
          '& .MuiSvgIcon-root': {
            transition: 'all 0.3s ease-in-out'
          }
        }}
      >
        <IconComponent />
      </IconButton>
    </Tooltip>
  );
};