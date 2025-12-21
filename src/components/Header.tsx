// Header - Simple header component (< 30 lines)
// Uses Material-UI directly without wrappers

import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface HeaderProps {
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Bus Tracker
        </Typography>
        
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