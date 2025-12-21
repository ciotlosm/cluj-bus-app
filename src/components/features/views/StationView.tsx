// StationView - Clean view component with smart filtering
// Orchestrates header, list, and empty state components

import { useEffect } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Button,
  Divider
} from '@mui/material';
import { useStationStore } from '../../../stores/stationStore';
import { useTripStore } from '../../../stores/tripStore';
import { useConfigStore } from '../../../stores/configStore';
import { useSmartStationFilter } from '../../../hooks/useSmartStationFilter';
import { StationViewHeader } from '../headers/StationViewHeader';
import { StationList } from '../lists/StationList';
import { StationEmptyState } from '../states/StationEmptyState';

export const StationView: FC = () => {
  const { loadStops } = useStationStore();
  const { loadStopTimes } = useTripStore();
  const { apiKey, agency_id } = useConfigStore();
  const { 
    filteredStations, 
    loading, 
    error, 
    isFiltering, 
    totalStations, 
    toggleFiltering, 
    retryFiltering,
    utilities
  } = useSmartStationFilter();

  useEffect(() => {
    loadStops();
    
    // Load stop times if we have the required config
    if (apiKey && agency_id) {
      loadStopTimes(apiKey, agency_id);
    }
  }, [loadStops, loadStopTimes, apiKey, agency_id]);

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

  const hasActiveTrips = filteredStations.some(fs => fs.hasActiveTrips);

  return (
    <Box>
      <StationViewHeader
        isFiltering={isFiltering}
        toggleFiltering={toggleFiltering}
        filteredCount={filteredStations.length}
        totalCount={totalStations}
        hasActiveTrips={hasActiveTrips}
      />
      
      <Divider />
      
      <StationList 
        stations={filteredStations} 
        utilities={utilities}
      />
      
      <StationEmptyState
        filteredCount={filteredStations.length}
        totalCount={totalStations}
        isFiltering={isFiltering}
        onShowAll={toggleFiltering}
      />
    </Box>
  );
};