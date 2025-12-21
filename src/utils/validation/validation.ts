import type { Coordinates, Station, BusInfo, UserConfig, Favorites, ErrorState } from '../../types';

// Validation functions for core data types

export function isValidCoordinates(coords: any): coords is Coordinates {
  if (!coords || typeof coords !== 'object') {
    return false;
  }
  
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    !isNaN(coords.latitude) &&
    !isNaN(coords.longitude) &&
    isFinite(coords.latitude) &&
    isFinite(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

export function isValidStation(station: any): station is Station {
  return (
    station &&
    typeof station === 'object' &&
    typeof station.id === 'string' &&
    station.id.length > 0 &&
    typeof station.name === 'string' &&
    station.name.length > 0 &&
    isValidCoordinates(station.coordinates) &&
    typeof station.isFavorite === 'boolean'
  );
}

export function isValidBusInfo(bus: any): bus is BusInfo {
  return (
    bus &&
    typeof bus === 'object' &&
    typeof bus.id === 'string' &&
    bus.id.length > 0 &&
    typeof bus.route === 'string' &&
    bus.route.length > 0 &&
    typeof bus.destination === 'string' &&
    bus.destination.length > 0 &&
    bus.arrivalTime instanceof Date &&
    !isNaN(bus.arrivalTime.getTime()) &&
    typeof bus.isLive === 'boolean' &&
    typeof bus.minutesAway === 'number' &&
    bus.minutesAway >= 0 &&
    isValidStation(bus.station) &&
    ['work', 'home', 'unknown'].includes(bus.direction)
  );
}

export function isValidUserConfig(config: any): config is UserConfig {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.city === 'string' &&
    config.city.trim().length > 0 &&
    isValidCoordinates(config.homeLocation) &&
    isValidCoordinates(config.workLocation) &&
    typeof config.apiKey === 'string' &&
    config.apiKey.trim().length > 0 &&
    typeof config.refreshRate === 'number' &&
    !isNaN(config.refreshRate) &&
    isFinite(config.refreshRate) &&
    config.refreshRate > 0 &&
    config.refreshRate <= 300000 // Max 5 minutes
  );
}

export function isValidFavorites(favorites: any): favorites is Favorites {
  return (
    favorites &&
    typeof favorites === 'object' &&
    Array.isArray(favorites.buses) &&
    Array.isArray(favorites.stations) &&
    favorites.buses.every((id: any) => typeof id === 'string' && id.length > 0) &&
    favorites.stations.every((id: any) => typeof id === 'string' && id.length > 0)
  );
}

export function isValidErrorState(error: any): error is ErrorState {
  const validTypes = ['network', 'parsing', 'noData', 'partial', 'authentication'];
  return (
    error &&
    typeof error === 'object' &&
    validTypes.includes(error.type) &&
    typeof error.message === 'string' &&
    error.message.length > 0 &&
    error.timestamp instanceof Date &&
    !isNaN(error.timestamp.getTime()) &&
    typeof error.retryable === 'boolean'
  );
}

// Helper functions for creating valid instances
export function createValidCoordinates(lat: number, lng: number): Coordinates {
  if (!isValidCoordinates({ latitude: lat, longitude: lng })) {
    throw new Error('Invalid coordinates provided');
  }
  return { latitude: lat, longitude: lng };
}

export function createValidUserConfig(
  city: string,
  homeLocation: Coordinates,
  workLocation: Coordinates,
  apiKey: string,
  refreshRate: number = 30000
): UserConfig {
  const config = { city, homeLocation, workLocation, apiKey, refreshRate };
  if (!isValidUserConfig(config)) {
    throw new Error('Invalid user configuration provided');
  }
  return config;
}

export function createValidFavorites(buses: string[] = [], stations: string[] = []): Favorites {
  const favorites = { buses, stations };
  if (!isValidFavorites(favorites)) {
    throw new Error('Invalid favorites data provided');
  }
  return favorites;
}

// Refresh rate validation utilities
export function isValidRefreshRate(rate: any): rate is number {
  return (
    typeof rate === 'number' &&
    !isNaN(rate) &&
    isFinite(rate) &&
    rate >= 1000 && // Minimum 1 second
    rate <= 300000 // Maximum 5 minutes
  );
}

export function validateRefreshRateWithTolerance(
  actualInterval: number,
  expectedRate: number,
  tolerancePercent: number = 10
): boolean {
  if (!isValidRefreshRate(expectedRate)) {
    return false;
  }
  
  const tolerance = expectedRate * (tolerancePercent / 100);
  const minExpected = expectedRate - tolerance;
  const maxExpected = expectedRate + tolerance;
  
  return actualInterval >= minExpected && actualInterval <= maxExpected;
}

export function formatRefreshRate(rateMs: number): string {
  if (!isValidRefreshRate(rateMs)) {
    return 'Invalid';
  }
  
  if (rateMs < 1000) return `${rateMs}ms`;
  
  const seconds = rateMs / 1000;
  if (seconds < 60) {
    return seconds % 1 === 0 ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}