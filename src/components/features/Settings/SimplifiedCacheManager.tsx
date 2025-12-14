import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  CloudSync as CloudSyncIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon,
  SystemUpdate as UpdateIcon,
  RestartAlt as RestartIcon,
} from '@mui/icons-material';

import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';
import { logger } from '../../../utils/loggerFixed';
import { MaterialButton } from '../../ui/Button';
import { InfoCard } from '../../ui/Card';
import { appVersionService, type VersionInfo } from '../../../services/appVersionService';

export const SimplifiedCacheManager: React.FC = () => {
  const {
    cacheStats,
    getCacheStats,
    clearCache,
    forceRefreshAll,
    refreshLiveData,
  } = useEnhancedBusStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);

  useEffect(() => {
    getCacheStats();
    loadVersionInfo();
    const interval = setInterval(getCacheStats, 30000);
    return () => clearInterval(interval);
  }, [getCacheStats]);

  const loadVersionInfo = async () => {
    try {
      const info = await appVersionService.getVersionInfo();
      setVersionInfo(info);
    } catch (error) {
      logger.error('Failed to load version info', { error }, 'VERSION_CHECK');
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setLastAction('Refreshing data...');
    try {
      await refreshLiveData();
      setLastAction('Data refreshed successfully');
      logger.info('Data refresh completed from simplified UI', {}, 'CACHE_MGMT');
    } catch (error) {
      setLastAction('Refresh failed');
      logger.error('Data refresh failed from simplified UI', { error }, 'CACHE_MGMT');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setLastAction('');
      }, 2000);
    }
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    setLastAction('Downloading fresh data...');
    try {
      await forceRefreshAll();
      setLastAction('All data updated');
      logger.info('Force refresh completed from simplified UI', {}, 'CACHE_MGMT');
    } catch (error) {
      setLastAction('Update failed');
      logger.error('Force refresh failed from simplified UI', { error }, 'CACHE_MGMT');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setLastAction('');
      }, 2000);
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all cached data? You\'ll need internet to reload everything.')) {
      clearCache();
      setLastAction('Cache cleared');
      logger.info('Cache cleared from simplified UI', {}, 'CACHE_MGMT');
      setTimeout(() => setLastAction(''), 2000);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingVersion(true);
    setLastAction('Checking for updates...');
    try {
      const info = await appVersionService.checkForUpdates();
      setVersionInfo(info);
      
      if (info.isUpdateAvailable) {
        setLastAction('Update available!');
      } else {
        setLastAction('App is up to date');
      }
      
      logger.info('Version check completed', { versionInfo: info }, 'VERSION_CHECK');
    } catch (error) {
      setLastAction('Update check failed');
      logger.error('Version check failed', { error }, 'VERSION_CHECK');
    } finally {
      setTimeout(() => {
        setIsCheckingVersion(false);
        setLastAction('');
      }, 3000);
    }
  };

  const handleRefreshApp = async () => {
    if (!confirm('This will refresh the app and clear all cached data. Continue?')) {
      return;
    }

    setIsRefreshing(true);
    setLastAction('Refreshing app...');
    try {
      await appVersionService.refreshApp();
      // App will reload, so this won't execute
    } catch (error) {
      setLastAction('App refresh failed');
      logger.error('App refresh failed', { error }, 'APP_REFRESH');
      setTimeout(() => {
        setIsRefreshing(false);
        setLastAction('');
      }, 3000);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatAge = (timestamp?: Date): string => {
    if (!timestamp) return 'Never';
    const age = Date.now() - timestamp.getTime();
    const minutes = Math.floor(age / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const isOnline = navigator.onLine;
  const hasData = cacheStats.totalEntries > 0;

  return (
    <InfoCard
      title="Data & Storage"
      subtitle="Manage your app's data and offline capabilities"
      icon={<StorageIcon />}
    >
      <Stack spacing={3}>
        {/* Status Overview */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
          gap: 2 
        }}>
          <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              {isOnline ? (
                <OnlineIcon color="success" />
              ) : (
                <OfflineIcon color="warning" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Connection
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isOnline ? 'Online' : 'Offline'}
            </Typography>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <StorageIcon color="primary" />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Cached Data
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatBytes(cacheStats.totalSize)}
            </Typography>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <CheckIcon color="info" />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Routes Saved
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {cacheStats.totalEntries}
            </Typography>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <RefreshIcon color="secondary" />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Last Update
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatAge(cacheStats.lastRefresh)}
            </Typography>
          </Card>
        </Box>

        {/* Action Status */}
        {(isRefreshing || lastAction) && (
          <Alert 
            severity={lastAction.includes('failed') ? 'error' : 'info'}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              '& .MuiAlert-message': { 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                width: '100%'
              }
            }}
          >
            {isRefreshing && <CircularProgress size={16} />}
            <Typography variant="body2">
              {lastAction || 'Processing...'}
            </Typography>
          </Alert>
        )}

        {/* Quick Actions */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Quick Actions
          </Typography>
          
          <Stack spacing={2}>
            <MaterialButton
              variant="filled"
              color="primary"
              onClick={handleRefreshData}
              disabled={isRefreshing || !isOnline}
              icon={<RefreshIcon />}
              fullWidth
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Bus Data'}
            </MaterialButton>
            
            <MaterialButton
              variant="outlined"
              color="secondary"
              onClick={handleForceRefresh}
              disabled={isRefreshing || !isOnline}
              icon={<CloudSyncIcon />}
              fullWidth
            >
              {isRefreshing ? 'Updating...' : 'Download Fresh Data'}
            </MaterialButton>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* App Version & Updates */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            App Version & Updates
          </Typography>
          
          {/* Version Info */}
          {versionInfo && (
            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    App Version
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {versionInfo.current}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Service Worker
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {versionInfo.serviceWorker}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Checked
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatAge(versionInfo.lastChecked)}
                  </Typography>
                </Box>
                
                {versionInfo.isUpdateAvailable && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Update Available!
                    </Typography>
                    <Typography variant="body2">
                      A new version of the app is ready to install.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </Card>
          )}
          
          <Stack spacing={2}>
            <MaterialButton
              variant="outlined"
              color="info"
              onClick={handleCheckForUpdates}
              disabled={isCheckingVersion || isRefreshing}
              icon={<UpdateIcon />}
              fullWidth
            >
              {isCheckingVersion ? 'Checking...' : 'Check for Updates'}
            </MaterialButton>
            
            {versionInfo?.isUpdateAvailable && (
              <MaterialButton
                variant="filled"
                color="success"
                onClick={handleRefreshApp}
                disabled={isRefreshing || isCheckingVersion}
                icon={<RestartIcon />}
                fullWidth
              >
                {isRefreshing ? 'Refreshing...' : 'Install Update & Restart'}
              </MaterialButton>
            )}
          </Stack>
        </Box>

        {/* Offline Info */}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            How Offline Mode Works
          </Typography>
          <Stack spacing={0.5}>
            <Typography variant="body2">
              • <strong>Routes & Stops:</strong> Saved for offline use
            </Typography>
            <Typography variant="body2">
              • <strong>Live Tracking:</strong> Shows last known positions when offline
            </Typography>
            <Typography variant="body2">
              • <strong>Schedules:</strong> Available offline with cached timetables
            </Typography>
          </Stack>
        </Alert>

        {/* Clear Cache - Danger Zone */}
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon fontSize="small" />
              Clear All Data
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Remove all cached data. You'll need internet to reload everything.
            </Typography>
            <MaterialButton
              variant="outlined"
              color="error"
              onClick={handleClearCache}
              disabled={isRefreshing || !hasData}
              icon={<DeleteIcon />}
              size="small"
            >
              Clear Cache
            </MaterialButton>
          </Box>
        </Alert>
      </Stack>
    </InfoCard>
  );
};