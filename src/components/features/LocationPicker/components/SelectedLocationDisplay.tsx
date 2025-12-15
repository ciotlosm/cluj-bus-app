import React from 'react';
import { Box, Typography, Chip, useTheme, alpha } from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { formatCoordinates } from '../../../../utils/locationUtils';
import type { Coordinates } from '../../../../types';

interface SelectedLocationDisplayProps {
  selectedLocation: Coordinates;
  userCurrentLocation: Coordinates | null;
  locationType: 'home' | 'work' | 'offline';
  getLocationColor: () => string;
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
}

export const SelectedLocationDisplay: React.FC<SelectedLocationDisplayProps> = ({
  selectedLocation,
  userCurrentLocation,
  locationType,
  getLocationColor,
  calculateDistance,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: alpha(getLocationColor(), 0.1),
        borderRadius: 2,
        border: `1px solid ${alpha(getLocationColor(), 0.3)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LocationIcon sx={{ color: getLocationColor() }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Selected Location
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary">
        Coordinates: {formatCoordinates(selectedLocation)}
      </Typography>
      
      {userCurrentLocation && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Distance from current location: {(() => {
            try {
              return calculateDistance(userCurrentLocation, selectedLocation).toFixed(2);
            } catch (error) {
              console.error('Distance calculation error:', error);
              return 'N/A';
            }
          })()} km
        </Typography>
      )}
      
      <Box sx={{ mt: 1 }}>
        <Chip
          label={locationType === 'home' ? 'Home Location' : locationType === 'work' ? 'Work Location' : 'Offline Location'}
          size="small"
          sx={{
            bgcolor: alpha(getLocationColor(), 0.2),
            color: getLocationColor(),
            fontWeight: 600,
          }}
        />
      </Box>
    </Box>
  );
};