// RouteFilterBar - Chip-based filtering interface for routes
// Implements toggleable transport type selection and favorites filter

import { useEffect } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  Chip, 
  Typography, 
  Divider,
  Paper
} from '@mui/material';
import {
  DirectionsBus,
  Tram,
  ElectricBolt,
  Favorite
} from '@mui/icons-material';
import type { RouteFilterState, TransportTypeKey } from '../../../types/routeFilter';
import { getTransportTypeOptions } from '../../../types/rawTranzyApi';
import { useFavoritesStore } from '../../../stores/favoritesStore';

interface RouteFilterBarProps {
  /** Current filter state */
  filterState: RouteFilterState;
  /** Callback when filter state changes */
  onFilterChange: (newState: RouteFilterState) => void;
  /** Number of routes matching current filters */
  routeCount: number;
}

/**
 * Transport type icon mapping for visual identification
 */
const TRANSPORT_TYPE_ICONS = {
  bus: DirectionsBus,
  tram: Tram,
  trolleybus: ElectricBolt
} as const;

export const RouteFilterBar: FC<RouteFilterBarProps> = ({
  filterState,
  onFilterChange,
  routeCount
}) => {
  // Get transport options dynamically from type definitions
  const transportOptions = getTransportTypeOptions();
  
  // Check if user has any favorite routes
  const getFavoriteCount = useFavoritesStore((state) => state.getFavoriteCount);
  const hasFavoriteRoutes = getFavoriteCount() > 0;
  
  // Auto-clear favorites filter when no favorite routes exist
  useEffect(() => {
    if (!hasFavoriteRoutes && filterState.metaFilters.favorites) {
      onFilterChange({
        ...filterState,
        metaFilters: {
          favorites: false
        }
      });
    }
  }, [hasFavoriteRoutes, filterState.metaFilters.favorites, filterState, onFilterChange]);

  /**
   * Handle transport type toggle
   * Only one transport type can be selected at a time (or none at all)
   * Clicking the same type again deselects it
   */
  const handleTransportTypeToggle = (transportKey: TransportTypeKey) => {
    const isCurrentlySelected = filterState.transportTypes[transportKey];
    
    // If clicking the currently selected type, deselect it (set all to false)
    if (isCurrentlySelected) {
      onFilterChange({
        ...filterState,
        transportTypes: {
          bus: false,
          tram: false,
          trolleybus: false
        }
      });
    } else {
      // If clicking a different type, select only that one
      onFilterChange({
        ...filterState,
        transportTypes: {
          bus: transportKey === 'bus',
          tram: transportKey === 'tram',
          trolleybus: transportKey === 'trolleybus'
        }
      });
    }
  };

  /**
   * Handle favorites filter toggle
   */
  const handleFavoritesToggle = () => {
    onFilterChange({
      ...filterState,
      metaFilters: {
        favorites: !filterState.metaFilters.favorites
      }
    });
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
      {/* Route count display */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {routeCount} route{routeCount !== 1 ? 's' : ''} found
      </Typography>

      {/* Grouped filter chips in a single row */}
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 1.5, 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          alignItems: 'center',
          bgcolor: 'background.default'
        }}
      >
        {/* Transport type chips */}
        {transportOptions.map(({ key, label }) => {
          const IconComponent = TRANSPORT_TYPE_ICONS[key];
          return (
            <Chip
              key={key}
              icon={<IconComponent />}
              label={label}
              variant={filterState.transportTypes[key] ? 'filled' : 'outlined'}
              color={filterState.transportTypes[key] ? 'primary' : 'default'}
              onClick={() => handleTransportTypeToggle(key)}
              clickable
              size="small"
            />
          );
        })}

        {/* Favorites filter - only show if user has favorite routes */}
        {hasFavoriteRoutes && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Chip
              icon={<Favorite />}
              label="Favorites"
              variant={filterState.metaFilters.favorites ? 'filled' : 'outlined'}
              color={filterState.metaFilters.favorites ? 'error' : 'default'}
              onClick={handleFavoritesToggle}
              clickable
              size="small"
            />
          </>
        )}
      </Paper>
    </Box>
  );
};