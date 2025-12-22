// StationViewHeader - Header with filtering controls and status indicators
// Displays filtering toggle and status chips

import type { FC } from 'react';
import { 
  Box, 
  Typography, 
  Switch,
  FormControlLabel,
  Chip,
  Stack
} from '@mui/material';

interface StationViewHeaderProps {
  isFiltering: boolean;
  toggleFiltering: () => void;
  filteredCount: number;
  totalCount: number;
  favoritesFilterEnabled: boolean;
  toggleFavoritesFilter: () => void;
  hasFavoriteRoutes: boolean;
}

export const StationViewHeader: FC<StationViewHeaderProps> = ({
  isFiltering,
  toggleFiltering,
  filteredCount,
  totalCount,
  favoritesFilterEnabled,
  toggleFavoritesFilter,
  hasFavoriteRoutes
}) => {
  return (
    <Box sx={{ p: 2, pb: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">
          Stations
        </Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Favorites filter toggle - only show when user has favorite routes */}
          {hasFavoriteRoutes && (
            <FormControlLabel
              control={
                <Switch
                  checked={favoritesFilterEnabled}
                  onChange={toggleFavoritesFilter}
                  size="small"
                />
              }
              label="Favorites"
              sx={{ ml: 1 }}
            />
          )}
          
          <FormControlLabel
            control={
              <Switch
                checked={isFiltering}
                onChange={toggleFiltering}
                size="small"
              />
            }
            label="Nearby"
            sx={{ ml: 1 }}
          />
        </Stack>
      </Stack>

      {/* Filtering status indicators */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip
          label={`${filteredCount} of ${totalCount} stations`}
          size="small"
          variant="outlined"
        />
      </Stack>
    </Box>
  );
};