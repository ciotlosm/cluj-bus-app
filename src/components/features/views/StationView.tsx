// StationView - Clean view component with smart filtering
// Orchestrates header, list, and empty state components

import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Button,
  Divider
} from '@mui/material';
import { useStationStore } from '../../../stores/stationStore';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { useRouteStore } from '../../../stores/routeStore';
import { useTripStore } from '../../../stores/tripStore';
import { useStationFilter } from '../../../hooks/useStationFilter';
import { StationViewHeader } from '../headers/StationViewHeader';
import { StationList } from '../lists/StationList';
import { StationEmptyState } from '../states/StationEmptyState';
import { VehicleMapDialog } from '../maps/VehicleMapDialog';

export const StationView: FC = () => {
  const { loadStops, stops } = useStationStore();
  const { vehicles, loadVehicles } = useVehicleStore();
  const { routes, loadRoutes } = useRouteStore();
  const { stopTimes, trips, loadStopTimes, loadTrips } = useTripStore();
  const { 
    filteredStations, 
    loading, 
    error, 
    isFiltering, 
    totalStations, 
    toggleFiltering, 
    retryFiltering,
    utilities,
    favoritesFilterEnabled,
    toggleFavoritesFilter,
    hasFavoriteRoutes
  } = useStationFilter();

  // Vehicle map dialog state
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  // Handle vehicle click to open map dialog
  const handleVehicleClick = (vehicleId: number, stationId?: number) => {
    // Only open dialog if we have vehicle data
    if (vehicles.length === 0) {
      console.warn('No vehicle data available for map display');
      return;
    }
    
    setSelectedVehicleId(vehicleId);
    setSelectedStationId(stationId || null);
    setMapDialogOpen(true);
  };

  // Close map dialog
  const handleCloseMapDialog = () => {
    setMapDialogOpen(false);
    setSelectedVehicleId(null);
    setSelectedStationId(null);
  };

  useEffect(() => {
    loadStops();
    loadVehicles();
    loadRoutes();
    loadStopTimes();
    loadTrips();
  }, [loadStops, loadVehicles, loadRoutes, loadStopTimes, loadTrips]);

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
        favoritesFilterEnabled={favoritesFilterEnabled}
        toggleFavoritesFilter={toggleFavoritesFilter}
        hasFavoriteRoutes={hasFavoriteRoutes}
      />
      
      <Divider />
      
      <StationList 
        stations={filteredStations} 
        utilities={utilities}
        isFiltering={isFiltering}
        onVehicleClick={handleVehicleClick}
      />
      
      <StationEmptyState
        filteredCount={filteredStations.length}
        totalCount={totalStations}
        isFiltering={isFiltering}
        onShowAll={toggleFiltering}
      />

      {/* Vehicle Map Dialog */}
      <VehicleMapDialog
        open={mapDialogOpen}
        onClose={handleCloseMapDialog}
        vehicleId={selectedVehicleId}
        targetStationId={selectedStationId}
        vehicles={vehicles}
        routes={routes}
        stations={stops}
        trips={trips}
        stopTimes={stopTimes}
      />
    </Box>
  );
};