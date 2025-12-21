import type { FC } from 'react';
import { useEffect } from 'react';
import { Box } from '@mui/material';
import { GpsStatusIcon } from './GpsStatusIcon';
import { ApiStatusIcon } from './ApiStatusIcon';
import { useLocationStore } from '../../stores/locationStore';
import { useStatusStore } from '../../stores/statusStore';

interface StatusIndicatorProps {
  className?: string;
  onGpsClick?: () => void;
  onApiClick?: () => void;
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({
  className,
  onGpsClick,
  onApiClick
}) => {
  // Connect to LocationStore for GPS status
  const {
    currentPosition,
    permissionState,
    locationAccuracy,
    lastUpdated
  } = useLocationStore();

  // Connect to StatusStore for API status
  const {
    apiStatus,
    networkOnline,
    lastApiCheck,
    responseTime,
    setNetworkStatus
  } = useStatusStore();

  // Listen to browser online/offline events for immediate network status updates
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setNetworkStatus]);

  return (
    <Box 
      className={className}
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 0.5, // Small gap between icons
        // Smooth transition animations between states
        transition: 'all 0.3s ease-in-out',
        '& > *': {
          transition: 'all 0.3s ease-in-out'
        }
      }}
    >
      <GpsStatusIcon
        status={currentPosition ? 'available' : 'unavailable'}
        accuracy={locationAccuracy}
        permissionState={permissionState}
        lastUpdated={lastUpdated}
        onClick={onGpsClick}
      />
      <ApiStatusIcon
        status={apiStatus}
        networkOnline={networkOnline}
        lastCheck={lastApiCheck}
        responseTime={responseTime}
        onClick={onApiClick}
      />
    </Box>
  );
};