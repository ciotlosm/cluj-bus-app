import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
  Error as ErrorIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

import { useUnifiedCacheManager } from '../../../hooks/shared/useUnifiedCacheManager';
import { StoreErrorHandler, ErrorUtils } from '../../../stores/shared/errorHandler';
import { logger } from '../../../utils/shared/logger';
import { Button, InfoCard } from '../../ui';

type CacheOperationState = 'idle' | 'refreshing' | 'clearing' | 'error';
type CacheError = 'network' | 'inconsistent' | 'storage' | 'unknown';

interface CacheOperationStatus {
  state: CacheOperationState;
  error?: CacheError;
  message: string;
}

export const CacheManagerPanel: React.FC = () => {
  const {
    getCacheStats,
    clearCache,
    refreshCache,
    forceRefreshAll,
    isRefreshing,
    isClearing,
    error: cacheError
  } = useUnifiedCacheManager();

  const cacheStats = getCacheStats();

  const [operationStatus, setOperationStatus] = useState<CacheOperationStatus>({
    state: isRefreshing ? 'refreshing' : isClearing ? 'clearing' : 'idle',
    message: cacheError || ''
  });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isResettingSettings, setIsResettingSettings] = useState(false);

  // Update operation status based on modern cache manager state
  useEffect(() => {
    if (isRefreshing) {
      setOperationStatus({ state: 'refreshing', message: 'Refreshing cached data...' });
    } else if (isClearing) {
      setOperationStatus({ state: 'clearing', message: 'Clearing all cached data...' });
    } else if (cacheError) {
      setOperationStatus({ state: 'error', message: cacheError });
    } else {
      setOperationStatus({ state: 'idle', message: '' });
    }
  }, [isRefreshing, isClearing, cacheError]);

  const handleRefreshCache = async () => {
    if (!navigator.onLine) {
      setOperationStatus({
        state: 'error',
        error: 'network',
        message: 'Cannot refresh cache while offline'
      });
      return;
    }

    try {
      await refreshCache();
      // Force component re-render to update timestamps
      setRefreshTrigger(prev => prev + 1);
      setOperationStatus({ 
        state: 'idle', 
        message: 'Cache refreshed successfully' 
      });
      logger.info('Cache refresh completed from settings', {}, 'CACHE_MGMT');
    } catch (error: any) {
      // Use standardized error handler to classify and format error
      const errorState = StoreErrorHandler.createError(error, {
        storeName: 'CacheManagerPanel',
        operation: 'refreshCache',
        timestamp: new Date(),
        metadata: { isOnline: navigator.onLine },
      });

      // Map standardized error types to cache-specific error types
      let cacheErrorType: CacheError = 'unknown';
      switch (errorState.type) {
        case 'network':
          cacheErrorType = 'network';
          break;
        case 'parsing':
          cacheErrorType = 'inconsistent';
          break;
        case 'noData':
        case 'partial':
          cacheErrorType = 'storage';
          break;
        default:
          cacheErrorType = 'unknown';
      }

      setOperationStatus({
        state: 'error',
        error: cacheErrorType,
        message: errorState.message
      });
      
      logger.error('Cache refresh failed from settings', { error, errorType: errorState.type }, 'CACHE_MGMT');
    } finally {
      setTimeout(() => {
        if (operationStatus.state !== 'error') {
          setOperationStatus({ state: 'idle', message: '' });
        }
      }, 3000);
    }
  };

  const handleClearCache = async () => {
    if (!navigator.onLine) {
      setOperationStatus({
        state: 'error',
        error: 'network',
        message: 'Cannot clear cache while offline - you need internet to reload data'
      });
      return;
    }

    const confirmed = confirm(
      'Clear all cached data?\n\n' +
      '• All cached Tranzy API data will be removed\n' +
      '• Routes, stops, and live vehicle data will be re-downloaded\n' +
      '• This requires a stable internet connection\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      await clearCache();
      // Force component re-render to update cache stats
      setRefreshTrigger(prev => prev + 1);
      setOperationStatus({ 
        state: 'idle', 
        message: 'Cache cleared successfully' 
      });
      logger.info('Cache cleared from settings', {}, 'CACHE_MGMT');
    } catch (error: any) {
      // Use standardized error handler to classify and format error
      const errorState = StoreErrorHandler.createError(error, {
        storeName: 'CacheManagerPanel',
        operation: 'clearCache',
        timestamp: new Date(),
        metadata: { isOnline: navigator.onLine },
      });

      // Map to cache-specific error type
      const cacheErrorType: CacheError = errorState.type === 'network' ? 'network' : 'storage';

      setOperationStatus({
        state: 'error',
        error: cacheErrorType,
        message: errorState.message
      });
      
      logger.error('Cache clear failed from settings', { error, errorType: errorState.type }, 'CACHE_MGMT');
    } finally {
      setTimeout(() => {
        if (operationStatus.state !== 'error') {
          setOperationStatus({ state: 'idle', message: '' });
        }
      }, 3000);
    }
  };

  const handleResetAllSettings = async () => {
    const confirmed = confirm(
      'Reset All App Settings?\n\n' +
      'This will permanently delete:\n' +
      '• All favorite routes and stops\n' +
      '• App configuration (API key, locations)\n' +
      '• Theme preferences\n\n' +
      'You will need to reconfigure the app from scratch.\n\n' +
      'This action cannot be undone. Continue?'
    );

    if (!confirmed) return;

    setIsResettingSettings(true);
    
    try {
      // Delete all app settings from localStorage
      const settingsKeys = ['favorites', 'config', 'theme'];
      settingsKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Force refresh to update the UI
      setRefreshTrigger(prev => prev + 1);
      
      setOperationStatus({
        state: 'idle',
        message: 'All app settings have been reset'
      });
      
      logger.info('All app settings reset from cache manager', { deletedKeys: settingsKeys }, 'SETTINGS');
      
      // Show success message briefly
      setTimeout(() => {
        setOperationStatus({ state: 'idle', message: '' });
      }, 3000);
      
    } catch (error: any) {
      setOperationStatus({
        state: 'error',
        error: 'storage',
        message: 'Failed to reset app settings'
      });
      
      logger.error('Failed to reset app settings', { error }, 'SETTINGS');
    } finally {
      setIsResettingSettings(false);
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
    const seconds = Math.floor(age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds} seconds`;
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const formatAgeFromTimestamp = (timestamp: number): string => {
    const age = Date.now() - timestamp;
    const seconds = Math.floor(age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds} seconds`;
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const getCacheTypeDisplayName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'routes': 'Bus Routes',
      'stops': 'Bus Stops', 
      'vehicles': 'Live Vehicle Data',
      'stop_times': 'Schedule Data',
      'agencies': 'Transit Agencies',
      'shapes': 'Route Shapes',
      'favorites': 'Favorite Routes'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatCacheKey = (key: string): string => {
    // Handle GPS coordinate patterns like "46.7698,23.5870-46.7388,23.5712"
    const gpsPattern = /^(\d+\.\d+),(\d+\.\d+)-(\d+\.\d+),(\d+\.\d+)$/;
    if (gpsPattern.test(key)) {
      return 'GPS Coordinates (Bounding Box)';
    }
    
    // Handle other coordinate patterns
    const coordPattern = /^\d+\.\d+,\d+\.\d+/;
    if (coordPattern.test(key)) {
      return 'GPS Coordinates';
    }
    
    // Handle transit estimates with coordinates
    if (key.includes('transit:') && key.includes(',')) {
      return 'Transit Route Estimate';
    }
    
    // Return the original key for other cases
    return key;
  };

  const getOperationIcon = () => {
    switch (operationStatus.state) {
      case 'refreshing': return <SyncIcon className="animate-spin" />;
      case 'clearing': return <DeleteIcon />;
      case 'error': return <ErrorIcon />;
      default: return null;
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
  const isOperationInProgress = operationStatus.state === 'refreshing' || operationStatus.state === 'clearing';

  // Get cache-related localStorage entries (exclude app settings)
  const getCacheEntries = useMemo((): [string, { updatedAt: number; size: number }][] => {
    const entries: [string, { updatedAt: number; size: number }][] = [];
    const appSettingsKeys = ['favorites', 'config', 'theme'];
    
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !appSettingsKeys.includes(key)) {
          try {
            const value = localStorage.getItem(key);
            const size = value ? value.length : 0;
            
            // Try to get timestamp from stored data
            let updatedAt = Date.now();
            try {
              const parsed = JSON.parse(value || '{}');
              
              // Check various timestamp locations in the stored data
              if (parsed.state?.lastUpdate) {
                updatedAt = new Date(parsed.state.lastUpdate).getTime();
              } else if (parsed.state?.lastApiUpdate) {
                updatedAt = new Date(parsed.state.lastApiUpdate).getTime();
              } else if (parsed.state?.lastCacheUpdate) {
                updatedAt = new Date(parsed.state.lastCacheUpdate).getTime();
              } else if (Array.isArray(parsed) && parsed.length > 0) {
                // For cache arrays, check if entries have timestamps
                const firstEntry = parsed[0];
                if (firstEntry && typeof firstEntry === 'object' && firstEntry[1]?.timestamp) {
                  updatedAt = firstEntry[1].timestamp;
                } else if (firstEntry && typeof firstEntry === 'object' && firstEntry[1]?.updatedAt) {
                  updatedAt = firstEntry[1].updatedAt;
                }
              } else if (parsed.version || parsed.timestamp) {
                // For other cache entries, use current time as they're actively managed
                updatedAt = Date.now();
              }
            } catch {
              // Not JSON, use current time
            }
            
            entries.push([key, { updatedAt, size }]);
          } catch (error) {
            // Skip entries that can't be read
          }
        }
      }
    }
    
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }, [refreshTrigger]); // Re-calculate when refreshTrigger changes

  // Get app settings entries (favorites, config, and theme)
  const getAppSettingsEntries = (): [string, { updatedAt: number; size: number }][] => {
    const entries: [string, { updatedAt: number; size: number }][] = [];
    const settingsKeys = ['favorites', 'config', 'theme'];
    
    if (typeof window !== 'undefined') {
      settingsKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          const size = value.length;
          
          // Try to get timestamp from stored data
          let updatedAt = Date.now();
          try {
            const parsed = JSON.parse(value);
            
            // Check various timestamp locations for app settings
            if (parsed.state?.lastUpdate) {
              updatedAt = new Date(parsed.state.lastUpdate).getTime();
            } else if (parsed.state?.lastApiUpdate) {
              updatedAt = new Date(parsed.state.lastApiUpdate).getTime();
            } else if (parsed.state?.lastCacheUpdate) {
              updatedAt = new Date(parsed.state.lastCacheUpdate).getTime();
            } else if (parsed.version || parsed.timestamp) {
              // For settings with version info, use current time
              updatedAt = Date.now();
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
              Total Entries
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {getCacheEntries.length + getAppSettingsEntries().length}
            </Typography>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <RefreshIcon color="secondary" />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Cache Status
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {getCacheEntries.length > 0 ? 'Active' : 'Empty'}
            </Typography>
          </Card>
        </Box>

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



        {/* Cache Data Section */}
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 3, pb: 2, backgroundColor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StorageIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Cache Data ({getCacheEntries.length} entries)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    API cache and temporary data • {formatBytes(getCacheEntries.reduce((total, [, data]) => total + data.size, 0))}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                onClick={handleRefreshCache}
                isDisabled={isOperationInProgress || !isOnline}
                startIcon={<RefreshIcon />}
              >
                {operationStatus.state === 'refreshing' ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>
            
            {!isOnline && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  Cache operations require an internet connection
                </Typography>
              </Alert>
            )}
          </Box>
          
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: 'background.paper', fontWeight: 600 }}>localStorage Key</TableCell>
                  <TableCell align="right" sx={{ backgroundColor: 'background.paper', fontWeight: 600 }}>Last Update</TableCell>
                  <TableCell align="right" sx={{ backgroundColor: 'background.paper', fontWeight: 600 }}>Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getCacheEntries.map(([key, data]) => (
                  <TableRow key={key} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {key}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {formatAgeFromTimestamp(data.updatedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {formatBytes(data.size)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* App Settings Section */}
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 3, pb: 2, backgroundColor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    App Settings ({getAppSettingsEntries().length} entries)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    User preferences and configuration • {formatBytes(getAppSettingsEntries().reduce((total, [, data]) => total + data.size, 0))}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                color="error"
                onClick={handleResetAllSettings}
                isDisabled={isResettingSettings || getAppSettingsEntries().length === 0}
                startIcon={<DeleteIcon />}
              >
                {isResettingSettings ? 'Resetting...' : 'Reset All'}
              </Button>
            </Box>
            
            {getAppSettingsEntries().length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  No app settings found. Configure the app to see settings here.
                </Typography>
              </Alert>
            )}
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: 'background.paper', fontWeight: 600 }}>Setting</TableCell>
                  <TableCell align="right" sx={{ backgroundColor: 'background.paper', fontWeight: 600 }}>Last Update</TableCell>
                  <TableCell align="right" sx={{ backgroundColor: 'background.paper', fontWeight: 600 }}>Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getAppSettingsEntries().map(([key, data]) => (
                  <TableRow key={key} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {key}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {formatAgeFromTimestamp(data.updatedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {formatBytes(data.size)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
          </TableContainer>
        </Card>





        {/* Clear Cache - Danger Zone */}
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon fontSize="small" />
              Clear All Cached Data
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              This will remove all cached data including routes, stops, and live vehicle information. 
              A stable internet connection is required to reload everything.
            </Typography>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                • {formatBytes(cacheStats.totalSize)} will be freed
                • {cacheStats.totalEntries} cache entries will be removed
                • All data will be re-downloaded on next use
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleClearCache}
                isDisabled={isOperationInProgress || !hasData || !isOnline}
                startIcon={<DeleteIcon />}
                size="small"
              >
                {operationStatus.state === 'clearing' ? 'Clearing...' : 'Clear All Cache'}
              </Button>
            </Stack>
          </Box>
        </Alert>
      </Stack>
    </InfoCard>
  );
};