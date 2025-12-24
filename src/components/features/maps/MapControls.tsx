/**
 * MapControls - UI controls overlay for map interaction
 * Provides mode switching, debug toggle, and layer visibility controls
 * Positioned as overlay on top of the map
 */

import type { FC } from 'react';
import { 
  Box, 
  Paper, 
  ToggleButtonGroup, 
  ToggleButton, 
  IconButton, 
  Tooltip,
  Divider
} from '@mui/material';
import {
  DirectionsBus as VehicleIcon,
  Route as RouteIcon,
  LocationOn as StationIcon,
  BugReport as DebugIcon,
  MyLocation as LocationIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import type { MapControlsProps } from '../../../types/interactiveMap';
import { MapMode } from '../../../types/interactiveMap';

export const MapControls: FC<MapControlsProps> = ({
  mode,
  onModeChange,
  debugMode,
  onDebugToggle,
  showUserLocation,
  onUserLocationToggle,
  showVehicles,
  onVehiclesToggle,
  showRouteShapes,
  onRouteShapesToggle,
  showStations,
  onStationsToggle,
}) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Map mode selector */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode) onModeChange(newMode);
          }}
          orientation="vertical"
          size="small"
        >
          <ToggleButton value={MapMode.VEHICLE_TRACKING}>
            <Tooltip title="Vehicle Tracking" placement="left">
              <VehicleIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value={MapMode.ROUTE_OVERVIEW}>
            <Tooltip title="Route Overview" placement="left">
              <RouteIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value={MapMode.STATION_CENTERED}>
            <Tooltip title="Station Centered" placement="left">
              <StationIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider />

        {/* Layer visibility controls */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Vehicles layer toggle */}
          <Tooltip title={`${showVehicles ? 'Hide' : 'Show'} Vehicles`} placement="left">
            <IconButton
              size="small"
              color={showVehicles ? 'primary' : 'default'}
              onClick={() => onVehiclesToggle(!showVehicles)}
            >
              <VehicleIcon />
            </IconButton>
          </Tooltip>

          {/* Route shapes layer toggle */}
          <Tooltip title={`${showRouteShapes ? 'Hide' : 'Show'} Route Shapes`} placement="left">
            <IconButton
              size="small"
              color={showRouteShapes ? 'primary' : 'default'}
              onClick={() => onRouteShapesToggle(!showRouteShapes)}
            >
              <RouteIcon />
            </IconButton>
          </Tooltip>

          {/* Stations layer toggle */}
          <Tooltip title={`${showStations ? 'Hide' : 'Show'} Stations`} placement="left">
            <IconButton
              size="small"
              color={showStations ? 'primary' : 'default'}
              onClick={() => onStationsToggle(!showStations)}
            >
              <StationIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {/* Additional controls */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Debug toggle */}
          <Tooltip title="Toggle Debug Mode" placement="left">
            <IconButton
              size="small"
              color={debugMode ? 'primary' : 'default'}
              onClick={() => onDebugToggle(!debugMode)}
            >
              <DebugIcon />
            </IconButton>
          </Tooltip>

          {/* User location toggle */}
          <Tooltip title="Toggle User Location" placement="left">
            <IconButton
              size="small"
              color={showUserLocation ? 'primary' : 'default'}
              onClick={() => onUserLocationToggle(!showUserLocation)}
            >
              <LocationIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};