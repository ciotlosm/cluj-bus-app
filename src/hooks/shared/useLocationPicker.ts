import { useState, useEffect } from 'react';
import { useLocationStore } from '../../stores/locationStore';
import { mapClickToCoordinates, popularLocationToCoordinates } from '../../utils/formatting/locationUtils';
import { logger } from '../../utils/shared/logger';
import type { Coordinates } from '../../types';

export interface UseLocationPickerProps {
  open: boolean;
  currentLocation?: Coordinates;
  onLocationSelected: (location: Coordinates) => void;
}

export interface UseLocationPickerReturn {
  // State
  selectedLocation: Coordinates | null;
  mapLocation: Coordinates | null;
  showMap: boolean;
  isGettingLocation: boolean;
  error: string | null;
  
  // Location store state
  locationPermission: 'granted' | 'denied' | 'prompt';
  userCurrentLocation: Coordinates | null;
  
  // Actions
  handleUseCurrentLocation: () => Promise<void>;
  handleMapClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleCoordinatesSelect: (coordinates: Coordinates) => void;
  handlePopularLocationSelect: (locationName: string) => void;
  setShowMap: (show: boolean) => void;
  handleConfirm: () => void;
  reset: () => void;
  
  // Utilities
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
}

export const useLocationPicker = ({
  open,
  currentLocation,
  onLocationSelected,
}: UseLocationPickerProps): UseLocationPickerReturn => {
  const {
    requestLocation,
    locationPermission,
    checkLocationPermission,
    currentLocation: userCurrentLocation,
    calculateDistance,
  } = useLocationStore();

  // Local state
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(currentLocation || null);
  const [mapLocation, setMapLocation] = useState<Coordinates | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setSelectedLocation(currentLocation || null);
      setMapLocation(null);
      setShowMap(false);
      checkLocationPermission();
    }
  }, [open, currentLocation, checkLocationPermission]);

  const handleUseCurrentLocation = async (): Promise<void> => {
    setIsGettingLocation(true);
    setError(null);

    try {
      const location = await requestLocation();
      setSelectedLocation(location);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location';
      setError(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!showMap) return;
    
    // Check if coordinates are provided directly (from Leaflet map)
    const eventWithCoords = event as any;
    if (eventWithCoords.coordinates) {
      setMapLocation(eventWithCoords.coordinates);
      setSelectedLocation(eventWithCoords.coordinates);
      return;
    }
    
    // Fallback to pixel-based calculation for placeholder maps
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const location = mapClickToCoordinates(x, y, rect.width, rect.height);
    setMapLocation(location);
    setSelectedLocation(location);
  };

  const handleCoordinatesSelect = (coordinates: Coordinates): void => {
    // Validate coordinates before setting
    if (typeof coordinates.latitude === 'number' && 
        typeof coordinates.longitude === 'number' &&
        isFinite(coordinates.latitude) && 
        isFinite(coordinates.longitude) &&
        coordinates.latitude >= -90 && coordinates.latitude <= 90 &&
        coordinates.longitude >= -180 && coordinates.longitude <= 180) {
      setMapLocation(coordinates);
      setSelectedLocation(coordinates);
    } else {
      logger.error('Invalid coordinates received', coordinates, 'LOCATION_PICKER');
    }
  };

  const handlePopularLocationSelect = (locationName: string): void => {
    const coords = popularLocationToCoordinates(locationName);
    if (coords) {
      setSelectedLocation(coords);
      setMapLocation(coords);
    }
  };

  const handleConfirm = (): void => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
    }
  };

  const reset = (): void => {
    setSelectedLocation(currentLocation || null);
    setMapLocation(null);
    setShowMap(false);
    setIsGettingLocation(false);
    setError(null);
  };

  return {
    // State
    selectedLocation,
    mapLocation,
    showMap,
    isGettingLocation,
    error,
    locationPermission,
    userCurrentLocation,
    
    // Actions
    handleUseCurrentLocation,
    handleMapClick,
    handleCoordinatesSelect,
    handlePopularLocationSelect,
    setShowMap,
    handleConfirm,
    reset,
    
    // Utilities
    calculateDistance,
  };
};