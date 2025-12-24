/**
 * MapControls Component Tests
 * Tests for map controls functionality including mode switching and layer visibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapControls } from './MapControls';
import { MapMode } from '../../../types/interactiveMap';

describe('MapControls', () => {
  const defaultProps = {
    mode: MapMode.VEHICLE_TRACKING,
    onModeChange: vi.fn(),
    debugMode: false,
    onDebugToggle: vi.fn(),
    showUserLocation: true,
    onUserLocationToggle: vi.fn(),
    showVehicles: true,
    onVehiclesToggle: vi.fn(),
    showRouteShapes: true,
    onRouteShapesToggle: vi.fn(),
    showStations: true,
    onStationsToggle: vi.fn(),
  };

  it('should render mode selection buttons', () => {
    render(<MapControls {...defaultProps} />);
    
    // Check that toggle buttons exist with correct values
    expect(screen.getByRole('button', { pressed: true })).toHaveAttribute('value', 'vehicle_tracking');
    
    const allButtons = screen.getAllByRole('button');
    const toggleButtons = allButtons.filter(button => button.hasAttribute('value'));
    expect(toggleButtons).toHaveLength(3);
    
    const values = toggleButtons.map(button => button.getAttribute('value'));
    expect(values).toContain('vehicle_tracking');
    expect(values).toContain('route_overview');
    expect(values).toContain('station_centered');
  });

  it('should render layer visibility controls', () => {
    render(<MapControls {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /hide vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide route shapes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide stations/i })).toBeInTheDocument();
  });

  it('should call onModeChange when mode button is clicked', () => {
    const onModeChange = vi.fn();
    render(<MapControls {...defaultProps} onModeChange={onModeChange} />);
    
    // Find and click the route overview button
    const allButtons = screen.getAllByRole('button');
    const routeButton = allButtons.find(button => button.getAttribute('value') === 'route_overview');
    expect(routeButton).toBeDefined();
    
    fireEvent.click(routeButton!);
    expect(onModeChange).toHaveBeenCalledWith(MapMode.ROUTE_OVERVIEW);
  });

  it('should call layer toggle handlers when layer buttons are clicked', () => {
    const onVehiclesToggle = vi.fn();
    const onRouteShapesToggle = vi.fn();
    const onStationsToggle = vi.fn();
    
    render(
      <MapControls 
        {...defaultProps} 
        onVehiclesToggle={onVehiclesToggle}
        onRouteShapesToggle={onRouteShapesToggle}
        onStationsToggle={onStationsToggle}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /hide vehicles/i }));
    expect(onVehiclesToggle).toHaveBeenCalledWith(false);
    
    fireEvent.click(screen.getByRole('button', { name: /hide route shapes/i }));
    expect(onRouteShapesToggle).toHaveBeenCalledWith(false);
    
    fireEvent.click(screen.getByRole('button', { name: /hide stations/i }));
    expect(onStationsToggle).toHaveBeenCalledWith(false);
  });

  it('should call debug toggle handler when debug button is clicked', () => {
    const onDebugToggle = vi.fn();
    render(<MapControls {...defaultProps} onDebugToggle={onDebugToggle} />);
    
    fireEvent.click(screen.getByRole('button', { name: /toggle debug mode/i }));
    expect(onDebugToggle).toHaveBeenCalledWith(true);
  });

  it('should call user location toggle handler when location button is clicked', () => {
    const onUserLocationToggle = vi.fn();
    render(<MapControls {...defaultProps} onUserLocationToggle={onUserLocationToggle} />);
    
    fireEvent.click(screen.getByRole('button', { name: /toggle user location/i }));
    expect(onUserLocationToggle).toHaveBeenCalledWith(false);
  });

  it('should show correct button states based on props', () => {
    render(
      <MapControls 
        {...defaultProps} 
        debugMode={true}
        showUserLocation={false}
        showVehicles={false}
        showRouteShapes={false}
        showStations={false}
      />
    );
    
    // Debug button should be active
    const debugButton = screen.getByRole('button', { name: /toggle debug mode/i });
    expect(debugButton).toHaveClass('MuiIconButton-colorPrimary');
    
    // Layer buttons should show "Show" instead of "Hide" when layers are hidden
    expect(screen.getByRole('button', { name: /show vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show route shapes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show stations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle user location/i })).toBeInTheDocument();
  });
});