// StopList - Simple display component (< 40 lines)
// Uses raw API field names directly

import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  Typography 
} from '@mui/material';
import type { TranzyStopResponse } from '../types/rawTranzyApi';

interface StopListProps {
  stops: TranzyStopResponse[];
}

export const StopList: React.FC<StopListProps> = ({ stops }) => {
  if (stops.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No stops found
      </Typography>
    );
  }

  return (
    <List>
      {stops.map((stop) => (
        <ListItem key={stop.stop_id} divider>
          <ListItemText
            primary={stop.stop_name}
            secondary={
              `Stop ID: ${stop.stop_id} | ` +
              `Location: ${stop.stop_lat}, ${stop.stop_lon}` +
              (stop.stop_code ? ` | Code: ${stop.stop_code}` : '')
            }
          />
        </ListItem>
      ))}
    </List>
  );
};