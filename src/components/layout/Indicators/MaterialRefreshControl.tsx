import React from 'react';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useRefreshSystem } from '../../../hooks/useRefreshSystem';

export const MaterialRefreshControl: React.FC = () => {
  const { manualRefresh } = useRefreshSystem();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await manualRefresh();
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };
  const theme = useTheme();

  const getLastRefreshText = () => {
    if (!lastRefresh) return 'Never refreshed';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <Tooltip title={`Cache updated: ${getLastRefreshText()}`} arrow>
      <IconButton
        onClick={refresh}
        disabled={isRefreshing}
        sx={{
          bgcolor: alpha(theme.palette.common.white, 0.1),
          color: theme.palette.common.white,
          '&:hover': {
            bgcolor: alpha(theme.palette.common.white, 0.2),
          },
          '&:disabled': {
            bgcolor: alpha(theme.palette.common.white, 0.05),
            color: alpha(theme.palette.common.white, 0.5),
          },
        }}
      >
        {isRefreshing ? (
          <CircularProgress
            size={24}
            sx={{
              color: theme.palette.common.white,
            }}
          />
        ) : (
          <RefreshIcon />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default MaterialRefreshControl;