// StationView - Clean view component always showing nearby stations
// Orchestrates header, list, and empty state components

import { useEffect } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Button
} from '@mui/material';
import { useStationStore } from '../../../stores/stationStore';
import { useConfigStore } from '../../../stores/configStore';
import { useStationFilter } from '../../../hooks/useStationFilter';
import { StationList } from '../lists/StationList';
import { StationEmptyState } from '../states/StationEmptyState';

export const StationView: FC = () => {
  const { loadStops } = useStationStore();
  const { apiKey, agency_id } = useConfigStore();
  const { 
    filteredStations, 
    loading, 
    error, 
    retryFiltering,
    utilities
  } = useStationFilter();

  useEffect(() => {
    if (apiKey && agency_id) {
      loadStops();
    }
  }, [apiKey, agency_id, loadStops]);

  if (!apiKey || !agency_id) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Please configure your API key and agency in settings
      </Alert>
    );
  }

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
      <StationList 
        stations={filteredStations} 
        utilities={utilities}
      />
      
      <StationEmptyState
        filteredCount={filteredStations.length}
      />
    </Box>
  );
};