// Vehicle Format Utilities
// Helper functions for formatting vehicle data display

/**
 * Format vehicle timestamp for display
 * 
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string (HH:MM) in 24-hour format or 'Unknown' if invalid
 */
export function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Format time ago from timestamp
 * 
 * @param timestamp - Timestamp in milliseconds
 * @returns Human-readable "time ago" string
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  if (diffMs < 0) return 'Just now';
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 30) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * Format exact timestamp with seconds for tooltips
 * 
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted time string with seconds (HH:MM:SS)
 */
export function formatExactTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Format vehicle speed for display
 * 
 * @param speed - Speed in km/h
 * @returns Formatted speed string or 'Stopped' if speed is 0
 */
export function formatSpeed(speed: number): string {
  return speed > 0 ? `${Math.round(speed)} km/h` : 'Stopped';
}

/**
 * Format vehicle accessibility information
 * 
 * @param wheelchairAccessible - Wheelchair accessibility status
 * @param bikeAccessible - Bike accessibility status
 * @returns Array of accessibility features
 */
export function getAccessibilityFeatures(
  wheelchairAccessible?: string,
  bikeAccessible?: string
): Array<{ type: 'wheelchair' | 'bike'; label: string }> {
  const features: Array<{ type: 'wheelchair' | 'bike'; label: string }> = [];
  
  if (wheelchairAccessible === 'WHEELCHAIR_ACCESSIBLE') {
    features.push({ type: 'wheelchair', label: 'Wheelchair' });
  }
  
  if (bikeAccessible === 'BIKE_ACCESSIBLE') {
    features.push({ type: 'bike', label: 'Bike' });
  }
  
  return features;
}

/**
 * Format arrival time result for display
 * 
 * @param arrivalResult - Arrival time calculation result
 * @returns Formatted arrival time string
 */
export function formatArrivalTime(arrivalResult?: { statusMessage: string; confidence: string }): string {
  if (!arrivalResult) return '';
  
  const confidenceIndicator = arrivalResult.confidence === 'low' ? ' (est.)' : '';
  return `${arrivalResult.statusMessage}${confidenceIndicator}`;
}