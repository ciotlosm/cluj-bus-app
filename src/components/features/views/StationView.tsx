// StationView - Clean view component always showing nearby stations
// Orchestrates header, list, and empty state components
// Requirement 7.6, 7.7: Handle first load scenarios with proper user feedback

import type { FC } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Button
} from '@mui/material';
import { useStationStore } from '../../../stores/stationStore';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { useConfigStore } from '../../../stores/configStore';
import { useStationFilter } from '../../../hooks/useStationFilter';
import { StationList } from '../lists/StationList';
import { StationEmptyState } from '../states/StationEmptyState';
import { FirstTimeLoadingState } from '../states/FirstTimeLoadingState';

export const StationView: FC = () => {
  // Use selectors to prevent unnecessary re-renders
  const stops = useStationStore(state => state.stops);
  const stationLoading = useStationStore(state => state.loading);
  const vehicleLoading = useVehicleStore(state => state.loading);
  const vehicleLastUpdated = useVehicleStore(state => state.lastUpdated);
  const apiKey = useConfigStore(state => state.apiKey);
  const agency_id = useConfigStore(state => state.agency_id);
  
  const { 
    filteredStations, 
    loading, 
    processing,
    error, 
    retryFiltering,
    utilities
  } = useStationFilter();

  // Note: Data loading is handled by automaticRefreshService on app startup
  // No need to trigger loading here - it creates duplicate requests

  if (!apiKey || !agency_id) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Please configure your API key and agency in settings
      </Alert>
    );
  }

  // Show first-time loading state when cache is empty and data is loading
  // Requirement 7.6: Display loading states when cache is empty on first load
  if (loading && stops.length === 0 && vehicles.length === 0) {
    return (
      <FirstTimeLoadingState 
        message="Loading nearby stations..."
        subMessage="Getting transit data for your area"
      />
    );
  }

  // Show regular loading state for subsequent loads
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
            onClick={() => retryFiltering()}
          >
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Small processing spinner - non-blocking */}
      {processing && (
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 1 
        }}>
          <CircularProgress size={16} />
        </Box>
      )}
      
      <StationList 
        stations={filteredStations} 
        utilities={utilities}
        vehicleRefreshTimestamp={vehicleLastUpdated}
        vehicleLoading={vehicleLoading}
      />
      
      <StationEmptyState
        filteredCount={filteredStations.length}
        processing={processing}
        hasStops={stops.length > 0}
      />
    </Box>
  );
};