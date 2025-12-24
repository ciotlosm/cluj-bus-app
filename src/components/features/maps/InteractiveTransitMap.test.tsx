/**
 * InteractiveTransitMap - Integration and component tests
 * Verifies that the component can be imported, basic props work, and integration is complete
 * Task 11: Integration and wiring tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapMode, VehicleColorStrategy, StationSymbolType, DEFAULT_MAP_COLORS, MAP_DEFAULTS } from '../../../types/interactiveMap';
import { InteractiveTransitMap } from './InteractiveTransitMap';

// Mock React-Leaflet components to avoid DOM issues in tests
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
}));

// Mock location store
vi.mock('../../../stores/locationStore', () => ({
  useLocationStore: () => ({
    currentPosition: null,
  }),
}));

// Mock all layer components
vi.mock('./MapModeController', () => ({
  MapModeController: () => <div data-testid="map-mode-controller" />,
}));

vi.mock('./VehicleLayer', () => ({
  VehicleLayer: () => <div data-testid="vehicle-layer" />,
}));

vi.mock('./RouteShapeLayer', () => ({
  RouteShapeLayer: () => <div data-testid="route-shape-layer" />,
}));

vi.mock('./StationLayer', () => ({
  StationLayer: () => <div data-testid="station-layer" />,
}));

vi.mock('./DebugLayer', () => ({
  DebugLayer: () => <div data-testid="debug-layer" />,
}));

vi.mock('./UserLocationLayer', () => ({
  UserLocationLayer: () => <div data-testid="user-location-layer" />,
}));

vi.mock('./MapControls', () => ({
  MapControls: () => <div data-testid="map-controls" />,
}));

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

describe('InteractiveTransitMap Integration', () => {
  const mockVehicles = [
    {
      id: 1,
      latitude: 46.7712,
      longitude: 23.6236,
      route_id: 1,
      trip_id: 'trip_1',
    },
  ];

  const mockStations = [
    {
      stop_id: 1,
      stop_name: 'Test Station',
      stop_lat: 46.7712,
      stop_lon: 23.6236,
    },
  ];

  const mockRoutes = [
    {
      route_id: 1,
      route_short_name: '1',
      route_long_name: 'Test Route',
    },
  ];

  it('should render without crashing with minimal props', () => {
    const mockVehicles = [
      {
        id: 1,
        latitude: 46.7712,
        longitude: 23.6236,
        route_id: 1,
        trip_id: 'trip_1',
      },
    ];

    render(
      <InteractiveTransitMap
        mode={MapMode.VEHICLE_TRACKING}
        vehicles={mockVehicles}
      />
    );
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('map-controls')).toBeInTheDocument();
  });

  it('should show info message when no data is provided', () => {
    render(
      <InteractiveTransitMap
        mode={MapMode.VEHICLE_TRACKING}
      />
    );
    
    expect(screen.getByText(/No valid coordinate data available/)).toBeInTheDocument();
  });

  it('should render all layers when data is provided', () => {
    render(
      <InteractiveTransitMap
        mode={MapMode.VEHICLE_TRACKING}
        vehicles={mockVehicles}
        stations={mockStations}
        routes={mockRoutes}
        routeShapes={new Map()}
      />
    );
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('map-mode-controller')).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-layer')).toBeInTheDocument();
    expect(screen.getByTestId('station-layer')).toBeInTheDocument();
    expect(screen.getByTestId('map-controls')).toBeInTheDocument();
  });

  it('should show error message when mode is missing', () => {
    // @ts-expect-error - Testing error case
    render(<InteractiveTransitMap />);
    
    expect(screen.getByText(/Map mode is required/)).toBeInTheDocument();
  });

  it('should show warning when no valid coordinate data is available', () => {
    const invalidVehicles = [
      {
        id: 1,
        latitude: NaN,
        longitude: NaN,
        route_id: 1,
      },
    ];

    render(
      <InteractiveTransitMap
        mode={MapMode.VEHICLE_TRACKING}
        vehicles={invalidVehicles}
      />
    );
    
    expect(screen.getByText(/No valid coordinate data available/)).toBeInTheDocument();
  });

  it('should handle debug mode correctly', () => {
    const mockDebugData = {
      vehiclePosition: { lat: 46.7712, lon: 23.6236 },
      targetStationPosition: { lat: 46.7712, lon: 23.6236 },
      vehicleProjection: { point: { lat: 46.7712, lon: 23.6236 }, distance: 100 },
      stationProjection: { point: { lat: 46.7712, lon: 23.6236 }, distance: 100 },
      routeShape: { shape_id: 'test', points: [{ lat: 46.7712, lon: 23.6236 }] },
      distanceCalculation: { distance: 100, unit: 'meters' },
    };

    render(
      <InteractiveTransitMap
        mode={MapMode.VEHICLE_TRACKING}
        vehicles={mockVehicles}
        debugMode={true}
        debugData={mockDebugData}
      />
    );
    
    expect(screen.getByTestId('debug-layer')).toBeInTheDocument();
  });
});