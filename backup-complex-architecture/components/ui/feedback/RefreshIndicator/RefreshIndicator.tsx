/**
 * Material Design refresh indicator component
 * Shows a small hourglass chip that appears for 0.5 seconds after cache updates
 */
import React from 'react';
import {
  Chip,
  Box,
  Fade,
} from '@mui/material';
import { useThemeUtils } from '../../../../hooks';
import {
  HourglassEmpty as HourglassIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

export interface RefreshIndicatorProps {
  isVisible: boolean;
  size?: 'small' | 'medium';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  variant?: 'hourglass' | 'refresh';
  label?: string;
}

export const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  isVisible,
  size = 'small',
  position = 'top-right',
  variant = 'hourglass',
  label,
}) => {
  const { theme, alpha } = useThemeUtils();

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyles, top: 8, right: 8 };
      case 'top-left':
        return { ...baseStyles, top: 8, left: 8 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 8, right: 8 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 8, left: 8 };
      case 'inline':
        return { display: 'inline-flex' };
      default:
        return { ...baseStyles, top: 8, right: 8 };
    }
  };

  const getIcon = () => {
    const iconProps = {
      sx: { 
        fontSize: size === 'small' ? 12 : 16,
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }
    };

    return variant === 'hourglass' ? (
      <HourglassIcon {...iconProps} />
    ) : (
      <RefreshIcon {...iconProps} />
    );
  };

  return (
    <Fade in={isVisible} timeout={200}>
      <Box sx={getPositionStyles()}>
        <Chip
          icon={getIcon()}
          label={label || 'Updating'}
          size={size}
          variant="filled"
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            fontSize: size === 'small' ? '0.65rem' : '0.75rem',
            height: size === 'small' ? 20 : 24,
            '& .MuiChip-label': {
              px: size === 'small' ? 0.5 : 1,
              fontWeight: 500,
            },
            '& .MuiChip-icon': {
              ml: size === 'small' ? 0.25 : 0.5,
            },
            boxShadow: theme.shadows[2],
            backdropFilter: 'blur(4px)',
          }}
        />
      </Box>
    </Fade>
  );
};

/**
 * Wrapper component that automatically shows/hides refresh indicator
 * based on cache updates for specified keys
 */
export interface AutoRefreshIndicatorProps {
  cacheKeys: string | string[];
  children: React.ReactNode;
  position?: RefreshIndicatorProps['position'];
  size?: RefreshIndicatorProps['size'];
  variant?: RefreshIndicatorProps['variant'];
}

export const AutoRefreshIndicator: React.FC<AutoRefreshIndicatorProps> = ({
  cacheKeys,
  children,
  position = 'top-right',
  size = 'small',
  variant = 'hourglass',
}) => {
  // Import hooks dynamically to avoid circular dependencies
  const [refreshState, setRefreshState] = React.useState({ isRefreshing: false });

  const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
  
  // For now, use a simple subscription approach
  React.useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    import('../../../../hooks/shared/cache/instance').then(({ unifiedCache }) => {
      keys.forEach(key => {
        const unsubscribe = unifiedCache.subscribe(key, (event: any) => {
          if (event.type === 'updated') {
            setRefreshState({ isRefreshing: true });
            setTimeout(() => {
              setRefreshState({ isRefreshing: false });
            }, 500);
          }
        });
        unsubscribers.push(unsubscribe);
      });
    });

    return () => {
      unsubscribers.forEach(cleanup => cleanup());
    };
  }, [keys]);

  const { isRefreshing } = refreshState;

  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      <RefreshIndicator
        isVisible={isRefreshing}
        position={position}
        size={size}
        variant={variant}
      />
    </Box>
  );
};

export default RefreshIndicator;