import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import type { Coordinates } from '../../../types';
import { useLocationStore } from '../../../stores/locationStore';
import { logger } from '../../../utils/shared/logger';
import { useThemeUtils, useMuiUtils } from '../../../hooks';

interface MapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (coordinates: Coordinates) => void;
  initialCoordinates?: Coordinates;
  title?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialCoordinates,
  title = 'Choose Location on Map',
}) => {
  const { theme, getBackgroundColors, getBorderColors, alpha } = useThemeUtils();
  const { getModalStyles } = useMuiUtils();
  const { requestLocation } = useLocationStore();
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(
    initialCoordinates || null
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Default center (Cluj-Napoca)
  const defaultCenter: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
  const mapCenter = selectedCoords || initialCoordinates || defaultCenter;

  useEffect(() => {
    if (initialCoordinates) {
      setSelectedCoords(initialCoordinates);
    }
  }, [initialCoordinates]);

  // Initialize Leaflet map when dialog opens
  useEffect(() => {
    if (isOpen && mapRef.current && !leafletMapRef.current && !isMapLoaded) {
      const initMap = async () => {
        try {
          const L = await import('leaflet');
          
          // Fix for default markers
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          });

          // Check if the DOM element is still available
          if (!mapRef.current) {
            return;
          }

          // Create map
          const map = L.map(mapRef.current).setView([mapCenter.latitude, mapCenter.longitude], 13);
          
          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);

          // Add click handler
          map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            const coords = { latitude: lat, longitude: lng };
            setSelectedCoords(coords);
            
            // Remove existing marker
            if (markerRef.current) {
              map.removeLayer(markerRef.current);
            }
            
            // Add new marker
            markerRef.current = L.marker([lat, lng]).addTo(map);
          });

          // Add initial marker if coordinates exist
          if (selectedCoords) {
            markerRef.current = L.marker([selectedCoords.latitude, selectedCoords.longitude]).addTo(map);
          }

          leafletMapRef.current = map;
          setIsMapLoaded(true);
        } catch (error) {
          logger.error('Failed to load map', error, 'MAP_PICKER');
        }
      };

      initMap();
    }

    // Cleanup when dialog closes
    if (!isOpen && leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
      setIsMapLoaded(false);
    }
  }, [isOpen]);

  // Update map center when mapCenter changes (without re-initializing)
  useEffect(() => {
    if (leafletMapRef.current && isMapLoaded && isOpen) {
      leafletMapRef.current.setView([mapCenter.latitude, mapCenter.longitude], 13);
    }
  }, [mapCenter.latitude, mapCenter.longitude, isMapLoaded, isOpen]);

  // Update marker when selectedCoords changes
  useEffect(() => {
    if (leafletMapRef.current && selectedCoords && isMapLoaded) {
      // Remove existing marker
      if (markerRef.current) {
        leafletMapRef.current.removeLayer(markerRef.current);
      }
      
      // Add new marker
      const L = (window as any).L;
      if (L) {
        markerRef.current = L.marker([selectedCoords.latitude, selectedCoords.longitude]).addTo(leafletMapRef.current);
      }
    }
  }, [selectedCoords, isMapLoaded]);



  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords);
      onClose();
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await requestLocation();
      setSelectedCoords(location);
      
      // Pan map to current location
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([location.latitude, location.longitude], 15);
      }
    } catch (error) {
      logger.error('Failed to get current location', error, 'MAP_PICKER');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const formatCoordinates = (coords: Coordinates) => {
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen
      disableRestoreFocus
      keepMounted={false}
      sx={{
        '& .MuiDialog-paper': {
          margin: 0,
          maxHeight: '100vh',
          height: '100vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Instructions */}
        <Box sx={{ p: 2, bgcolor: getBackgroundColors().default }}>
          <Typography variant="body2" color="text.secondary">
            Tap anywhere on the map to select a location
          </Typography>
          {selectedCoords && (
            <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
              Selected: {formatCoordinates(selectedCoords)}
            </Typography>
          )}
        </Box>

        {/* Map Container */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <div
            ref={mapRef}
            style={{ height: '100%', width: '100%' }}
          />
          {!isMapLoaded && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: theme.palette.grey[100],
                zIndex: 1000,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Loading map...
              </Typography>
            </Box>
          )}

          {/* Current Location Button */}
          <Button
            variant="contained"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
            startIcon={<MyLocationIcon />}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1000,
              minWidth: 'auto',
              px: 2,
            }}
          >
            {isGettingLocation ? 'Getting...' : 'My Location'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedCoords}
        >
          Confirm Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MapPicker;