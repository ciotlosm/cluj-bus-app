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
  showGpsDetails?: boolean; // Only control whether to show detailed popup
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({
  className,
  showGpsDetails = false // Default to false - only show details in settings
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

  // Handle GPS icon click - always request location, optionally show details
  const handleGpsClick = () => {
    // Always request fresh location (no caching, browser handles fallback)
    requestLocation();
    
    // Only show detailed popup in settings view
    if (showGpsDetails) {
      setDialogType('gps');
      setDialogOpen(true);
    }
  };

  // Handle API icon click - show detailed connection info
  const handleApiClick = () => {
    setDialogType('api');
    setDialogOpen(true);
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
        data-testid="status-indicator"
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