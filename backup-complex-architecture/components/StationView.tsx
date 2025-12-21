// StationView - Core view component for stations (< 80 lines)
// Displays raw API data directly

import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemText 
} from '@mui/material';
import { useStationStore } from '../stores/stationStore';
import { useConfigStore } from '../stores/configStore';

export const StationView: React.FC = () => {
  const { stops, loading, error, loadStops } = useStationStore();
  const { agency_id } = useConfigStore();

  useEffect(() => {
    if (agency_id) {
      loadStops(agency_id);
    }
  }, [agency_id, loadStops]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!agency_id) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Please configure your agency in settings
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
        Stations
      </Typography>
      
      <List>
        {stops.map((stop) => (
          <ListItem key={stop.stop_id} divider>
            <ListItemText
              primary={stop.stop_name}
              secondary={`ID: ${stop.stop_id} | Lat: ${stop.stop_lat}, Lon: ${stop.stop_lon}`}
            />
          </ListItem>
        ))}
      </List>
      
      {stops.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No stations found
        </Typography>
      )}
    </Box>
  );
};