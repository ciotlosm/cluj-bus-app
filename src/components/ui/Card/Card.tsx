import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Map as MapIcon,
  CloudOff as OfflineIcon,
  Schedule as StaleIcon,
} from '@mui/icons-material';
import { AutoRefreshIndicator } from '../RefreshIndicator';

interface BusCardProps {
  routeId: string;
  routeName?: string;
  destination?: string;
  arrivalTime: string;
  isRealTime?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onMapClick?: () => void;
  delay?: number;
  location?: string;
  customContent?: React.ReactNode; // Custom content to replace destination/location
  arrivalStatus?: {
    message: string;
    color: string;
    isOffline?: boolean;
    isStale?: boolean;
    vehicleId?: string;
    vehicleLabel?: string;
    lastUpdate?: Date;
  };
  children?: React.ReactNode;
  cacheKeys?: string | string[]; // Cache keys to monitor for refresh indicators
}

export const BusCard: React.FC<BusCardProps> = ({
  routeId,
  routeName,
  destination,
  arrivalTime,
  isRealTime = false,
  isFavorite = false,
  onToggleFavorite,
  onMapClick,
  delay = 0,
  location,
  customContent,
  arrivalStatus,
  children,
  cacheKeys,
}) => {
  const theme = useTheme();
  
  const getDelayColor = (delay: number) => {
    if (delay <= 2) return theme.palette.success.main;
    if (delay <= 5) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getRouteColor = (routeId: string) => {
    // Generate a consistent color based on route ID
    const hash = routeId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const cardContent = (
    <Card
      sx={{
        mb: 1.5,
        borderRadius: 3,
        boxShadow: theme.shadows[2],
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ pb: 1, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ position: 'relative', mr: 2 }}>
            <Avatar
              sx={{
                bgcolor: getRouteColor(routeId),
                width: 44,
                height: 44,
                fontWeight: 'bold',
                fontSize: '0.85rem',
              }}
            >
              {routeId}
            </Avatar>
            {onMapClick && (
              <IconButton
                size="small"
                onClick={onMapClick}
                sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  bgcolor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                  width: 24,
                  height: 24,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <MapIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
              </IconButton>
            )}
          </Box>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Arrival Status */}
            {arrivalStatus && (
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: arrivalStatus.color,
                    fontSize: '0.75rem',
                  }}
                >
                  {(() => {
                    // Parse message to style time portion (text in parentheses)
                    const message = arrivalStatus.message;
                    const timeMatch = message.match(/^(.+?)(\s*\([^)]+\))$/);
                    
                    if (timeMatch) {
                      const [, mainMessage, timeText] = timeMatch;
                      
                      // Check if we should show tooltip (over 10 minutes)
                      const shouldShowTooltip = arrivalStatus.lastUpdate && 
                        Math.floor((Date.now() - arrivalStatus.lastUpdate.getTime()) / 1000 / 60) > 10;
                      
                      const timeElement = (
                        <Box
                          component="span"
                          sx={{
                            // Highlight timestamp in red if data is stale, otherwise gray
                            color: arrivalStatus.isStale 
                              ? theme.palette.error.main 
                              : theme.palette.text.secondary,
                            fontWeight: arrivalStatus.isStale ? 600 : 400,
                            textDecoration: shouldShowTooltip ? 'underline dotted' : 'none',
                            cursor: shouldShowTooltip ? 'help' : 'default',
                          }}
                        >
                          {timeText}
                        </Box>
                      );
                      
                      return (
                        <>
                          {mainMessage}
                          {shouldShowTooltip ? (
                            <Tooltip 
                              title={`Vehicle ID: ${arrivalStatus.vehicleId || 'Unknown'}\nLabel: ${arrivalStatus.vehicleLabel || 'Unknown'}`}
                              placement="top"
                              sx={{
                                '& .MuiTooltip-tooltip': {
                                  whiteSpace: 'pre-line', // Allow line breaks in tooltip
                                }
                              }}
                            >
                              {timeElement}
                            </Tooltip>
                          ) : (
                            timeElement
                          )}
                        </>
                      );
                    }
                    
                    return message;
                  })()}
                </Typography>
                {arrivalStatus.isOffline && (
                  <OfflineIcon 
                    sx={{ 
                      fontSize: 14, 
                      color: theme.palette.text.secondary,
                      opacity: 0.7 
                    }} 
                    titleAccess="Using offline estimates - Configure Google Maps API key for accurate ETAs"
                  />
                )}
                {arrivalStatus.isStale && (
                  <StaleIcon 
                    sx={{ 
                      fontSize: 14, 
                      color: theme.palette.warning.main,
                      opacity: 0.8 
                    }} 
                    titleAccess="Vehicle data is older than 2 minutes - Information may be outdated"
                  />
                )}
              </Box>
            )}
            
            {/* Custom content or default destination/location display */}
            {customContent ? (
              <Box sx={{ mb: 1 }}>
                {customContent}
              </Box>
            ) : (
              <>
                {destination && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {destination}
                    </Typography>
                  </Box>
                )}
                
                {location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BusIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {location}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {arrivalTime && (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: isRealTime ? theme.palette.success.main : theme.palette.text.primary,
                }}
              >
                {arrivalTime}
              </Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {delay > 0 && (
              <Chip
                label={`+${delay}min`}
                size="small"
                sx={{
                  bgcolor: alpha(getDelayColor(delay), 0.1),
                  color: getDelayColor(delay),
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            )}
          </Box>
        </Box>
        
        {children}
      </CardContent>
    </Card>
  );

  // Wrap with refresh indicator if cache keys are provided
  if (cacheKeys) {
    return (
      <AutoRefreshIndicator cacheKeys={cacheKeys} position="top-right">
        {cardContent}
      </AutoRefreshIndicator>
    );
  }

  return cardContent;
};

interface InfoCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  actions,
}) => {
  const theme = useTheme();
  
  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        boxShadow: theme.shadows[1],
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && (
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                mr: 2,
                width: 40,
                height: 40,
              }}
            >
              {icon}
            </Avatar>
          )}
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {children}
      </CardContent>
      {actions && (
        <CardActions sx={{ pt: 0 }}>
          {actions}
        </CardActions>
      )}
    </Card>
  );
};

export default BusCard;