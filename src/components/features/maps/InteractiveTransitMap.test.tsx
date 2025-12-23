/**
 * InteractiveTransitMap - Basic import and type tests
 * Verifies that the component can be imported and basic props work
 */

import { describe, it, expect } from 'vitest';
import { MapMode, VehicleColorStrategy, StationSymbolType, DEFAULT_MAP_COLORS, MAP_DEFAULTS } from '../../../types/interactiveMap';

describe('InteractiveTransitMap Types', () => {
  it('should export MapMode enum correctly', () => {
    expect(MapMode.VEHICLE_TRACKING).toBe('vehicle_tracking');
    expect(MapMode.ROUTE_OVERVIEW).toBe('route_overview');
    expect(MapMode.STATION_CENTERED).toBe('station_centered');
  });

  it('should export VehicleColorStrategy enum correctly', () => {
    expect(VehicleColorStrategy.BY_ROUTE).toBe('by_route');
    expect(VehicleColorStrategy.BY_CONFIDENCE).toBe('by_confidence');
    expect(VehicleColorStrategy.UNIFORM).toBe('uniform');
  });

  it('should export StationSymbolType enum correctly', () => {
    expect(StationSymbolType.DEFAULT).toBe('default');
    expect(StationSymbolType.USER_LOCATION).toBe('user_location');
    expect(StationSymbolType.TERMINUS).toBe('terminus');
    expect(StationSymbolType.NEARBY).toBe('nearby');
  });

  it('should export default color scheme', () => {
    expect(DEFAULT_MAP_COLORS).toBeDefined();
    expect(DEFAULT_MAP_COLORS.routes).toBeInstanceOf(Map);
    expect(DEFAULT_MAP_COLORS.vehicles).toBeDefined();
    expect(DEFAULT_MAP_COLORS.stations).toBeDefined();
    expect(DEFAULT_MAP_COLORS.debug).toBeDefined();
  });

  it('should export map defaults', () => {
    expect(MAP_DEFAULTS).toBeDefined();
    expect(MAP_DEFAULTS.CENTER).toBeDefined();
    expect(MAP_DEFAULTS.CENTER.lat).toBe(46.7712);
    expect(MAP_DEFAULTS.CENTER.lon).toBe(23.6236);
    expect(MAP_DEFAULTS.ZOOM).toBe(13);
  });
});