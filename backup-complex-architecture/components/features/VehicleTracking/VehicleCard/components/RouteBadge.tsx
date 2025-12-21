import React from 'react';
import { Box, Typography } from '@mui/material';
import { useThemeUtils } from '../../../../../hooks';

interface RouteBadgeProps {
  routeId: string;
  isDeparted: boolean;
  onRouteClick?: () => void;
}

export const RouteBadge: React.FC<RouteBadgeProps> = ({
  routeId,
  isDeparted,
  onRouteClick
}) => {
  const { alpha, theme } = useThemeUtils();

  return (
    <Box 
      onClick={onRouteClick}
      sx={{
        minWidth: 48,
        width: 48,
        height: 48,
        borderRadius: 2,
        bgcolor: isDeparted ? alpha(theme.palette.primary.main, 0.4) : 'primary.main',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onRouteClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        flexShrink: 0,
        ...(onRouteClick && {
          '&:hover': {
            bgcolor: isDeparted ? alpha(theme.palette.primary.main, 0.5) : 'primary.dark',
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          }
        })
      }}
    >
      <Typography variant="h6" sx={{ 
        color: isDeparted 
          ? alpha(theme.palette.primary.contrastText, 0.7) 
          : theme.palette.primary.contrastText, 
        fontWeight: 'bold',
        fontSize: '1rem'
      }}>
        {routeId}
      </Typography>
    </Box>
  );
};