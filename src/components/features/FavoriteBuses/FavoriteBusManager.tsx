import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

import { useFavoriteBusManager } from '../../../hooks/useFavoriteBusManager';
import { Button } from '../../ui/Button';
import { InfoCard } from '../../ui/Card';
import { RouteTypeFilters } from './components/RouteTypeFilters';
import { RoutesList } from './components/RoutesList';
import { StatusMessages } from './components/StatusMessages';

interface FavoriteBusManagerProps {
  className?: string;
}

export const FavoriteBusManager: React.FC<FavoriteBusManagerProps> = ({ className = '' }) => {
  const {
    // State
    selectedRoutes,
    searchTerm,
    hasChanges,
    selectedTypes,
    
    // Data
    isLoading,
    config,
    
    // Computed
    availableTypes,
    favoriteRoutes,
    filteredAvailableRoutes,
    
    // Actions
    setSearchTerm,
    handleToggleRoute,
    handleSaveChanges,
    handleTypeFilterChange,
  } = useFavoriteBusManager();

  if (!config?.city) {
    return (
      <InfoCard
        title="Favorite Routes"
        subtitle="Configure your city first"
        icon={<FavoriteIcon />}
      >
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            Please select your city in the configuration section before managing favorite routes.
          </Typography>
        </Alert>
      </InfoCard>
    );
  }

  return (
    <Box className={className}>
      <InfoCard title="Favorite Routes">
        <Stack spacing={3}>

          {/* Favorite Routes Section */}
          <Box>
            <RoutesList
              title="Favorites"
              routes={favoriteRoutes as any}
              isFavoriteList={true}
              onToggleRoute={handleToggleRoute}
            />

          </Box>

          {/* Search and Filter Section */}
          <Box>
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search routes by number, name, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                },
              }}
            />

            {/* Bus Type Filters */}
            <RouteTypeFilters
              availableTypes={availableTypes}
              selectedTypes={selectedTypes}
              onTypeFilterChange={handleTypeFilterChange}
            />
          </Box>

          {/* Statistics */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`${selectedRoutes.length} Favorite${selectedRoutes.length !== 1 ? 's' : ''}`}
              color="primary"
              icon={<FavoriteIcon />}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`${filteredAvailableRoutes.length} Available`}
              variant="outlined"
              icon={<BusIcon />}
            />
          </Box>

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                Loading available routes...
              </Typography>
            </Box>
          )}

          {/* Available Routes Section */}
          <Box>
            <RoutesList
              title="Available Routes"
              routes={filteredAvailableRoutes as any}
              isFavoriteList={false}
              onToggleRoute={handleToggleRoute}
              maxHeight={400}
            />

          </Box>

          {/* Status Messages */}
          <StatusMessages
            isLoading={isLoading}
            hasRoutes={favoriteRoutes.length > 0 || filteredAvailableRoutes.length > 0}
            hasFilteredRoutes={filteredAvailableRoutes.length > 0}
            hasFavorites={favoriteRoutes.length > 0}
            searchTerm={searchTerm}
            selectedTypes={selectedTypes}
            cityName={config?.city}
            selectedCount={selectedRoutes.length}
            hasChanges={false}
          />
        </Stack>
      </InfoCard>
    </Box>
  );
};

export default FavoriteBusManager;