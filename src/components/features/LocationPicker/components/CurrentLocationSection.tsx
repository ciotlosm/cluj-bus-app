import React from 'react';
import { Typography, Alert } from '@mui/material';
import { MyLocation as MyLocationIcon } from '@mui/icons-material';
import { Button } from '../../../ui';

interface CurrentLocationSectionProps {
  onUseCurrentLocation: () => Promise<void>;
  isGettingLocation: boolean;
  locationPermission: 'granted' | 'denied' | 'prompt';
  error: string | null;
}

export const CurrentLocationSection: React.FC<CurrentLocationSectionProps> = ({
  onUseCurrentLocation,
  isGettingLocation,
  locationPermission,
  error,
}) => {
  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Use Current Location
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      
      {locationPermission === 'denied' && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Location access is denied. Please enable location services in your browser settings.
        </Alert>
      )}
      
      <Button
        variant="outlined"
        isFullWidth
        onClick={onUseCurrentLocation}
        isLoading={isGettingLocation}
        isDisabled={locationPermission === 'denied'}
        startIcon={<MyLocationIcon />}
        sx={{ py: 1.5 }}
      >
        {isGettingLocation ? 'Getting Location...' : 'Use My Current Location'}
      </Button>
    </>
  );
};