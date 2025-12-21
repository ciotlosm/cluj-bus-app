import React from 'react';
import {
  Box,
  Chip,
  Avatar,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  LocationOn as LocationIcon,
  CloudOff as OfflineIcon,
  Schedule as StaleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useStatusPatterns, useInteractivePatterns, useThemeUtils } from '../../../hooks/shared';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared visual pattern components
 * Extracts common visual patterns used across multiple components
 * Validates Requirements: 6.2, 6.5
 */

// ============================================================================
// STATUS DOT COMPONENT
// ============================================================================

interface StatusDotProps {
  /** Minutes since last update */
  minutesSinceUpdate: number;
  /** Threshold for stale data in minutes */
  staleThreshold?: number;
  /** Whether the system is offline */
  isOffline?: boolean;
  /** Whether the item is departed/inactive */
  isDeparted?: boolean;
  /** Size of the status dot */
  size?: 'small' | 'medium' | 'large';
  /** Additional styling */
  sx?: SxProps<Theme>;
}

const StatusDot: React.FC<StatusDotProps> = ({
  minutesSinceUpdate,
  staleThreshold = 5,
  isOffline = false,
  isDeparted = false,
  size = 'medium',
  sx,
}) => {
  const { getStatusDotStyles } = useStatusPatterns();

  return (
    <Box
      sx={[
        getStatusDotStyles(minutesSinceUpdate, staleThreshold, isOffline, isDeparted, size),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

// ============================================================================
// STATUS CHIP COMPONENT
// ============================================================================

interface StatusChipProps {
  /** Status type */
  status: 'arriving' | 'departing' | 'at-station' | 'success' | 'warning' | 'error' | 'info';
  /** Status label text */
  label: string;
  /** Whether the item is departed/inactive */
  isDeparted?: boolean;
  /** Size of the chip */
  size?: 'small' | 'medium';
  /** Additional styling */
  sx?: SxProps<Theme>;
}

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  isDeparted = false,
  size = 'small',
  sx,
}) => {
  const { getStatusChipStyles } = useStatusPatterns();

  return (
    <Chip
      label={label}
      size={size}
      sx={[
        getStatusChipStyles(status, isDeparted, size),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

// ============================================================================
// DATA FRESHNESS INDICATOR COMPONENT
// ============================================================================

interface DataFreshnessIndicatorProps {
  /** Timestamp of last update */
  timestamp?: Date | string;
  /** Threshold for stale data in minutes */
  staleThreshold?: number;
  /** Whether the system is offline */
  isOffline?: boolean;
  /** Show icons for offline/stale states */
  showIcons?: boolean;
  /** Additional styling */
  sx?: SxProps<Theme>;
}

const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  timestamp,
  staleThreshold = 5,
  isOffline = false,
  showIcons = true,
  sx,
}) => {
  const { getDataFreshnessIndicator } = useStatusPatterns();
  const { theme } = useThemeUtils();

  const freshness = getDataFreshnessIndicator(timestamp, staleThreshold, isOffline);

  return (
    <Box
      sx={[
        {
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: freshness.color,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {showIcons && (
        <>
          {freshness.isOffline && (
            <OfflineIcon 
              sx={{ 
                fontSize: 14, 
                color: theme.palette.text.secondary,
                opacity: 0.7 
              }} 
              titleAccess="Using offline estimates - Live data temporarily unavailable"
            />
          )}
          {freshness.isStale && !freshness.isOffline && (
            <StaleIcon 
              sx={{ 
                fontSize: 14, 
                color: theme.palette.warning.main,
                opacity: 0.8 
              }} 
              titleAccess="Data is older than expected - Information may be outdated"
            />
          )}
        </>
      )}
      <StatusDot
        minutesSinceUpdate={freshness.minutesSinceUpdate}
        staleThreshold={staleThreshold}
        isOffline={isOffline}
        size="small"
      />
    </Box>
  );
};

// ============================================================================
// INTERACTIVE BUTTON COMPONENT
// ============================================================================

interface InteractiveButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Whether button is isDisabled */
  disabled?: boolean;
  /** Whether button is isLoading */
  loading?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Additional styling */
  sx?: SxProps<Theme>;
  isDisabled?: boolean;
  isLoading?: boolean;
}

const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  isDisabled = false,
  isLoading = false,
  tooltip,
  sx,
}) => {
  const { getInteractiveStateStyles, createAccessibleHandler } = useInteractivePatterns();
  const { theme, getStatusColors } = useThemeUtils();

  const colors = getStatusColors();
  const colorMap = {
    primary: colors.primary.main,
    secondary: colors.secondary.main,
    success: colors.success.main,
    warning: colors.warning.main,
    error: colors.error.main,
  };

  const sizeMap = {
    small: { minWidth: 32, minHeight: 32, fontSize: '0.75rem' },
    medium: { minWidth: 40, minHeight: 40, fontSize: '0.875rem' },
    large: { minWidth: 48, minHeight: 48, fontSize: '1rem' },
  };

  const buttonProps = createAccessibleHandler(onClick, undefined, { isDisabled: isDisabled || isLoading });

  const button = (
    <IconButton
      {...buttonProps}
      disabled={isDisabled || isLoading}
      sx={[
        {
          ...sizeMap[size],
          borderRadius: 2,
          position: 'relative',
          ...getInteractiveStateStyles(colorMap[variant], { isDisabled: isDisabled || isLoading }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {isLoading ? (
        <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
      ) : (
        children
      )}
    </IconButton>
  );

  if (tooltip && !isDisabled && !isLoading) {
    return (
      <Tooltip title={tooltip} placement="top">
        {button}
      </Tooltip>
    );
  }

  return button;
};

// ============================================================================
// STATUS INDICATOR WITH ICON COMPONENT
// ============================================================================

interface StatusIndicatorProps {
  /** Status type */
  status: 'success' | 'warning' | 'error' | 'info';
  /** Status text */
  text: string;
  /** Show icon */
  showIcon?: boolean;
  /** Variant style */
  variant?: 'filled' | 'outlined' | 'soft';
  /** Size */
  size?: 'small' | 'medium';
  /** Additional styling */
  sx?: SxProps<Theme>;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  showIcon = true,
  variant = 'soft',
  size = 'medium',
  sx,
}) => {
  const { getStatusIndicatorStyles } = useStatusPatterns();

  const iconMap = {
    success: SuccessIcon,
    warning: WarningIcon,
    error: ErrorIcon,
    info: InfoIcon,
  };

  const IconComponent = iconMap[status];

  return (
    <Box
      sx={[
        getStatusIndicatorStyles(status, variant, size),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {showIcon && <IconComponent sx={{ fontSize: size === 'small' ? 14 : 16 }} />}
      <Typography variant="caption" sx={{ fontSize: size === 'small' ? '0.65rem' : '0.75rem' }}>
        {text}
      </Typography>
    </Box>
  );
};

// ============================================================================
// ROUTE AVATAR COMPONENT
// ============================================================================

interface RouteAvatarProps {
  /** Route ID/number */
  routeId: string;
  /** Avatar size */
  size?: number;
  /** Whether route is departed/inactive */
  isDeparted?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional styling */
  sx?: SxProps<Theme>;
}

const RouteAvatar: React.FC<RouteAvatarProps> = ({
  routeId,
  size = 48,
  isDeparted = false,
  onClick,
  sx,
}) => {
  const { getHoverEffectStyles, createAccessibleHandler } = useInteractivePatterns();
  const { getRouteColor, alpha, theme } = useThemeUtils();

  const routeColor = getRouteColor(routeId);
  const interactiveProps = onClick ? createAccessibleHandler(onClick) : {};

  return (
    <Avatar
      {...interactiveProps}
      sx={[
        {
          width: size,
          height: size,
          bgcolor: isDeparted ? alpha(routeColor, 0.4) : routeColor,
          color: isDeparted 
            ? alpha(theme.palette.primary.contrastText, 0.7) 
            : theme.palette.primary.contrastText,
          fontWeight: 'bold',
          fontSize: size < 40 ? '0.75rem' : '0.85rem',
          ...(onClick && getHoverEffectStyles(routeColor, 'medium')),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {routeId}
    </Avatar>
  );
};

// ============================================================================
// STOP INDICATOR COMPONENT
// ============================================================================

interface StopIndicatorProps {
  /** Stop name */
  stopName: string;
  /** Whether this is the current stop */
  isCurrent?: boolean;
  /** Whether this is the user's station */
  isUserStation?: boolean;
  /** Whether this is the destination */
  isDestination?: boolean;
  /** Stop sequence number */
  sequence?: number;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Additional styling */
  sx?: SxProps<Theme>;
}

const StopIndicator: React.FC<StopIndicatorProps> = ({
  stopName,
  isCurrent = false,
  isUserStation = false,
  isDestination = false,
  sequence,
  size = 'medium',
  sx,
}) => {
  const { theme, alpha } = useThemeUtils();

  const iconSize = size === 'small' ? 16 : 24;
  const dotSize = size === 'small' ? 6 : 8;
  const fontSize = size === 'small' ? '0.7rem' : '0.8rem';

  const getBackgroundColor = () => {
    if (isCurrent) return alpha(theme.palette.primary.main, 0.1);
    if (isUserStation) return alpha(theme.palette.info.main, 0.1);
    return 'transparent';
  };

  const getBorderColor = () => {
    if (isCurrent) return alpha(theme.palette.primary.main, 0.3);
    if (isUserStation) return alpha(theme.palette.info.main, 0.3);
    return alpha(theme.palette.divider, 0.5);
  };

  const getTextColor = () => {
    if (isCurrent) return theme.palette.primary.main;
    if (isUserStation) return theme.palette.info.main;
    return theme.palette.text.primary;
  };

  return (
    <Box
      sx={[
        {
          display: 'flex',
          alignItems: 'center',
          gap: size === 'small' ? 0.5 : 1,
          px: size === 'small' ? 0.75 : 1,
          py: size === 'small' ? 0.25 : 0.5,
          borderRadius: 1,
          bgcolor: getBackgroundColor(),
          border: `1px solid ${getBorderColor()}`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Icon circle */}
      <Box
        sx={{
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        {isCurrent ? (
          <BusIcon 
            sx={{ 
              fontSize: size === 'small' ? 10 : 14, 
              color: theme.palette.primary.main
            }} 
          />
        ) : isUserStation ? (
          <LocationIcon 
            sx={{ 
              fontSize: size === 'small' ? 10 : 14, 
              color: theme.palette.info.main
            }} 
          />
        ) : (
          <Box
            sx={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              bgcolor: theme.palette.text.disabled,
            }}
          />
        )}
      </Box>
      
      {/* Stop name */}
      <Typography 
        variant="caption" 
        sx={{
          fontSize,
          fontWeight: isCurrent || isUserStation ? 600 : 400,
          color: getTextColor(),
          lineHeight: 1,
        }}
      >
        {stopName}
      </Typography>
    </Box>
  );
};

// Export all components
export {
  StatusDot,
  StatusChip,
  DataFreshnessIndicator,
  InteractiveButton,
  StatusIndicator,
  RouteAvatar,
  StopIndicator,
};