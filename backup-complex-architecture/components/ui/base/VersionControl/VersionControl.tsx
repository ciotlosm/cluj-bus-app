/**
 * Compact version control component for settings header
 * Shows current version and update status with minimal UI
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import {
  SystemUpdate as UpdateIcon,
  RestartAlt as RestartIcon,
  Info as InfoIcon,
  ClearAll as ClearCacheIcon,
} from '@mui/icons-material';

import { appVersionService, type VersionInfo } from '../../../../services/api/appVersionService';
import { useConfigStore } from '../../../../stores/configStore';
import { logger } from '../../../../utils/shared/logger';

export interface VersionControlProps {
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export const VersionControl: React.FC<VersionControlProps> = ({
  size = 'small',
  showLabel = false,
}) => {
  const { config } = useConfigStore();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      const info = await appVersionService.getVersionInfo();
      setVersionInfo(info);
    } catch (error) {
      logger.error('Failed to load version info', { error }, 'VERSION_CHECK');
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const info = await appVersionService.checkForUpdates();
      setVersionInfo(info);
      logger.info('Version check completed', { versionInfo: info }, 'VERSION_CHECK');
    } catch (error) {
      logger.error('Version check failed', { error }, 'VERSION_CHECK');
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!confirm('This will refresh the app and install the update. Continue?')) {
      return;
    }

    setIsUpdating(true);
    try {
      await appVersionService.refreshApp();
      // App will reload, so this won't execute
    } catch (error) {
      logger.error('App refresh failed', { error }, 'APP_REFRESH');
      setIsUpdating(false);
    }
  };

  const handleForceCacheClear = async () => {
    if (!confirm('This will clear all cached data and refresh the app. This is useful if you\'re seeing old content or broken displays. Continue?')) {
      return;
    }

    setIsClearingCache(true);
    try {
      await appVersionService.clearAllCaches();
      logger.info('Cache cleared successfully, reloading app...', {}, 'CACHE_CLEAR');
      // Force reload after cache clear
      window.location.reload();
    } catch (error) {
      logger.error('Cache clear failed', { error }, 'CACHE_CLEAR');
      setIsClearingCache(false);
      // Still try to reload even if cache clear partially failed
      if (confirm('Cache clear had some issues, but we can still try to reload. Continue?')) {
        window.location.reload();
      }
    }
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

  const open = Boolean(anchorEl);
  const hasUpdate = versionInfo?.isUpdateAvailable || false;

  return (
    <>
      <Tooltip title={hasUpdate ? 'Update available' : versionInfo?.current ? `Version ${versionInfo.current}` : 'Version info'}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showLabel && versionInfo?.current && (
            <Typography variant="caption" color="text.secondary">
              v{versionInfo.current}
            </Typography>
          )}
          
          <Badge
            color="warning"
            variant="dot"
            invisible={!hasUpdate}
            sx={{
              '& .MuiBadge-badge': {
                animation: hasUpdate ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              },
            }}
          >
            <IconButton
              size={size}
              onClick={handleClick}
              disabled={isChecking || isUpdating || isClearingCache}
              sx={{
                color: hasUpdate ? 'warning.main' : 'text.secondary',
                '&:hover': {
                  bgcolor: hasUpdate ? 'warning.light' : 'action.hover',
                  color: hasUpdate ? 'warning.dark' : 'text.primary',
                },
              }}
            >
              {isChecking || isUpdating || isClearingCache ? (
                <CircularProgress size={size === 'small' ? 16 : 20} />
              ) : (
                <UpdateIcon fontSize={size} />
              )}
            </IconButton>
          </Badge>
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 280, maxWidth: 320 },
        }}
      >
        {/* Version Info */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            App Version
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Current
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {versionInfo?.current || 'Loading...'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Service Worker
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {versionInfo?.serviceWorker || 'Active'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Last Checked
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatAge(versionInfo?.lastChecked)}
            </Typography>
          </Box>
        </Box>

        {/* City/Agency Info for Troubleshooting */}
        {config?.city && [
          <Divider key="config-divider" />,
          <Box key="config-info" sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Configuration
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                City
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {config.city}
              </Typography>
            </Box>
            
            {config.agencyId && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Agency ID
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                  {config.agencyId}
                </Typography>
              </Box>
            )}
          </Box>
        ]}

        {/* Update Alert */}
        {hasUpdate && [
          <Divider key="update-divider" />,
          <Box key="update-alert" sx={{ px: 2, py: 1.5 }}>
            <Alert severity="info" sx={{ mb: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Update Available!
              </Typography>
              <Typography variant="body2">
                A new version is ready to install.
              </Typography>
            </Alert>
          </Box>
        ]}

        <Divider />

        {/* Actions */}
        <MenuItem
          onClick={() => {
            handleCheckForUpdates();
            handleClose();
          }}
          disabled={isChecking || isUpdating || isClearingCache}
        >
          <UpdateIcon sx={{ mr: 1.5 }} fontSize="small" />
          <Typography variant="body2">
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </Typography>
        </MenuItem>

        {hasUpdate && (
          <MenuItem
            onClick={() => {
              handleInstallUpdate();
              handleClose();
            }}
            disabled={isChecking || isUpdating || isClearingCache}
            sx={{ color: 'success.main' }}
          >
            <RestartIcon sx={{ mr: 1.5 }} fontSize="small" />
            <Typography variant="body2">
              {isUpdating ? 'Installing...' : 'Install Update'}
            </Typography>
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            handleForceCacheClear();
            handleClose();
          }}
          disabled={isChecking || isUpdating || isClearingCache}
          sx={{ color: 'warning.main' }}
        >
          <ClearCacheIcon sx={{ mr: 1.5 }} fontSize="small" />
          <Typography variant="body2">
            {isClearingCache ? 'Clearing Cache...' : 'Force Refresh Cache'}
          </Typography>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <InfoIcon sx={{ mr: 1.5 }} fontSize="small" />
          <Typography variant="body2">
            Close
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default VersionControl;