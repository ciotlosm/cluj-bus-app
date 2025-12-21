import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Stack,
  Alert,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Route as RouteIcon,
  Search as SearchIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';

import { useRouteManager } from '../../../hooks/controllers';
import { InfoCard } from '../../ui';
import { LoadingState } from '../../ui/feedback/Loading';
import { RouteTypeFilters } from './components/RouteTypeFilters';
import { RoutesList } from './components/RoutesList';
import { StatusMessages } from './components/StatusMessages';

interface SettingsRouteProps {
  className?: string;
}

export const SettingsRoute: React.FC<SettingsRouteProps> = ({ className = '' }) => {
  const {
    // State
    selectedRoutes,
    searchTerm,
    selectedTypes,
    
    // Data
    availableRoutes,
    isLoading,
    config,
    error,
    
    // Computed
    availableTypes,
    favoriteRoutes,
    filteredAvailableRoutes,
    
    // Actions
    setSearchTerm,
    handleToggleRoute,
    handleTypeFilterChange,
  } = useRouteManager();

  // Local isLoading state to ensure we show isLoading initially
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Mark as loaded when we have data or a definitive error
  useEffect(() => {
    if (!isLoading && (availableRoutes.length > 0 || error)) {
      // Add a small delay to ensure isLoading state is visible
      const timer = setTimeout(() => {
        setHasInitiallyLoaded(true);
      }, 500); // 500ms minimum isLoading time
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, availableRoutes.length, error]);



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

  // Show isLoading state during initial data fetch
  if (!hasInitiallyLoaded && config?.city) {
    return (
      <Box className={className}>
        <InfoCard title="Favorite Routes">
          <LoadingState
            variant="spinner"
            size="medium"
            text="Loading route data..."
            fullHeight={false}
          />
        </InfoCard>
      </Box>
    );
  }

  return (
    <Box className={className}>
      <InfoCard title="Favorite Routes">
        <Stack spacing={3}>

          {/* Favorite Routes Section */}
          <Box>
            {isLoading && favoriteRoutes.length === 0 ? (
              <LoadingState
                variant="skeleton"
                size="medium"
                text="Loading favorites..."
              />
            ) : (
              <RoutesList
                title="Favorites"
                routes={favoriteRoutes as any}
                isFavoriteList={true}
                onToggleRoute={handleToggleRoute}
              />
            )}
          </Box>

          {/* Search and Filter Section - Only show when not in initial isLoading */}
          {hasInitiallyLoaded && (
            <Box>
              {/* Search Bar */}
              <TextField
                placeholder="Search routes by number, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
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

              {/* Route Type Filters */}
              <RouteTypeFilters
                availableTypes={availableTypes}
                selectedTypes={selectedTypes}
                onTypeFilterChange={handleTypeFilterChange}
              />
            </Box>
          )}

          {/* Statistics - Only show when not in initial isLoading */}
          {hasInitiallyLoaded && (
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
                icon={<RouteIcon />}
              />
            </Box>
          )}

          {/* Loading State for subsequent data fetches */}
          {hasInitiallyLoaded && isLoading && (
            <LoadingState
              variant="spinner"
              size="small"
              text="Updating routes..."
            />
          )}

          {/* Available Routes Section */}
          {hasInitiallyLoaded && (
            <Box>
              {isLoading && filteredAvailableRoutes.length === 0 ? (
                <LoadingState
                  variant="skeleton"
                  size="medium"
                  text="Loading available routes..."
                />
              ) : (
                <RoutesList
                  title="Available Routes"
                  routes={filteredAvailableRoutes as any}
                  isFavoriteList={false}
                  onToggleRoute={handleToggleRoute}
                  maxHeight={400}
                />
              )}
            </Box>
          )}

          {/* Status Messages - Only show when not in initial isLoading */}
          {hasInitiallyLoaded && (
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
          )}
        </Stack>
      </InfoCard>
    </Box>
  );
};

export default SettingsRoute;