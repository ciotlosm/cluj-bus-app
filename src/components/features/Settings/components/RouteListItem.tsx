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
  Card,
  CardContent,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { getRouteTypeInfo } from '../../../../utils/routeUtils';
import { useThemeUtils, useMuiUtils } from '../../../../hooks';
import { logger } from '../../../../utils/shared/logger';
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
  const { theme, getBackgroundColors, getBorderColors, alpha } = useThemeUtils();
  const { getCardStyles } = useMuiUtils();
  const routeTypeInfo = getRouteTypeInfo(route.type, theme);

  const backgrounds = getBackgroundColors();
  const borders = getBorderColors();

  return (
    <Card
      sx={{
        ...getCardStyles('glass'),
        mb: isLast ? 0 : 1,
        bgcolor: isFavorite 
          ? alpha(theme.palette.primary.main, 0.08)
          : backgrounds.paper,
        border: `1px solid ${isFavorite 
          ? alpha(theme.palette.primary.main, 0.3)
          : borders.divider}`,
        '&:hover': {
          bgcolor: isFavorite 
            ? alpha(theme.palette.primary.main, 0.12)
            : backgrounds.paperHover,
          border: `1px solid ${isFavorite 
            ? alpha(theme.palette.primary.main, 0.5)
            : borders.dividerMedium}`,
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Route Icon */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(routeTypeInfo.color, 0.1),
              border: `1px solid ${alpha(routeTypeInfo.color, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            {routeTypeInfo.icon}
          </Box>
          
          {/* Route Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {route.routeName}
              </Typography>
              <Chip
                label={routeTypeInfo.label}
                size="small"
                sx={{
                  bgcolor: alpha(routeTypeInfo.color, 0.1),
                  color: routeTypeInfo.color,
                  border: `1px solid ${alpha(routeTypeInfo.color, 0.3)}`,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22,
                }}
              />
              {isFavorite && (
                <Chip
                  label="Favorite"
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              )}
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.875rem',
              }}
            >
              {route.routeDesc || 'No description available'}
            </Typography>
          </Box>
          
          {/* Favorite Toggle */}
          <Box sx={{ flexShrink: 0 }}>
            <Checkbox
              checked={isFavorite}
              onChange={() => {
                onToggle(route.routeName).catch(error => {
                  logger.error('Failed to toggle route', error, 'ROUTE_LIST_ITEM');
                });
              }}
              icon={<FavoriteBorderIcon />}
              checkedIcon={<FavoriteIcon />}
              sx={{
                color: isFavorite ? theme.palette.primary.main : theme.palette.text.secondary,
                '&.Mui-checked': {
                  color: theme.palette.primary.main,
                },
                '&:hover': {
                  bgcolor: alpha(
                    isFavorite ? theme.palette.primary.main : theme.palette.text.secondary, 
                    0.1
                  ),
                },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};