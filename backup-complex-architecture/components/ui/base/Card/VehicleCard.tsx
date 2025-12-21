import React from 'react';
import {
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  CloudOff as OfflineIcon,
  Schedule as StaleIcon,
} from '@mui/icons-material';
import { Card } from './BaseCard';
import { AutoRefreshIndicator } from '../../feedback/RefreshIndicator';
import { useThemeUtils, useMuiUtils } from '../../../../hooks';

// Vehicle Card Component Props (specialized variant)
export interface SimpleVehicleCardProps {
  routeId: string;
  destination?: string;
  arrivalTime: string;
  isRealTime?: boolean;
  onMapClick?: () => void;
  mapButtonStyle?: 'overlay' | 'inline' | 'corner';
  delay?: number;
  location?: string;
  customContent?: React.ReactNode;
  arrivalStatus?: {
    message: string;
    color: string;
    isOffline?: boolean;
    isStale?: boolean;
    vehicleId?: string;
    vehicleLabel?: string;
    lastUpdate?: Date;
  };
  loading?: boolean;
  error?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
  cacheKeys?: string | string[];
}

// Vehicle Card Component - Specialized card for vehicle/bus information
export const SimpleVehicleCard: React.FC<VehicleCardProps> = ({
  routeId,
  destination,
  arrivalTime,
  isRealTime = false,
  onMapClick,
  mapButtonStyle = 'corner',
  delay = 0,
  location,
  customContent,
  arrivalStatus,
  isLoading = false,
  error = false,
  children,
  cacheKeys,
}) => {
  const { getDelayColor, getRouteColor, alpha, theme } = useThemeUtils();
  const { getAvatarStyles } = useMuiUtils();

  const cardContent = (
    <Card variant="elevated" isLoading={isLoading} hasError={error} sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 0.25, pt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
          <Box sx={{ position: 'relative', mr: 2 }}>
            <Avatar
              sx={{
                ...getAvatarStyles('route', 44),
                bgcolor: getRouteColor(routeId),
              }}
            >
              {routeId}
            </Avatar>
            {onMapClick && mapButtonStyle === 'overlay' && (
              <Tooltip title="View on map" placement="top">
                <IconButton
                  size="small"
                  onClick={onMapClick}
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    boxShadow: theme.shadows[3],
                    width: 28,
                    height: 28,
                    border: `2px solid ${theme.palette.background.paper}`,
                    '&:hover': {
                      bgcolor: theme.palette.primary.dark,
                      transform: 'scale(1.1)',
                      boxShadow: theme.shadows[4],
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <MapIcon sx={{ fontSize: 16, fontWeight: 'bold' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Arrival Status */}
            {arrivalStatus && (
              <Box sx={{ mb: 0.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: arrivalStatus.color,
                      fontSize: '0.75rem',
                    }}
                  >
                    {(() => {
                      const message = arrivalStatus.message;
                      const timeMatch = message.match(/^(.+?)(\s*\([^)]+\))$/);
                      
                      if (timeMatch) {
                        const [, mainMessage] = timeMatch;
                        return mainMessage;
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
                      titleAccess="Using offline estimates - Live data temporarily unavailable"
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
                
                {arrivalStatus.lastUpdate && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.75rem' }}>
                      Live
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'grey.500', fontSize: '0.7rem' }}>
                      {(() => {
                        const timestamp = arrivalStatus.lastUpdate instanceof Date 
                          ? arrivalStatus.lastUpdate 
                          : new Date(arrivalStatus.lastUpdate);
                        
                        return timestamp.toLocaleTimeString('en-US', { 
                          hour12: false, 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        });
                      })()}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {customContent ? (
              <Box sx={{ mb: 0.5 }}>
                {customContent}
              </Box>
            ) : (
              <>
                {destination && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
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
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
            {onMapClick && mapButtonStyle === 'inline' && (
              <Tooltip title="View on map" placement="top">
                <IconButton
                  size="small"
                  onClick={onMapClick}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    width: 32,
                    height: 32,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <MapIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        {children}
      </CardContent>
      
      {onMapClick && mapButtonStyle === 'corner' && (
        <Tooltip 
          title={`View on map${arrivalStatus?.vehicleLabel ? ` - Vehicle: ${arrivalStatus.vehicleLabel}` : ''}`} 
          placement="top"
        >
          <IconButton
            size="small"
            onClick={onMapClick}
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: theme.palette.primary.main,
              color: 'white',
              width: 24,
              height: 24,
              boxShadow: theme.shadows[2],
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
                transform: 'scale(1.1)',
                boxShadow: theme.shadows[3],
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <MapIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Card>
  );

  if (cacheKeys) {
    return (
      <AutoRefreshIndicator cacheKeys={cacheKeys} position="top-right">
        {cardContent}
      </AutoRefreshIndicator>
    );
  }

  return cardContent;
};

export default SimpleVehicleCard;