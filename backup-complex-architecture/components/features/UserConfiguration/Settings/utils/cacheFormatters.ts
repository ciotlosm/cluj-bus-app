/**
 * Cache data formatting utilities
 */

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatAge = (timestamp?: Date): string => {
  if (!timestamp) return 'Never';
  const age = Date.now() - timestamp.getTime();
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds} seconds`;
  if (minutes < 60) return `${minutes} minutes`;
  if (hours < 24) return `${hours} hours`;
  return `${days} days`;
};

export const formatAgeFromTimestamp = (timestamp: number): string => {
  const age = Date.now() - timestamp;
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds} seconds`;
  if (minutes < 60) return `${minutes} minutes`;
  if (hours < 24) return `${hours} hours`;
  return `${days} days`;
};

export const getCacheTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    'vehicles': 'Live Vehicles',
    'routes': 'Bus Routes',
    'stops': 'Bus Stops', 
    'stations': 'Bus Stations',
    'stopTimes': 'Schedule Data',
    'trips': 'Trip Information'
  };
  return typeMap[type] || type;
};

export const formatCacheKey = (key: string): string => {
  // Handle GPS coordinate patterns like "46.7698,23.5870-46.7388,23.5712"
  const gpsPattern = /^(\d+\.\d+),(\d+\.\d+)-(\d+\.\d+),(\d+\.\d+)$/;
  if (gpsPattern.test(key)) {
    return 'GPS Coordinates (Bounding Box)';
  }
  
  // Handle other coordinate patterns
  const coordPattern = /^\d+\.\d+,\d+\.\d+/;
  if (coordPattern.test(key)) {
    return 'GPS Coordinates';
  }
  
  // Handle route IDs
  if (key.match(/^route_\d+$/)) {
    return `Route ${key.replace('route_', '')}`;
  }
  
  return key;
};