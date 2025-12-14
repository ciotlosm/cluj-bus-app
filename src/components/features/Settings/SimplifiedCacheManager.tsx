import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  alpha,
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
} from '@mui/icons-material';

import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';
import { logger } from '../../../utils/logger';
import { MaterialButton } from '../../ui/Button';
import { InfoCard } from '../../ui/Card';

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
  const theme = useTheme();

  useEffect(() => {
    getCacheStats();
    const interval = setInterval(getCacheStats, 30000);
    return () => clearInterval(interval);
  }, [getCacheStats]);

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