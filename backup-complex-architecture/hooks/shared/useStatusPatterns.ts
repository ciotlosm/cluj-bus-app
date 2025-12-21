import { useCallback } from 'react';
import { useThemeUtils } from './useThemeUtils';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared status pattern utilities
 * Extracts common status indicator, data freshness, and state management patterns
 * Validates Requirements: 2.5, 6.2, 6.5
 */
export const useStatusPatterns = () => {
  const { 
    getDataFreshnessColor, 
    getStatusColors, 
    alpha, 
    theme,
    getSpacing,
    getBorderRadius 
  } = useThemeUtils();

  // Common status dot pattern used across VehicleCard and other components
  const getStatusDotStyles = useCallback((
    minutesSinceUpdate: number,
    staleThreshold: number = 5,
    isOffline: boolean = false,
    isDeparted: boolean = false,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): SxProps<Theme> => {
    const statusColor = getDataFreshnessColor(minutesSinceUpdate, staleThreshold, isOffline);
    const sizeMap = { small: 8, medium: 10, large: 12 };
    const dotSize = sizeMap[size];

    return {
      width: dotSize,
      height: dotSize,
      borderRadius: '50%',
      bgcolor: isDeparted ? alpha(statusColor, 0.5) : statusColor,
      border: `1px solid ${alpha(statusColor, 0.3)}`,
      boxShadow: `0 0 4px ${alpha(statusColor, 0.4)}`,
      flexShrink: 0,
    };
  }, [getDataFreshnessColor, alpha]);

  // Common status chip pattern used across components
  const getStatusChipStyles = useCallback((
    status: 'arriving' | 'departing' | 'at-station' | 'success' | 'warning' | 'error' | 'info',
    isDeparted: boolean = false,
    size: 'small' | 'medium' = 'small'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const spacing = getSpacing();
    const borderRadius = getBorderRadius();

    const statusColorMap = {
      'arriving': colors.success,
      'at-station': colors.warning,
      'departing': colors.error,
      'success': colors.success,
      'warning': colors.warning,
      'error': colors.error,
      'info': colors.primary,
    };

    const statusColor = statusColorMap[status];
    const fontSize = size === 'small' ? '0.7rem' : '0.75rem';
    const height = size === 'small' ? 18 : 20;

    return {
      bgcolor: statusColor.light,
      color: isDeparted ? alpha(statusColor.main, 0.6) : statusColor.main,
      border: `1px solid ${alpha(statusColor.main, isDeparted ? 0.2 : 0.3)}`,
      fontSize,
      height,
      fontWeight: 600,
      opacity: isDeparted ? 0.7 : 1,
      flexShrink: 0,
      borderRadius: borderRadius.md,
      '& .MuiChip-label': {
        px: spacing.xs,
      },
    };
  }, [getStatusColors, alpha, getSpacing, getBorderRadius]);

  // Common arrival status text pattern
  const getArrivalStatusText = useCallback((
    direction: 'arriving' | 'departing' | 'unknown',
    minutesAway: number
  ): string => {
    if (direction === 'arriving') {
      if (minutesAway === 0) return 'At station';
      if (minutesAway === 1) return 'Arriving next';
      return `Arriving in ${minutesAway}min`;
    }
    if (direction === 'departing') return 'Already left';
    return 'Unknown';
  }, []);

  // Common data freshness indicator pattern
  const getDataFreshnessIndicator = useCallback((
    timestamp: Date | string | undefined,
    staleThreshold: number = 5,
    isOffline: boolean = false
  ) => {
    if (!timestamp) {
      return {
        color: getDataFreshnessColor(Infinity, staleThreshold, isOffline),
        isStale: true,
        isOffline,
        minutesSinceUpdate: Infinity,
      };
    }

    const lastUpdate = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
    const color = getDataFreshnessColor(minutesSinceUpdate, staleThreshold, isOffline);

    return {
      color,
      isStale: minutesSinceUpdate > staleThreshold,
      isOffline,
      minutesSinceUpdate,
      lastUpdate,
    };
  }, [getDataFreshnessColor]);

  // Common status indicator with icon pattern
  const getStatusIndicatorStyles = useCallback((
    status: 'success' | 'warning' | 'error' | 'info',
    variant: 'filled' | 'outlined' | 'soft' = 'soft',
    size: 'small' | 'medium' = 'medium'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const spacing = getSpacing();
    const borderRadius = getBorderRadius();

    const statusColor = colors[status] || colors.primary;
    const sizeConfig = {
      small: { px: spacing.xs, py: `${parseInt(spacing.xs) / 2}px`, fontSize: '0.65rem' },
      medium: { px: spacing.sm, py: spacing.xs, fontSize: '0.75rem' },
    };

    const baseStyles: SxProps<Theme> = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: borderRadius.md,
      fontWeight: 600,
      transition: `all ${theme.custom?.animation?.duration?.fast || '0.15s'} ${theme.custom?.animation?.easing?.standard || 'cubic-bezier(0.4, 0.0, 0.2, 1)'}`,
      ...sizeConfig[size],
    };

    switch (variant) {
      case 'filled':
        return {
          ...baseStyles,
          bgcolor: statusColor.main,
          color: statusColor.contrastText || theme.palette.common.white,
        };
      case 'outlined':
        return {
          ...baseStyles,
          bgcolor: 'transparent',
          color: statusColor.main,
          border: `1px solid ${statusColor.main}`,
        };
      case 'soft':
      default:
        return {
          ...baseStyles,
          bgcolor: statusColor.light,
          color: statusColor.main,
          border: `1px solid ${statusColor.border}`,
        };
    }
  }, [getStatusColors, getSpacing, getBorderRadius, theme, alpha]);

  return {
    getStatusDotStyles,
    getStatusChipStyles,
    getArrivalStatusText,
    getDataFreshnessIndicator,
    getStatusIndicatorStyles,
  };
};

/**
 * Simplified hook for status dot styles
 */
export const useStatusDot = () => {
  const { getStatusDotStyles } = useStatusPatterns();
  return getStatusDotStyles;
};

/**
 * Simplified hook for status chip styles
 */
export const useStatusChip = () => {
  const { getStatusChipStyles } = useStatusPatterns();
  return getStatusChipStyles;
};

/**
 * Simplified hook for data freshness
 */
export const useDataFreshness = () => {
  const { getDataFreshnessIndicator } = useStatusPatterns();
  return getDataFreshnessIndicator;
};