// StationView - Core view component for stations (< 80 lines)
// Displays raw API data directly

import { useEffect } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemText,
  Button
} from '@mui/material';
import { useStationStore } from '../../stores/stationStore';
import { useConfigStore } from '../../stores/configStore';

export const StationView: FC = () => {
  const { stops, loading, error, loadStops } = useStationStore();
  const { apiKey, agency_id } = useConfigStore();

  useEffect(() => {
    if (apiKey && agency_id) {
      loadStops(apiKey, agency_id);
    }
  }, [apiKey, agency_id, loadStops]);

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
                loadStops(apiKey, agency_id);
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