import type { FC } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import {
  CloudDone,
  WifiOff,
  SignalWifiConnectedNoInternet4,
} from '@mui/icons-material';

interface ApiStatusIconProps {
  status: 'online' | 'offline' | 'error';
  networkOnline: boolean;
  lastCheck: number | null;
  responseTime: number | null;
  onClick?: () => void;
}

const getApiVisualState = (
  status: 'online' | 'offline' | 'error',
  networkOnline: boolean,
  responseTime: number | null
) => {
  // Network offline takes priority
  if (!networkOnline) {
    return { 
      icon: WifiOff, 
      color: 'error' as const, 
      tooltip: 'No internet connection' 
    };
  }
  
  // Network online but API unreachable
  if (status === 'error') {
    return { 
      icon: CloudDone, 
      color: 'error' as const, 
      tooltip: 'API service unavailable' 
    };
  }
  
  // Network offline status (detected by API)
  if (status === 'offline') {
    return { 
      icon: SignalWifiConnectedNoInternet4, 
      color: 'error' as const, 
      tooltip: 'Connected to network but no internet access' 
    };
  }
  
  // Online status with response time consideration
  if (status === 'online') {
    if (responseTime && responseTime > 2000) {
      return { 
        icon: CloudDone, 
        color: 'warning' as const, 
        tooltip: 'API connected but responding slowly' 
      };
    }
    return { 
      icon: CloudDone, 
      color: 'success' as const, 
      tooltip: 'API connected and responding quickly' 
    };
  }
  
  // Default fallback
  return { 
    icon: WifiOff, 
    color: 'error' as const, 
    tooltip: 'Connection status unknown' 
  };
};

export const ApiStatusIcon: FC<ApiStatusIconProps> = ({
  status,
  networkOnline,
  lastCheck,
  responseTime,
  onClick
}) => {
  const { icon: IconComponent, color, tooltip } = getApiVisualState(status, networkOnline, responseTime);
  
  // Build detailed tooltip with timing and response info
  let tooltipText = tooltip;
  
  if (lastCheck) {
    const lastCheckTime = new Date(lastCheck).toLocaleTimeString();
    tooltipText += ` (Last check: ${lastCheckTime})`;
  }
  
  if (responseTime && status === 'online') {
    tooltipText += ` - ${responseTime}ms`;
  }

  return (
    <Tooltip title={tooltipText} arrow>
      <IconButton
        color={color}
        onClick={onClick}
        aria-label="API connectivity status"
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