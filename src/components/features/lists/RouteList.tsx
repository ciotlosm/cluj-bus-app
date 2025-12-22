// RouteList - Simple display component for enhanced routes
// Uses raw API field names directly with enhanced route data

import type { FC } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Chip, 
  Box 
} from '@mui/material';
import type { EnhancedRoute } from '../../../types/routeFilter';
import { getRouteTypeLabel } from '../../../types/rawTranzyApi';

interface RouteListProps {
  routes: EnhancedRoute[];
}

const getRouteTypeColor = (routeType: number): 'primary' | 'secondary' | 'default' => {
  switch (routeType) {
    case 0: return 'secondary'; // Tram
    case 3: return 'primary';   // Bus
    case 11: return 'default';  // Trolleybus
    default: return 'default';
  }
};

export const RouteList: FC<RouteListProps> = ({ routes }) => {
  if (routes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No routes found
      </Typography>
    );
  }

  return (
    <List>
      {routes.map((route) => (
        <ListItem key={route.route_id} divider>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" component="span">
                  {route.route_short_name}
                </Typography>
                {route.route_color && (
                  <Box
                    component="span"
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: `#${route.route_color}`,
                      border: '1px solid rgba(0,0,0,0.1)',
                      display: 'inline-block'
                    }}
                  />
                )}
                <Chip 
                  label={getRouteTypeLabel(route.route_type)} 
                  size="small" 
                  color={getRouteTypeColor(route.route_type)}
                />
              </Box>
            }
            secondary={
              <>
                <Typography variant="body2" color="text.primary" component="div">
                  {route.route_long_name}
                </Typography>
                {route.route_desc && (
                  <Typography variant="body2" color="text.secondary" component="div">
                    {route.route_desc}
                  </Typography>
                )}
              </>
            }
            slotProps={{
              primary: { component: 'div' },
              secondary: { component: 'div' }
            }}
          />
        </ListItem>
      ))}
    </List>
  );
};