// Route color utilities for transportation type-based coloring
// Maps GTFS route types to consistent color schemes

/**
 * Transportation type color mapping
 * Uses distinct colors for each transport type for better visual identification
 */
export const TRANSPORT_TYPE_COLORS = {
  0: '#FF6B35',   // Tram - Orange (distinctive for rail-based transport)
  3: '#1976D2',   // Bus - Blue (Material-UI primary)
  11: '#4CAF50'   // Trolleybus - Green (electric/eco-friendly)
} as const;

/**
 * Get color for transportation type
 * @param routeType - GTFS route type (0=Tram, 3=Bus, 11=Trolleybus)
 * @returns Hex color string
 */
export const getTransportTypeColor = (routeType: number): string => {
  return TRANSPORT_TYPE_COLORS[routeType as keyof typeof TRANSPORT_TYPE_COLORS] || '#757575'; // Default gray
};

/**
 * Get contrast text color for transportation type background
 * @param routeType - GTFS route type
 * @returns 'white' or 'black' for optimal contrast
 */
export const getTransportTypeTextColor = (routeType: number): string => {
  // All our transport colors are dark enough to use white text
  return '#ffffff';
};

/**
 * Get Material-UI color variant for transportation type
 * @param routeType - GTFS route type
 * @returns Material-UI color variant
 */
export const getTransportTypeMuiColor = (routeType: number): 'primary' | 'secondary' | 'success' | 'default' => {
  switch (routeType) {
    case 0: return 'secondary'; // Tram - Orange-ish
    case 3: return 'primary';   // Bus - Blue
    case 11: return 'success';  // Trolleybus - Green
    default: return 'default';
  }
};