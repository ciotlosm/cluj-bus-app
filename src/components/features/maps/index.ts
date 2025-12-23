/**
 * Interactive Transit Map Components
 * Export all map-related components and types
 */

export { InteractiveTransitMap } from './InteractiveTransitMap';
export { MapModeController } from './MapModeController';
export { VehicleLayer } from './VehicleLayer';
export { RouteShapeLayer } from './RouteShapeLayer';
export { StationLayer } from './StationLayer';
export { DebugLayer } from './DebugLayer';
export { UserLocationLayer } from './UserLocationLayer';
export { MapControls } from './MapControls';

// Re-export types for convenience
export type {
  InteractiveTransitMapProps,
  MapState,
  MapColorScheme,
  MapPerformanceConfig,
  VehicleLayerProps,
  RouteShapeLayerProps,
  StationLayerProps,
  DebugLayerProps,
  UserLocationLayerProps,
  MapControlsProps,
  DebugVisualizationData,
} from '../../../types/interactiveMap';

export {
  MapMode,
  VehicleColorStrategy,
  StationSymbolType,
  DEFAULT_MAP_COLORS,
  DEFAULT_MAP_PERFORMANCE,
  MAP_DEFAULTS,
} from '../../../types/interactiveMap';