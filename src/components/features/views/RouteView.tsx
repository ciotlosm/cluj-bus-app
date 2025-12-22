// RouteView - Core view component for routes with filtering capability
// Displays filtered route data with loading, error, and success states

import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Button
} from '@mui/material';
import { useRouteStore } from '../../../stores/routeStore';
import { useConfigStore } from '../../../stores/configStore';
import { RouteList } from '../lists/RouteList';
import { RouteFilterBar } from '../filters/RouteFilterBar';
import { useRouteFilter } from '../../../hooks/useRouteFilter';
import { DEFAULT_FILTER_STATE } from '../../../types/routeFilter';
import type { RouteFilterState } from '../../../types/routeFilter';

export const RouteView: FC = () => {
  const { routes, loading, error, loadRoutes } = useRouteStore();
  const { apiKey, agency_id } = useConfigStore();
  
  // Local state for filter management
  const [filterState, setFilterState] = useState<RouteFilterState>(DEFAULT_FILTER_STATE);
  
  // Use the custom hook for route enhancement and filtering
  const { filteredRoutes } = useRouteFilter(routes, filterState);

  useEffect(() => {
    if (apiKey && agency_id) {
      loadRoutes(apiKey, agency_id);
    }
  }, [apiKey, agency_id, loadRoutes]);

  /**
   * Handle filter state changes from RouteFilterBar
   */
  const handleFilterChange = (newFilterState: RouteFilterState) => {
    setFilterState(newFilterState);
  };

  useEffect(() => {
    if (apiKey && agency_id) {
      loadRoutes(apiKey, agency_id);
    }
  }, [apiKey, agency_id, loadRoutes]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => {
              if (apiKey && agency_id) {
                loadRoutes(apiKey, agency_id);
              }
            }}
          >
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!apiKey || !agency_id) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Please configure your API key and agency in settings
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
        Routes
      </Typography>
      
      {/* Filter bar - only show when routes are loaded */}
      {routes.length > 0 && (
        <RouteFilterBar
          filterState={filterState}
          onFilterChange={handleFilterChange}
          routeCount={filteredRoutes.length}
        />
      )}
      
      <RouteList routes={filteredRoutes} />
      
      {routes.length > 0 && filteredRoutes.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No routes match the current filters
        </Typography>
      )}
      
      {routes.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No routes found
        </Typography>
      )}
    </Box>
  );
};