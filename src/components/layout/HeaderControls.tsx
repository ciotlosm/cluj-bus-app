// HeaderControls - Reusable header controls component
// Contains StatusIndicator, ManualRefreshButton, and optional Settings button

import type { FC } from 'react';
import { Box, IconButton } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { StatusIndicator } from '../features/status/StatusIndicator';
import { ManualRefreshButton } from '../features/controls/ManualRefreshButton';

interface HeaderControlsProps {
  onSettingsClick?: () => void;
  showGpsDetails?: boolean; // Only control whether GPS shows detailed popup
}

export const HeaderControls: FC<HeaderControlsProps> = ({ 
  onSettingsClick,
  showGpsDetails = false // Default to false - only show details in settings
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      gap: 1,
      mr: onSettingsClick ? 1 : 0 // Add margin if settings button is present
    }}>
      <StatusIndicator showGpsDetails={showGpsDetails} />
      <ManualRefreshButton />
      
      {onSettingsClick && (
        <IconButton
          color="inherit"
          onClick={onSettingsClick}
          aria-label="settings"
        >
          <SettingsIcon />
        </IconButton>
      )}
    </Box>
  );
};