import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudDownload as UpdateIcon,
} from '@mui/icons-material';

import { serviceWorkerManager } from '../../../utils/shared/serviceWorkerManager';
import { logger } from '../../../utils/shared/logger';

export const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDevelopment] = useState(() => 
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  );

  useEffect(() => {
    // Listen for service worker updates
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      logger.info('App update available');
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // In development, also check for updates more aggressively
    if (isDevelopment) {
      const checkForUpdates = async () => {
        try {
          const hasUpdate = await serviceWorkerManager.checkForUpdates();
          if (hasUpdate) {
            setUpdateAvailable(true);
          }
        } catch (error) {
          logger.debug('Update check failed:', error);
        }
      };

      // Check immediately and then every 5 seconds in development
      checkForUpdates();
      const interval = setInterval(checkForUpdates, 5000);

      return () => {
        window.removeEventListener('sw-update-available', handleUpdateAvailable);
        clearInterval(interval);
      };
    }

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, [isDevelopment]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await serviceWorkerManager.forceUpdate();
    } catch (error) {
      logger.error('Failed to update app:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <Snackbar
      open={updateAvailable}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ 
        top: { xs: 80, sm: 24 }, // Account for mobile header
        zIndex: (theme) => theme.zIndex.snackbar + 1
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          width: '100%',
          maxWidth: 400,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleDismiss}
              disabled={isUpdating}
            >
              Later
            </Button>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={handleUpdate}
              disabled={isUpdating}
              startIcon={
                isUpdating ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RefreshIcon />
                )
              }
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </Box>
        }
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            <UpdateIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            App Update Available
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            A new version is ready. Update now for the latest features and fixes.
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default UpdateNotification;