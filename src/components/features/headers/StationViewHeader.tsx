// StationViewHeader - Header with filtering controls using unified FilterHeader
// Displays filtering toggle and status chips with consistent styling

import type { FC } from 'react';
import { Chip } from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { FilterHeader } from './FilterHeader';

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
    <FilterHeader
      count={{
        value: filteredCount,
        label: 'station'
      }}
    >
      {/* Favorites filter toggle - only show when user has favorite routes */}
      {hasFavoriteRoutes && (
        <Chip
          icon={<FavoriteIcon />}
          label="Favorites"
          variant={favoritesFilterEnabled ? 'filled' : 'outlined'}
          color={favoritesFilterEnabled ? 'error' : 'default'}
          onClick={toggleFavoritesFilter}
          clickable
          size="small"
        />
      )}
      
      <Chip
        icon={<LocationIcon />}
        label="Nearby"
        variant={isFiltering ? 'filled' : 'outlined'}
        color={isFiltering ? 'primary' : 'default'}
        onClick={toggleFiltering}
        clickable
        size="small"
      />
    </FilterHeader>
  );
};