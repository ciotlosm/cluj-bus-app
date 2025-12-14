import React from 'react';
import {
  Box,
  Typography,
  Card,
  List,
} from '@mui/material';
import { RouteListItem } from './RouteListItem';
// Define the route type used by the store
type StoreRoute = {
  shortName: string; // PRIMARY: What users see and interact with
  name?: string;
  longName?: string; // This corresponds to route_long_desc from the API
  description?: string;
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
      <Card 
        variant="outlined" 
        sx={{ 
          mb: isFavoriteList ? 3 : 0,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          overflow: maxHeight ? 'auto' : 'visible'
        }}
      >
        <List sx={{ py: 0 }}>
          {routes.map((route, index) => (
            <RouteListItem
              key={route.shortName}
              route={route}
              isFavorite={isFavoriteList}
              onToggle={onToggleRoute}
              isLast={index === routes.length - 1}
            />
          ))}
        </List>
      </Card>
    </Box>
  );
};