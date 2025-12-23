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