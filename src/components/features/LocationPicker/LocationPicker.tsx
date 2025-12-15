import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Alert,
  Stack,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Map as MapIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Business as WorkIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';

import { Button } from '../../ui/Button';
import { useLocationPicker } from '../../../hooks/useLocationPicker';
import {
  CurrentLocationSection,
  PopularLocations,
  LocationPickerMap,
  SelectedLocationDisplay,
} from './components';
import type { Coordinates } from '../../../types';

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onLocationSelected: (location: Coordinates) => void;
  title: string;
  type: 'home' | 'work' | 'offline'; // Support for offline location
  currentLocation?: Coordinates;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  open,
  onClose,
  onLocationSelected,
  title,
  type,
  currentLocation,
}) => {
  const theme = useTheme();
  
  const {
    selectedLocation,
    mapLocation,
    showMap,
    isGettingLocation,
    error,
    locationPermission,
    userCurrentLocation,
    handleUseCurrentLocation,
    handleMapClick,
    handleCoordinatesSelect,
    handlePopularLocationSelect,
    setShowMap,
    handleConfirm,
    calculateDistance,
  } = useLocationPicker({
    open,
    currentLocation,
    onLocationSelected: (location) => {
      onLocationSelected(location);
      onClose();
    },
  });

  const getLocationIcon = () => {
    if (type === 'home') return <HomeIcon />;
    if (type === 'work') return <WorkIcon />;
    return <LocationOnIcon />;
  };

  const getLocationColor = () => {
    if (type === 'home') return theme.palette.info.main;
    if (type === 'work') return theme.palette.warning.main;
    return theme.palette.primary.main;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getLocationIcon()}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          {/* Current Location Section - Hidden for offline location since it's a fallback */}
          {type !== 'offline' && (
            <Box>
              <CurrentLocationSection
                onUseCurrentLocation={handleUseCurrentLocation}
                isGettingLocation={isGettingLocation}
                locationPermission={locationPermission}
                error={error}
              />
            </Box>
          )}

          {/* Popular Locations Section */}
          <Box>
            <PopularLocations
              onLocationSelect={handlePopularLocationSelect}
              getLocationColor={getLocationColor}
            />
          </Box>

          {/* Map Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Choose on Map
            </Typography>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setShowMap(!showMap)}
              startIcon={<MapIcon />}
              sx={{ py: 1.5, mb: 2 }}
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
            
            {showMap && (
              <LocationPickerMap
                onMapClick={handleMapClick}
                onCoordinatesSelect={handleCoordinatesSelect}
                mapLocation={mapLocation}
                locationType={type}
                getLocationColor={getLocationColor}
              />
            )}
          </Box>

          {/* Selected Location Display */}
          {selectedLocation && (
            <SelectedLocationDisplay
              selectedLocation={selectedLocation}
              userCurrentLocation={userCurrentLocation}
              locationType={type}
              getLocationColor={getLocationColor}
              calculateDistance={calculateDistance}
            />
          )}

          {/* Instructions */}
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Tip:</strong> Your {type} location helps the app provide better route suggestions 
              and determine which direction you're traveling.
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="filled"
          onClick={() => {
            if (selectedLocation) {
              handleConfirm();
            }
          }}
          disabled={!selectedLocation}
        >
          Set {type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Offline'} Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPicker;