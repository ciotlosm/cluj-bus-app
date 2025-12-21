// VehicleView - Core view component for vehicles (< 80 lines)
// Displays raw API data directly

import { useEffect } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Button
} from '@mui/material';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { useConfigStore } from '../../../stores/configStore';
import { VehicleList } from './VehicleList';

export const VehicleView: FC = () => {
  const { vehicles, loading, error, loadVehicles } = useVehicleStore();
  const { apiKey, agency_id } = useConfigStore();

  useEffect(() => {
    if (apiKey && agency_id) {
      loadVehicles(apiKey, agency_id);
    }
  }, [apiKey, agency_id, loadVehicles]);

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
                loadVehicles(apiKey, agency_id);
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
        Live Vehicles
      </Typography>
      
      <VehicleList vehicles={vehicles} />
      
      {vehicles.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No vehicles found
        </Typography>
      )}
    </Box>
  );
};
