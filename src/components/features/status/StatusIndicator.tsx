import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { GpsStatusIcon } from './GpsStatusIcon';
import { ApiStatusIcon } from './ApiStatusIcon';
import { StatusDetailDialog } from './StatusDetailDialog';
import { useLocationStore } from '../../../stores/locationStore';
import { useStatusStore } from '../../../stores/statusStore';

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
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'gps' | 'api'>('gps');

  // Connect to LocationStore for GPS status
  const {
    currentPosition,
    permissionState,
    locationAccuracy,
    lastUpdated,
    requestLocation
  } = useLocationStore();

  // Connect to StatusStore for API status
  const {
    apiStatus,
    networkOnline,
    lastApiCheck,
    responseTime,
    setNetworkStatus
  } = useStatusStore();

  // Handle GPS icon click - show detailed info and request location if needed
  const handleGpsClick = () => {
    setDialogType('gps');
    setDialogOpen(true);
    
    // Also request location if it's not available
    if (!currentPosition) {
      requestLocation();
    }
    
    onGpsClick?.(); // Call parent handler if provided
  };

  // Handle API icon click - show detailed connection info
  const handleApiClick = () => {
    setDialogType('api');
    setDialogOpen(true);
    onApiClick?.(); // Call parent handler if provided
  };

  // Handle dialog close with proper focus management
  const handleDialogClose = () => {
    setDialogOpen(false);
    // Let the dialog handle focus restoration naturally
  };

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
    <>
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
          onClick={handleGpsClick}
        />
        <ApiStatusIcon
          status={apiStatus}
          networkOnline={networkOnline}
          lastCheck={lastApiCheck}
          responseTime={responseTime}
          onClick={handleApiClick}
        />
      </Box>

      <StatusDetailDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        type={dialogType}
        gpsState={{
          status: currentPosition ? 'available' : 'unavailable',
          accuracy: locationAccuracy,
          permissionState,
          lastUpdated
        }}
        apiState={{
          status: apiStatus,
          networkOnline,
          lastCheck: lastApiCheck,
          responseTime
        }}
      />
    </>
  );
};