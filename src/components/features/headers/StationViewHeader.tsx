// StationViewHeader - Header with favorites filter using unified FilterHeader
// Displays favorites filter toggle with consistent styling

import type { FC } from 'react';
import { Chip } from '@mui/material';
import { 
  Favorite as FavoriteIcon
} from '@mui/icons-material';
import { FilterHeader } from './FilterHeader';

interface StationViewHeaderProps {
  favoritesFilterEnabled: boolean;
  toggleFavoritesFilter: () => void;
  hasFavoriteRoutes: boolean;
}

export const StationViewHeader: FC<StationViewHeaderProps> = ({
  favoritesFilterEnabled,
  toggleFavoritesFilter,
  hasFavoriteRoutes
}) => {
  // Only show header if there are favorite routes to filter
  if (!hasFavoriteRoutes) {
    return null;
  }

  return (
    <FilterHeader>
      <Chip
        icon={<FavoriteIcon />}
        label="Favorites"
        variant={favoritesFilterEnabled ? 'filled' : 'outlined'}
        color={favoritesFilterEnabled ? 'error' : 'default'}
        onClick={toggleFavoritesFilter}
        clickable
        size="small"
      />
    </FilterHeader>
  );
};