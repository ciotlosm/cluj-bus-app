import React from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Box,
  Typography,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { getRouteTypeInfo } from '../../../../utils/routeUtils';
// Define the route type used by the store
type StoreRoute = {
  id: string; // Internal route ID for API calls ("40", "42", etc.)
  routeName: string; // route_short_name: What users see and interact with ("100", "101")
  routeDesc?: string; // route_long_name: Full description ("Piața Unirii - Mănăștur")
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
};

interface RouteListItemProps {
  route: StoreRoute;
  isFavorite: boolean;
  onToggle: (routeShortName: string) => Promise<void>;
  isLast?: boolean;
}

export const RouteListItem: React.FC<RouteListItemProps> = ({
  route,
  isFavorite,
  onToggle,
  isLast = false,
}) => {
  const theme = useTheme();
  const routeTypeInfo = getRouteTypeInfo(route.type, theme);

  return (
    <ListItem
      sx={{
        borderBottom: !isLast ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
        bgcolor: isFavorite 
          ? alpha(theme.palette.success.main, 0.02)
          : 'transparent',
        '&:hover': {
          bgcolor: isFavorite
            ? alpha(theme.palette.success.main, 0.06)
            : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <ListItemIcon>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: alpha(routeTypeInfo.color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}
        >
          {routeTypeInfo.icon}
        </Box>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {route.routeName}
            </Typography>
            <Chip
              label={routeTypeInfo.label}
              size="small"
              sx={{
                bgcolor: alpha(routeTypeInfo.color, 0.1),
                color: routeTypeInfo.color,
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 20,
              }}
            />
            {isFavorite && (
              <Chip
                label="Favorite"
                size="small"
                color="success"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
          </Stack>
        }
        secondary={
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
            }}
          >
            {route.routeDesc || 'No description available'}
          </Typography>
        }
      />
      
      <Box sx={{ ml: 'auto' }}>
        <Checkbox
          edge="end"
          checked={isFavorite}
          onChange={() => {
            onToggle(route.routeName).catch(error => {
              console.error('Failed to toggle route:', error);
            });
          }}
          icon={<FavoriteBorderIcon />}
          checkedIcon={<FavoriteIcon />}
          sx={{
            color: isFavorite ? theme.palette.error.main : theme.palette.text.secondary,
            '&.Mui-checked': {
              color: theme.palette.error.main,
            },
          }}
        />
      </Box>
    </ListItem>
  );
};