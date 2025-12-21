import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  LocationOn as LocationIcon,
  Map as MapIcon,
  CloudOff as OfflineIcon,
  Schedule as StaleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AutoRefreshIndicator } from '../../feedback/RefreshIndicator';
import { useThemeUtils, useMuiUtils, useComponentStyles } from '../../../../hooks';

// Temporary fix - define types locally
interface StandardCardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: (event: React.MouseEvent) => void;
}

// Base Card Component Props
interface BaseCardProps extends StandardCardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  isInteractive?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  children: React.ReactNode;
  sx?: any;
  className?: string;
  onClick?: () => void;
  // Legacy prop support
  interactive?: boolean;
  loading?: boolean;
  error?: boolean;
}

interface VehicleCardProps extends BaseCardProps {
  isLoading?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

// Loading State Component Props
interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullHeight?: boolean;
}

// Error State Component Props
interface ErrorStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'inline' | 'page' | 'card';
}

// Data Card Component Props
interface DataCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  error?: boolean;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
  isLoading?: boolean;
}

// Vehicle Card Component Props (specialized variant)
interface VehicleCardProps {
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
  cacheKeys?: string | string[];
}

// Info Card Component Props (specialized variant)
interface InfoCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  loading?: boolean;
  error?: boolean;
  isLoading?: boolean;
}

// Base Card Component - Foundation for all card variants
export const Card: React.FC<BaseCardProps> = ({
  variant = 'elevated',
  padding = 'medium',
  isInteractive = false,
  isLoading = false,
  hasError = false,
  children,
  sx,
  className,
  onClick,
  // Legacy prop support
  interactive,
  loading,
  error,
}) => {
  const { getCardVariantStyles, getComponentStateStyles } = useComponentStyles();
  const { alpha, theme } = useThemeUtils();

  // Handle legacy prop names for backward compatibility
  const actualInteractive = isInteractive || interactive || false;
  const actualLoading = isLoading || isLoading || false;
  const actualError = hasError || error || false;

  const cardStyles = getCardVariantStyles(variant, padding);
  const interactiveStyles = actualInteractive ? getComponentStateStyles('card', {
    hover: true,
    focus: !!onClick,
    active: !!onClick,
  }) : {};

  if (actualLoading) {
    return (
      <MuiCard
        sx={{
          ...cardStyles,
          ...sx,
        }}
        className={className}
      >
        <CardLoadingState variant="skeleton" fullHeight />
      </MuiCard>
    );
  }

  if (actualError) {
    return (
      <MuiCard
        sx={{
          ...cardStyles,
          borderColor: theme.palette.error.main,
          bgcolor: alpha(theme.palette.error.main, 0.04),
          ...sx,
        }}
        className={className}
      >
        <CardErrorState
          title="Error"
          message="Something went wrong"
          variant="card"
        />
      </MuiCard>
    );
  }

  return (
    <MuiCard
      sx={{
        ...cardStyles,
        ...interactiveStyles,
        cursor: onClick ? 'pointer' : 'default',
        ...sx,
      }}
      className={className}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </MuiCard>
  );
};

// Card Loading State Component
export const CardLoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'medium',
  text,
  fullHeight = false,
}) => {
  const { getLoadingStateStyles } = useComponentStyles();
  const { getSpacing } = useThemeUtils();
  const spacing = getSpacing();

  const loadingStyles = getLoadingStateStyles(variant, size);

  const containerStyles = {
    ...loadingStyles,
    minHeight: fullHeight ? '200px' : 'auto',
    padding: spacing.md,
    flexDirection: 'column' as const,
    gap: spacing.sm,
  };

  if (variant === 'skeleton') {
    return (
      <Box sx={containerStyles}>
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="rectangular" width="100%" height={60} />
      </Box>
    );
  }



  return (
    <Box sx={containerStyles}>
      <CircularProgress size={size === 'small' ? 20 : size === 'large' ? 48 : 32} />
      {text && (
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      )}
    </Box>
  );
};

// Card Error State Component
export const CardErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  action,
  variant = 'card',
}) => {
  const { getSpacing, alpha, theme } = useThemeUtils();
  const spacing = getSpacing();

  const containerStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: spacing.sm,
    padding: variant === 'page' ? spacing.xl : spacing.md,
    textAlign: 'center' as const,
  };

  return (
    <Box sx={containerStyles}>
      <ErrorIcon 
        sx={{ 
          fontSize: variant === 'page' ? 48 : 32,
          color: theme.palette.error.main,
          mb: spacing.xs,
        }} 
      />
      <Typography 
        variant={variant === 'page' ? 'h5' : 'h6'} 
        color="error.main"
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ maxWidth: '300px' }}
      >
        {message}
      </Typography>
      {action && (
        <IconButton
          onClick={action.onClick}
          sx={{
            mt: spacing.xs,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.2),
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
      )}
    </Box>
  );
};

// Data Card Component - Enhanced card with header, status, and actions
export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  icon,
  actions,
  status,
  isLoading = false,
  error = false,
  variant = 'elevated',
  padding = 'medium',
  children,
}) => {
  const { getStatusColors, alpha, theme } = useThemeUtils();
  const { getAvatarStyles } = useMuiUtils();

  const statusColors = getStatusColors();
  const statusColor = status ? statusColors[status] : null;

  return (
    <Card variant={variant} padding={padding} isLoading={isLoading} error={error}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && (
            <Avatar
              sx={{
                ...getAvatarStyles('primary', 40),
                bgcolor: statusColor ? statusColor.light : alpha(theme.palette.primary.main, 0.1),
                color: statusColor ? statusColor.main : theme.palette.primary.main,
                mr: 2,
              }}
            >
              {icon}
            </Avatar>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {status && (
            <Chip
              label={status}
              size="small"
              sx={{
                bgcolor: statusColor?.light,
                color: statusColor?.main,
                border: `1px solid ${statusColor?.border}`,
                textTransform: 'capitalize',
              }}
            />
          )}
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

// Vehicle Card Component - Specialized card for vehicle/bus information
export const VehicleCard: React.FC<VehicleCardProps> = ({
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
    <Card variant="elevated" isLoading={isLoading} error={error} sx={{ mb: 1.5 }}>
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

// Info Card Component - Specialized card for informational content
export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  actions,
  variant = 'elevated',
  padding = 'medium',
  isLoading = false,
  error = false,
}) => {
  const { alpha, theme } = useThemeUtils();
  
  return (
    <Card variant={variant} padding={padding} isLoading={isLoading} error={error} sx={{ mb: 2 }}>
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

// Export internal components with expected names for testing
export const CardLoadingStateComponent = CardLoadingState;
export const CardErrorStateComponent = CardErrorState;

export default Card;