// RouteFilterBar - Chip-based filtering interface for routes
// Implements toggleable transport type selection and meta filter toggles

import type { FC } from 'react';
import { 
  Box, 
  Chip, 
  Typography, 
  Divider 
} from '@mui/material';
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
 * Meta filter options for toggle selection
 */
const META_FILTER_OPTIONS = [
  { key: 'elevi' as const, label: 'Elevi' },
  { key: 'external' as const, label: 'External' }
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
   * Implements exclusivity: activating one meta filter deactivates the other
   * Resets all transport types to inactive when meta filter is activated
   */
  const handleMetaFilterToggle = (filterKey: 'elevi' | 'external') => {
    const currentValue = filterState.metaFilters[filterKey];
    const newValue = !currentValue;

    // If activating a meta filter
    if (newValue) {
      onFilterChange({
        transportTypes: {
          bus: false,
          tram: false,
          trolleybus: false
        },
        metaFilters: {
          elevi: filterKey === 'elevi',
          external: filterKey === 'external'
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

      {/* Transport type chips (toggleable selection) */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Transport Type
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {transportOptions.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              variant={filterState.transportTypes[key] ? 'filled' : 'outlined'}
              color={filterState.transportTypes[key] ? 'primary' : 'default'}
              onClick={() => handleTransportTypeToggle(key)}
              clickable
              size="small"
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Select one or more types. When none selected, shows all types.
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Meta filter chips (toggle selection) */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Special Categories
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {META_FILTER_OPTIONS.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              variant={filterState.metaFilters[key] ? 'filled' : 'outlined'}
              color={filterState.metaFilters[key] ? 'secondary' : 'default'}
              onClick={() => handleMetaFilterToggle(key)}
              clickable
              size="small"
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Special routes are excluded by default. Select a category to view them.
        </Typography>
      </Box>
    </Box>
  );
};