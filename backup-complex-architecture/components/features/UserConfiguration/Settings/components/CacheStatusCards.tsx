import React from 'react';
import {
  Box,
  Card,
  Typography,
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Wifi as OnlineIcon,
  Storage as StorageIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatBytes } from '../../../../utils/cacheFormatters';

interface CacheStatusCardsProps {
  isOnline: boolean;
  totalSize: number;
  totalEntries: number;
  hasData: boolean;
}

export const CacheStatusCards: React.FC<CacheStatusCardsProps> = ({
  isOnline,
  totalSize,
  totalEntries,
  hasData,
}) => {
  return (
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
          {formatBytes(totalSize)}
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
          {totalEntries}
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
          {hasData ? 'Active' : 'Empty'}
        </Typography>
      </Card>
    </Box>
  );
};