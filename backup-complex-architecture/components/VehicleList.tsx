// VehicleList - Simple display component (< 50 lines)
// Uses raw API field names directly

import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Chip, 
  Box 
} from '@mui/material';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';

interface VehicleListProps {
  vehicles: TranzyVehicleResponse[];
}

export const VehicleList: React.FC<VehicleListProps> = ({ vehicles }) => {
  if (vehicles.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No vehicles found
      </Typography>
    );
  }

  return (
    <List>
      {vehicles.map((vehicle) => (
        <ListItem key={vehicle.vehicle_id} divider>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1">
                  Vehicle {vehicle.vehicle_id}
                </Typography>
                {vehicle.route_id && (
                  <Chip 
                    label={`Route ${vehicle.route_id}`} 
                    size="small" 
                    color="primary" 
                  />
                )}
              </Box>
            }
            secondary={
              `Lat: ${vehicle.position_latitude}, Lon: ${vehicle.position_longitude}` +
              (vehicle.speed ? ` | Speed: ${vehicle.speed} km/h` : '') +
              (vehicle.bearing ? ` | Bearing: ${vehicle.bearing}°` : '')
            }
          />
        </ListItem>
      ))}
    </List>
  );
};