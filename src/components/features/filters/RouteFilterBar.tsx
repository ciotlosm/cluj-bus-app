// RouteFilterBar - Chip-based filtering interface for routes
// Implements toggleable transport type selection and meta filter toggles

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
  Star,
  Public,
  Favorite
} from '@mui/icons-material';
import type { RouteFilterState, TransportTypeKey } from '../../../types/routeFilter';
import { getTransportTypeOptions } from '../../../types/rawTranzyApi';

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

/**
 * Meta filter options for toggle selection with icons
 */
const META_FILTER_OPTIONS = [
  { key: 'elevi' as const, label: 'Elevi', icon: Star },
  { key: 'external' as const, label: 'External', icon: Public },
  { key: 'favorites' as const, label: 'Favorites', icon: Favorite }
];

export const RouteFilterBar: FC<RouteFilterBarProps> = ({
  filterState,
  onFilterChange,
  routeCount
}) => {
  // Get transport options dynamically from type definitions
  const transportOptions = getTransportTypeOptions();
  /**
   * Handle transport type toggle
   * Multiple transport types can be selected simultaneously
   * When none are selected, assumes "all"
   */
  const handleTransportTypeToggle = (transportKey: TransportTypeKey) => {
    onFilterChange({
      ...filterState,
      transportTypes: {
        ...filterState.transportTypes,
        [transportKey]: !filterState.transportTypes[transportKey]
      }
    });
  };

  /**
   * Handle meta filter toggle
   * Implements exclusivity: activating one meta filter deactivates the others
   * Transport types remain unchanged when meta filters are toggled
   */
  const handleMetaFilterToggle = (filterKey: 'elevi' | 'external' | 'favorites') => {
    const currentValue = filterState.metaFilters[filterKey];
    const newValue = !currentValue;

    // If activating a meta filter, deactivate the other ones
    if (newValue) {
      onFilterChange({
        ...filterState,
        metaFilters: {
          elevi: filterKey === 'elevi',
          external: filterKey === 'external',
          favorites: filterKey === 'favorites'
        }
      });
    } else {
      // If deactivating a meta filter, just toggle it off
      onFilterChange({
        ...filterState,
        metaFilters: {
          ...filterState.metaFilters,
          [filterKey]: false
        }
      });
    }
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

        {/* Visual separator */}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Meta filter chips */}
        {META_FILTER_OPTIONS.map(({ key, label, icon: IconComponent }) => (
          <Chip
            key={key}
            icon={<IconComponent />}
            label={label}
            variant={filterState.metaFilters[key] ? 'filled' : 'outlined'}
            color={filterState.metaFilters[key] ? 'secondary' : 'default'}
            onClick={() => handleMetaFilterToggle(key)}
            clickable
            size="small"
          />
        ))}
      </Paper>
    </Box>
  );
};