import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { RouteListItem } from './RouteListItem';
// Define the route type used by the store
type StoreRoute = {
  id: string; // Internal route ID for API calls ("40", "42", etc.)
  routeName: string; // route_short_name: What users see and interact with ("100", "101")
  routeDesc?: string; // route_long_name: Full description ("Piața Unirii - Mănăștur")
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
};

interface RoutesListProps {
  title: string;
  routes: StoreRoute[];
  isFavoriteList?: boolean;
  onToggleRoute: (routeShortName: string) => Promise<void>;
  maxHeight?: number;
}

export const RoutesList: React.FC<RoutesListProps> = ({
  title,
  routes,
  isFavoriteList = false,
  onToggleRoute,
  maxHeight,
}) => {
  if (routes.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 2, 
          fontWeight: 600,
          color: isFavoriteList ? 'primary.main' : 'text.primary'
        }}
      >
        {title}
      </Typography>
      <Box 
        sx={{ 
          mb: isFavoriteList ? 3 : 0,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          overflow: maxHeight ? 'auto' : 'visible'
        }}
      >
        {routes.map((route, index) => (
          <RouteListItem
            key={route.routeName}
            route={route}
            isFavorite={isFavoriteList}
            onToggle={onToggleRoute}
            isLast={index === routes.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};