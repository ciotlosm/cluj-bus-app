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
import { useStationFilter } from '../../../hooks/useStationFilter';
import { StationViewHeader } from '../headers/StationViewHeader';
import { StationList } from '../lists/StationList';
import { StationEmptyState } from '../states/StationEmptyState';

export const StationView: FC = () => {
  const { loadStops } = useStationStore();
  const { 
    filteredStations, 
    loading, 
    error, 
    isFiltering, 
    totalStations, 
    toggleFiltering, 
    retryFiltering,
    utilities
  } = useStationFilter();

  useEffect(() => {
    loadStops();
  }, [loadStops]);

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
    <Box>
      <StationViewHeader
        isFiltering={isFiltering}
        toggleFiltering={toggleFiltering}
        filteredCount={filteredStations.length}
        totalCount={totalStations}
      />
      
      <Divider />
      
      <StationList 
        stations={filteredStations} 
        utilities={utilities}
        isFiltering={isFiltering}
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