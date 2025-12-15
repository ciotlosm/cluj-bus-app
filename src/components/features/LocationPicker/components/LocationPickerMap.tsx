import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { Map as MapIcon } from '@mui/icons-material';
import { formatCoordinates } from '../../../../utils/locationUtils';
import type { Coordinates } from '../../../../types';

interface LocationPickerMapProps {
  onMapClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCoordinatesSelect?: (coordinates: Coordinates) => void;
  mapLocation: Coordinates | null;
  locationType: 'home' | 'work' | 'offline';
  getLocationColor: () => string;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  onMapClick,
  onCoordinatesSelect,
  mapLocation,
  locationType,
  getLocationColor,
}) => {
  const theme = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Default center (Cluj-Napoca)
  const defaultCenter: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
  const mapCenter = mapLocation || defaultCenter;

  // Initialize Leaflet map only once
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current && !isMapLoaded) {
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
            const coordinates = { latitude: lat, longitude: lng };
            
            // Use the direct coordinates handler if available
            if (onCoordinatesSelect) {
              onCoordinatesSelect(coordinates);
            } else {
              // Fallback to the original event-based handler
              const syntheticEvent = {
                currentTarget: mapRef.current,
                target: mapRef.current,
                preventDefault: () => {},
                stopPropagation: () => {},
                coordinates
              } as unknown as React.MouseEvent<HTMLDivElement>;
              
              onMapClick(syntheticEvent);
            }
            
            // Remove existing marker
            if (markerRef.current) {
              map.removeLayer(markerRef.current);
            }
            
            // Add new marker
            markerRef.current = L.marker([lat, lng]).addTo(map);
          });

          // Add initial marker if coordinates exist
          if (mapLocation) {
            markerRef.current = L.marker([mapLocation.latitude, mapLocation.longitude]).addTo(map);
          }

          leafletMapRef.current = map;
          setIsMapLoaded(true);
        } catch (error) {
          console.error('Failed to load map:', error);
        }
      };

      initMap();
    }
  }, []); // Empty dependency array - initialize only once

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, []);

  // Update map center when mapCenter changes (without re-initializing)
  useEffect(() => {
    if (leafletMapRef.current && isMapLoaded) {
      leafletMapRef.current.setView([mapCenter.latitude, mapCenter.longitude], 13);
    }
  }, [mapCenter.latitude, mapCenter.longitude, isMapLoaded]);

  // Update marker when mapLocation changes
  useEffect(() => {
    if (leafletMapRef.current && isMapLoaded) {
      // Remove existing marker
      if (markerRef.current) {
        leafletMapRef.current.removeLayer(markerRef.current);
      }
      
      // Add new marker if location exists
      if (mapLocation) {
        const L = (window as any).L;
        if (L) {
          markerRef.current = L.marker([mapLocation.latitude, mapLocation.longitude]).addTo(leafletMapRef.current);
          // Pan to the new location
          leafletMapRef.current.setView([mapLocation.latitude, mapLocation.longitude], 15);
        }
      }
    }
  }, [mapLocation, isMapLoaded]);

  return (
    <Box
      sx={{
        width: '100%',
        height: 300,
        border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Map container */}
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      />
      
      {/* Loading overlay */}
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
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            backgroundImage: `
              linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.03)} 25%, transparent 25%),
              linear-gradient(-45deg, ${alpha(theme.palette.primary.main, 0.03)} 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, ${alpha(theme.palette.primary.main, 0.03)} 75%),
              linear-gradient(-45deg, transparent 75%, ${alpha(theme.palette.primary.main, 0.03)} 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <MapIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Loading interactive map...
            </Typography>
          </Box>
        </Box>
      )}
      
      {/* Instructions overlay */}
      {isMapLoaded && !mapLocation && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            borderRadius: 1,
            p: 1.5,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            <MapIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Click anywhere on the map to set your {locationType} location
          </Typography>
        </Box>
      )}
      
      {/* Coordinates display */}
      {mapLocation && isMapLoaded && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            borderRadius: 1,
            p: 1,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
            {formatCoordinates(mapLocation)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};