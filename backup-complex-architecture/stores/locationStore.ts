import { create } from 'zustand';
import type { LocationStore, Coordinates } from '../types';
import { StoreEventManager, StoreEvents } from './shared/storeEvents';

// Coordinate validation and bounds checking
export const validateCoordinates = (coords: Coordinates): boolean => {
  if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return false;
  }
  
  // Check if coordinates are within valid bounds
  if (coords.latitude < -90 || coords.latitude > 90) {
    return false;
  }
  
  if (coords.longitude < -180 || coords.longitude > 180) {
    return false;
  }
  
  // Check for NaN or Infinity
  if (!isFinite(coords.latitude) || !isFinite(coords.longitude)) {
    return false;
  }
  
  return true;
};

// Haversine formula for calculating distance between two coordinates
const calculateHaversineDistance = (from: Coordinates, to: Coordinates): number => {
  // Validate coordinates before calculation
  if (!validateCoordinates(from) || !validateCoordinates(to)) {
    throw new Error('Invalid coordinates provided for distance calculation');
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Enhanced geolocation wrapper with comprehensive error handling
export class LocationService {
  private static readonly DEFAULT_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000, // 15 seconds
    maximumAge: 300000, // 5 minutes
  };

  static async getCurrentPosition(options?: PositionOptions): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      // Force fresh location by setting maximumAge to 0 for refresh scenarios
      const finalOptions = { 
        ...LocationService.DEFAULT_OPTIONS, 
        maximumAge: 0, // Always get fresh location
        timeout: 20000, // Increase timeout for better reliability
        ...options 
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          // Validate coordinates before returning
          if (!validateCoordinates(coordinates)) {
            reject(new Error('Invalid coordinates received from GPS'));
            return;
          }
          
          resolve(coordinates);
        },
        (error) => {
          let errorMessage = 'Location error: ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out';
              break;
            default:
              errorMessage += error.message || 'Unknown location error';
          }
          
          reject(new Error(errorMessage));
        },
        finalOptions
      );
    });
  }

  static async watchPosition(
    callback: (coordinates: Coordinates) => void,
    errorCallback?: (error: Error) => void,
    options?: PositionOptions
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const finalOptions = { ...LocationService.DEFAULT_OPTIONS, ...options };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          if (validateCoordinates(coordinates)) {
            callback(coordinates);
          } else if (errorCallback) {
            errorCallback(new Error('Invalid coordinates received from GPS'));
          }
        },
        (error) => {
          if (errorCallback) {
            let errorMessage = 'Location watch error: ';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += 'Location access denied by user';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information unavailable';
                break;
              case error.TIMEOUT:
                errorMessage += 'Location request timed out';
                break;
              default:
                errorMessage += error.message || 'Unknown location error';
            }
            
            errorCallback(new Error(errorMessage));
          }
        },
        finalOptions
      );

      resolve(watchId);
    });
  }

  static clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  static async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      return 'prompt'; // Fallback for browsers without permissions API
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch {
      return 'prompt'; // Fallback if permissions query fails
    }
  }
}

export const useLocationStore = create<LocationStore>((set) => ({
  currentLocation: null,
  locationPermission: 'prompt',

  requestLocation: async (): Promise<Coordinates> => {
    try {
      // Check current permission status
      const permission = await LocationService.checkPermission();
      set({ locationPermission: permission });

      if (permission === 'denied') {
        throw new Error('Location access has been denied. Please enable location services in your browser settings.');
      }

      // Request current position
      const coordinates = await LocationService.getCurrentPosition();
      
      set({
        currentLocation: coordinates,
        locationPermission: 'granted',
      });
      
      // Emit location change event
      StoreEventManager.emit(StoreEvents.LOCATION_CHANGED, {
        location: coordinates,
        source: 'gps'
      });
      
      return coordinates;
    } catch (error) {
      // Determine permission state based on error
      let permission: 'granted' | 'denied' | 'prompt' = 'prompt';
      
      if (error instanceof Error) {
        if (error.message.includes('denied')) {
          permission = 'denied';
        } else if (error.message.includes('unavailable') || error.message.includes('timeout')) {
          permission = 'prompt'; // Could try again
        }
      }
      
      set({ locationPermission: permission });
      throw error;
    }
  },

  calculateDistance: (from: Coordinates, to: Coordinates): number => {
    try {
      return calculateHaversineDistance(from, to);
    } catch (error) {
      throw new Error(`Distance calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Additional utility methods for enhanced location services
  validateCoordinates: (coords: Coordinates): boolean => {
    return validateCoordinates(coords);
  },

  watchLocation: (
    callback: (coordinates: Coordinates) => void,
    errorCallback?: (error: Error) => void
  ): number => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        if (validateCoordinates(coordinates)) {
          set({ currentLocation: coordinates });
          
          // Emit location change event
          StoreEventManager.emit(StoreEvents.LOCATION_CHANGED, {
            location: coordinates,
            source: 'gps'
          });
          
          callback(coordinates);
        } else if (errorCallback) {
          errorCallback(new Error('Invalid coordinates received from GPS'));
        }
      },
      (error) => {
        if (errorCallback) {
          let errorMessage = 'Location watch error: ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out';
              break;
            default:
              errorMessage += error.message || 'Unknown location error';
          }
          
          errorCallback(new Error(errorMessage));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );

    return watchId;
  },

  clearWatch: (watchId: number): void => {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  clearLocationWatch: (watchId: number): void => {
    LocationService.clearWatch(watchId);
  },

  checkLocationPermission: async (): Promise<'granted' | 'denied' | 'prompt'> => {
    const permission = await LocationService.checkPermission();
    set({ locationPermission: permission });
    return permission;
  },
}));