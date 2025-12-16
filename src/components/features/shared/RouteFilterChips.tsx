import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

interface RouteInfo {
  routeId: string;
  routeName: string;
  vehicleCount: number;
}

interface RouteFilterChipsProps {
  routes: RouteInfo[];
  selectedRouteId?: string;
  onRouteSelect: (routeId: string | undefined) => void;
}

export const RouteFilterChips: React.FC<RouteFilterChipsProps> = ({
  routes,
  selectedRouteId,
  onRouteSelect
}) => {
  if (!routes || routes.length === 0 || routes.length === 1) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {routes.map((route) => {
        const isSelected = selectedRouteId === route.routeId;
        return (
          <Box 
            key={route.routeId}
            onClick={() => {
              if (isSelected) {
                // Deselect if already selected
                onRouteSelect(undefined);
              } else {
                // Select this route
                onRouteSelect(route.routeId);
              }
            }}
            sx={{
              position: 'relative',
              minWidth: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: isSelected ? 'primary.main' : 'rgba(100, 116, 139, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isSelected ? 'none' : '1px solid rgba(100, 116, 139, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: isSelected ? 'primary.dark' : 'rgba(100, 116, 139, 0.4)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              }
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: isSelected ? 'white' : 'rgb(148, 163, 184)', 
                fontWeight: 'bold'
              }}
            >
              {route.routeName}
            </Typography>
            
            {/* Vehicle count badge */}
            <Box
              sx={{
                position: 'absolute',
                top: -6,
                right: -6,
                minWidth: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: isSelected ? 'primary.main' : 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid',
                borderColor: 'background.paper',
                boxShadow: 1,
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isSelected ? 'primary.contrastText' : 'success.contrastText',
                  fontWeight: 'bold',
                  fontSize: '0.65rem',
                  lineHeight: 1,
                }}
              >
                {route.vehicleCount}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};