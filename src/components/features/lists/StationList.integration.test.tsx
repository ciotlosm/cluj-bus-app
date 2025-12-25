/**
 * StationList Integration Tests
 * Tests the integration between StationList and StationVehicleList for route filtering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StationList } from './StationList';
import type { FilteredStation } from '../../../types/stationFilter';

// Mock the stores
const mockRoutes = [
  { route_id: 1, route_short_name: '24', route_color: 'FF0000' },
  { route_id: 2, route_short_name: '35', route_color: '00FF00' },
  { route_id: 3, route_short_name: '41', route_color: '0000FF' }
];

const mockVehicles = [
  {
    vehicle: { id: 'v1', route_id: 1, label: '1001', timestamp: Date.now(), speed: 25, wheelchair_accessible: 1, bike_accessible: 0 },
    route: { route_id: 1, route_short_name: '24' },
    trip: { trip_id: 't1', trip_headsign: 'Downtown' },
    arrivalTime: { minutes: 5, statusMessage: 'Arriving in 5 min', confidence: 'high' as const }
  },
  {
    vehicle: { id: 'v2', route_id: 2, label: '2001', timestamp: Date.now(), speed: 30, wheelchair_accessible: 1, bike_accessible: 1 },
    route: { route_id: 2, route_short_name: '35' },
    trip: { trip_id: 't2', trip_headsign: 'Airport' },
    arrivalTime: { minutes: 8, statusMessage: 'Arriving in 8 min', confidence: 'medium' as const }
  },
  {
    vehicle: { id: 'v3', route_id: 1, label: '1002', timestamp: Date.now(), speed: 20, wheelchair_accessible: 0, bike_accessible: 0 },
    route: { route_id: 1, route_short_name: '24' },
    trip: { trip_id: 't3', trip_headsign: 'Downtown' },
    arrivalTime: { minutes: 12, statusMessage: 'Arriving in 12 min', confidence: 'low' as const }
  }
];

const mockStation: FilteredStation = {
  station: {
    stop_id: 123,
    stop_name: 'Test Station',
    stop_lat: 46.7712,
    stop_lon: 23.6236
  },
  distance: 150,
  stationType: 'primary' as const,
  matchesFavorites: false,
  vehicles: mockVehicles,
  routeIds: [1, 2, 3]
};

const mockUtilities = {
  formatDistance: (distance: number) => `${distance}m`,
  getStationTypeColor: () => 'primary' as const,
  getStationTypeLabel: () => 'Closest'
};

// Mock the stores
vi.mock('../../../stores/routeStore', () => ({
  useRouteStore: () => ({
    routes: mockRoutes
  })
}));

vi.mock('../../../stores/tripStore', () => ({
  useTripStore: () => ({
    stopTimes: [],
    trips: []
  })
}));

vi.mock('../../../stores/stationStore', () => ({
  useStationStore: () => ({
    stops: []
  })
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StationList Integration', () => {
  beforeEach(() => {
    // Reset any mocks if needed
  });

  it('should pass selectedRouteId to StationVehicleList when route bubble is clicked', () => {
    renderWithTheme(
      <StationList 
        stations={[mockStation]} 
        utilities={mockUtilities}
        isFiltering={true}
      />
    );

    // Station should be expanded by default when filtering is true
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    
    // Should show all vehicles initially (no filter)
    expect(screen.getAllByText('Downtown')).toHaveLength(2); // Two route 24 vehicles
    expect(screen.getByText('Airport')).toBeInTheDocument();   // Route 35 vehicle
    
    // Click on the first route 24 bubble (should be in the route bubbles section)
    const route24Bubbles = screen.getAllByText('24');
    // The first one should be the route bubble, not the vehicle badge
    fireEvent.click(route24Bubbles[0]);
    
    // Should still show route 24 vehicles
    expect(screen.getAllByText('Downtown')).toHaveLength(2);
    // Route 35 vehicle should be filtered out - check that Airport is not visible
    expect(screen.queryByText('Airport')).not.toBeInTheDocument();
  });

  it('should maintain filter state per station', () => {
    const station2: FilteredStation = {
      ...mockStation,
      station: { ...mockStation.station, stop_id: 456, stop_name: 'Second Station' }
    };

    renderWithTheme(
      <StationList 
        stations={[mockStation, station2]} 
        utilities={mockUtilities}
        isFiltering={true}
      />
    );

    // Both stations should be visible
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    expect(screen.getByText('Second Station')).toBeInTheDocument();
    
    // Get route bubbles for first station
    const firstStationBubbles = screen.getAllByText('24');
    expect(firstStationBubbles.length).toBeGreaterThan(0);
    
    // Click on route bubble for first station
    fireEvent.click(firstStationBubbles[0]);
    
    // The filter should only affect the first station
    // Both stations should still be visible
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    expect(screen.getByText('Second Station')).toBeInTheDocument();
  });

  it('should toggle route filter when same route is clicked twice', () => {
    renderWithTheme(
      <StationList 
        stations={[mockStation]} 
        utilities={mockUtilities}
        isFiltering={true}
      />
    );

    // Get the first route 24 bubble
    const route24Bubbles = screen.getAllByText('24');
    const routeBubble = route24Bubbles[0];
    
    // Click once to select
    fireEvent.click(routeBubble);
    
    // Should filter to only route 24 vehicles
    expect(screen.queryByText('Airport')).not.toBeInTheDocument();
    
    // Click again to deselect (toggle off)
    fireEvent.click(routeBubble);
    
    // Should return to showing all vehicles
    expect(screen.getAllByText('Downtown')).toHaveLength(2);
    expect(screen.getByText('Airport')).toBeInTheDocument();
  });

  it('should handle expansion state correctly with route filtering', () => {
    renderWithTheme(
      <StationList 
        stations={[mockStation]} 
        utilities={mockUtilities}
        isFiltering={false} // Start collapsed
      />
    );

    // Station should be collapsed initially
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    
    // Expand the station by clicking the expand button (ExpandMoreIcon)
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    expect(expandButton).toBeDefined();
    fireEvent.click(expandButton!);
    
    // Now vehicles should be visible
    expect(screen.getAllByText('Downtown')).toHaveLength(2);
    
    // Apply route filter - get the first route 24 bubble
    const route24Bubbles = screen.getAllByText('24');
    const routeBubble = route24Bubbles[0];
    fireEvent.click(routeBubble);
    
    // Station should remain expanded and filter should be applied
    expect(screen.getAllByText('Downtown')).toHaveLength(2);
    expect(screen.queryByText('Airport')).not.toBeInTheDocument();
  });
});