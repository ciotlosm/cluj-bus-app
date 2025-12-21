// StationList - Clean display component following VehicleList pattern
// Displays filtered stations with distance and trip information

import type { FC } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText,
  Typography, 
  Chip, 
  Stack
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  DirectionsBus as BusIcon
} from '@mui/icons-material';
import type { FilteredStation } from '../../../types/smartStationFilter';

interface StationListProps {
  stations: FilteredStation[];
  utilities: {
    formatDistance: (distance: number) => string;
    getStationTypeColor: (stationType: 'primary' | 'secondary') => 'primary' | 'secondary';
    getStationTypeLabel: (stationType: 'primary' | 'secondary') => string;
  };
}

export const StationList: FC<StationListProps> = ({ stations, utilities }) => {
  const { formatDistance, getStationTypeColor, getStationTypeLabel } = utilities;

  if (stations.length === 0) {
    return null; // Empty state handled by parent component
  }

  return (
    <List>
      {stations.map((filteredStation) => {
        const { station, distance, hasActiveTrips, stationType } = filteredStation;
        
        return (
          <ListItem key={station.stop_id} divider>
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography variant="subtitle1" component="span">
                    {station.stop_name}
                  </Typography>
                  
                  {/* Primary/Secondary station indicator */}
                  <Chip
                    label={getStationTypeLabel(stationType)}
                    size="small"
                    color={getStationTypeColor(stationType)}
                    variant="filled"
                  />
                  
                  {/* Trip validation status */}
                  {hasActiveTrips && (
                    <Chip
                      icon={<BusIcon />}
                      label="Active"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </Stack>
              }
              secondary={
                <>
                  {/* Distance information */}
                  <Typography variant="body2" color="text.secondary" component="span">
                    <LocationIcon fontSize="small" color="action" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    {formatDistance(distance)} away
                  </Typography>
                  <br />
                  
                  {/* Station details */}
                  <Typography variant="body2" color="text.secondary" component="span">
                    ID: {station.stop_id} | Lat: {station.stop_lat}, Lon: {station.stop_lon}
                  </Typography>
                </>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
};