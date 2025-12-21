// Header - Simple header component with integrated status indicator
// Uses Material-UI directly without wrappers

import type { FC } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { StatusIndicator } from '../features/status/StatusIndicator';

interface HeaderProps {
  onSettingsClick?: () => void;
}

export const Header: FC<HeaderProps> = ({ 
  onSettingsClick
}) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Bus Tracker
        </Typography>
        
        {/* Status Indicator positioned in top right area */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mr: onSettingsClick ? 1 : 0 // Add margin if settings button is present
        }}>
          <StatusIndicator />
        </Box>
        
        {onSettingsClick && (
          <IconButton
            color="inherit"
            onClick={onSettingsClick}
            aria-label="settings"
          >
            <SettingsIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};