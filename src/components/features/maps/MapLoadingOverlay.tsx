/**
 * MapLoadingOverlay - Loading indicators for map data fetching operations
 * Displays loading states for different map layers and overall progress
 * Requirements: 8.5 - Loading state display during data fetching operations
 */

import type { FC } from 'react';
import { Box, CircularProgress, Typography, Fade, LinearProgress } from '@mui/material';
import type { MapLoadingState } from '../../../types/interactiveMap';

interface MapLoadingOverlayProps {
  loading: MapLoadingState;
  visible: boolean;
}

export const MapLoadingOverlay: FC<MapLoadingOverlayProps> = ({
  loading,
  visible,
}) => {
  // Calculate overall progress
  const loadingStates = Object.values(loading);
  const totalStates = loadingStates.length;
  const completedStates = loadingStates.filter(state => !state).length;
  const progress = totalStates > 0 ? (completedStates / totalStates) * 100 : 100;

  // Get loading message based on what's currently loading
  const getLoadingMessage = (): string => {
    if (loading.overall) return 'Initializing map...';
    if (loading.vehicles) return 'Loading vehicles...';
    if (loading.routes) return 'Loading routes...';
    if (loading.stations) return 'Loading stations...';
    if (loading.routeShapes) return 'Loading route shapes...';
    if (loading.userLocation) return 'Getting your location...';
    return 'Loading map data...';
  };

  // Don't render if not visible or nothing is loading
  if (!visible || !Object.values(loading).some(state => state)) {
    return null;
  }

  return (
    <Fade in={visible}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Main loading indicator */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            p: 3,
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: 2,
            minWidth: 200,
          }}
        >
          <CircularProgress 
            size={48} 
            thickness={4}
            sx={{ color: 'primary.main' }}
          />
          
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 500,
              textAlign: 'center',
              color: 'text.primary'
            }}
          >
            {getLoadingMessage()}
          </Typography>

          {/* Progress bar */}
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                textAlign: 'center',
                mt: 0.5,
                color: 'text.secondary'
              }}
            >
              {Math.round(progress)}% complete
            </Typography>
          </Box>

          {/* Detailed loading states */}
          <Box sx={{ mt: 1, width: '100%' }}>
            {Object.entries(loading).map(([key, isLoading]) => {
              if (key === 'overall') return null;
              
              const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
              
              return (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.5,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                  <Box sx={{ ml: 1 }}>
                    {isLoading ? (
                      <CircularProgress size={12} thickness={6} />
                    ) : (
                      <Typography variant="caption" sx={{ color: 'success.main' }}>
                        ✓
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Fade>
  );
};