import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

import { Button, InfoCard } from '../../../ui';
import { useCacheOperations } from './hooks/useCacheOperations';
import { useSettingsOperations } from './hooks/useSettingsOperations';
import { CacheStatusCards } from './components/CacheStatusCards';

export const CacheManagerPanel: React.FC = () => {
  const {
    cacheStats,
    operationStatus,
    handleRefreshCache,
    handleClearCache,
    isOperationInProgress
  } = useCacheOperations();

  const { isResettingSettings, handleResetAllSettings } = useSettingsOperations();

  // Get cache-related localStorage entries (exclude app settings)
  const getCacheEntries = useMemo((): [string, { updatedAt: number; size: number }][] => {
    const entries: [string, { updatedAt: number; size: number }][] = [];
    
    if (typeof window !== 'undefined' && window.localStorage) {
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('cache_') || 
        key.includes('tranzy') || 
        key.includes('vehicle') ||
        key.includes('route') ||
        key.includes('station')
      );
      
      cacheKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          const size = value.length;
          
          // Try to get timestamp from stored data
          let updatedAt = Date.now();
          try {
            const parsed = JSON.parse(value);
            
            // Check various timestamp locations for cache data
            if (parsed.state?.lastUpdate) {
              updatedAt = new Date(parsed.state.lastUpdate).getTime();
            } else if (parsed.state?.lastApiUpdate) {
              updatedAt = new Date(parsed.state.lastApiUpdate).getTime();
            } else if (parsed.state?.lastCacheUpdate) {
              updatedAt = new Date(parsed.state.lastCacheUpdate).getTime();
            } else if (parsed.timestamp) {
              updatedAt = new Date(parsed.timestamp).getTime();
            }
          } catch {
            // Not JSON, use current time
          }
          
          entries.push([key, { updatedAt, size }]);
        }
      });
    }
    
    return entries;
  }, []);

  const getAppSettingsEntries = () => {
    const entries: [string, { updatedAt: number; size: number }][] = [];
    
    if (typeof window !== 'undefined' && window.localStorage) {
      const settingsKeys = Object.keys(localStorage).filter(key => 
        !key.startsWith('cache_') && 
        !key.includes('tranzy') && 
        !key.includes('vehicle') &&
        !key.includes('route') &&
        !key.includes('station')
      );
      
      settingsKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          const size = value.length;
          let updatedAt = Date.now();
          
          try {
            const parsed = JSON.parse(value);
            if (parsed.timestamp) {
              updatedAt = new Date(parsed.timestamp).getTime();
            }
          } catch {
            // Not JSON, use current time
          }
          
          entries.push([key, { updatedAt, size }]);
        }
      });
    }
    
    return entries;
  };

  const getOperationIcon = () => {
    switch (operationStatus.state) {
      case 'refreshing': return <SyncIcon className="animate-spin" />;
      case 'clearing': return <DeleteIcon />;
      case 'error': return <ErrorIcon />;
      default: return <CheckIcon />;
    }
  };

  const getOperationSeverity = () => {
    switch (operationStatus.state) {
      case 'error': return 'error';
      case 'refreshing':
      case 'clearing': return 'info';
      default: return 'success';
    }
  };

  const isOnline = navigator.onLine;
  const hasData = cacheStats.totalEntries > 0;
  const totalEntries = getCacheEntries.length + getAppSettingsEntries().length;

  return (
    <InfoCard
      title="Data & Storage"
      subtitle="Manage your app's data and offline capabilities"
      icon={<StorageIcon />}
    >
      <Stack spacing={3}>
        {/* Status Overview */}
        <CacheStatusCards
          isOnline={isOnline}
          totalSize={cacheStats.totalSize}
          totalEntries={totalEntries}
          hasData={hasData}
        />

        {/* Operation Status */}
        {(operationStatus.state !== 'idle' || operationStatus.message) && (
          <Alert 
            severity={getOperationSeverity()}
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
            {isOperationInProgress && <CircularProgress size={16} />}
            {getOperationIcon()}
            <Typography variant="body2">
              {operationStatus.message}
            </Typography>
          </Alert>
        )}

        {/* Offline Warning */}
        {!isOnline && (
          <Alert severity="warning">
            <Typography variant="body2">
              Cache operations require an internet connection
            </Typography>
          </Alert>
        )}

        {/* Cache Actions */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={handleRefreshCache}
            isDisabled={isOperationInProgress || !isOnline}
            startIcon={<SyncIcon />}
          >
            {operationStatus.state === 'refreshing' ? 'Refreshing...' : 'Refresh Cache'}
          </Button>
          
          <Button
            variant="outlined"
            color="warning"
            onClick={handleClearCache}
            isDisabled={isOperationInProgress || !isOnline || !hasData}
            startIcon={<DeleteIcon />}
          >
            {operationStatus.state === 'clearing' ? 'Clearing...' : 'Clear Cache'}
          </Button>
        </Box>

        {/* Settings Reset */}
        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
            Reset All Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will permanently delete all app data, settings, and cached information.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={handleResetAllSettings}
            isDisabled={isResettingSettings}
            startIcon={isResettingSettings ? <CircularProgress size={16} /> : <WarningIcon />}
          >
            {isResettingSettings ? 'Resetting...' : 'Reset All Settings'}
          </Button>
        </Box>
      </Stack>
    </InfoCard>
  );
};

export default CacheManagerPanel;