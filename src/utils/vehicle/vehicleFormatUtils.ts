// Vehicle Format Utilities
// Helper functions for formatting vehicle data display

/**
 * Format vehicle timestamp for display
 * 
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string (HH:MM) or 'Unknown' if invalid
 */
export function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
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