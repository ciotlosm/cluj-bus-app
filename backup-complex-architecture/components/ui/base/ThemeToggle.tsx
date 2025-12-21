import React from 'react';
import {
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useConfigStore } from '../../../stores/configStore';
import { useStoreEvent, StoreEvents } from '../../../stores/shared/storeEvents';
import { useThemeUtils } from '../../../hooks';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
  iconOnly?: boolean; // New prop to render just the icon without button wrapper
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'medium',
  color = 'inherit',
  iconOnly = false
}) => {
  const { alpha } = useThemeUtils();
  const { theme: initialMode, toggleTheme } = useConfigStore();
  
  // Use local state to track theme changes via events
  const [mode, setMode] = React.useState(initialMode);
  
  // Subscribe to theme change events instead of direct store access
  useStoreEvent(
    StoreEvents.THEME_CHANGED,
    React.useCallback((data) => {
      setMode(data.theme);
    }, []),
    []
  );
  
  const isDark = mode === 'dark';
  
  // If iconOnly is true, just return the icon (for use inside other button components)
  if (iconOnly) {
    return isDark ? (
      <LightModeIcon 
        sx={{ 
          color: color === 'inherit' ? 'inherit' : undefined,
          transition: 'transform 0.3s ease-in-out',
        }} 
      />
    ) : (
      <DarkModeIcon 
        sx={{ 
          color: color === 'inherit' ? 'inherit' : undefined,
          transition: 'transform 0.3s ease-in-out',
        }} 
      />
    );
  }
  
  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      <IconButton
        onClick={toggleTheme}
        size={size}
        color={color}
        sx={{
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            bgcolor: alpha('#ffffff', 0.1),
            transform: 'rotate(180deg)',
          },
        }}
      >
        {isDark ? (
          <LightModeIcon 
            sx={{ 
              color: color === 'inherit' ? 'inherit' : undefined,
              transition: 'transform 0.3s ease-in-out',
            }} 
          />
        ) : (
          <DarkModeIcon 
            sx={{ 
              color: color === 'inherit' ? 'inherit' : undefined,
              transition: 'transform 0.3s ease-in-out',
            }} 
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;