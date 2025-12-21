import React from 'react';
import { 
  CircularProgress, 
  LinearProgress, 
  Box, 
  Typography, 
  Skeleton,
  Stack 
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

import type { StandardLoadingProps } from '../../../../types/componentProps';

/**
 * LoadingState component props with Material-UI integration
 * Implements consistent isLoading indicators with multiple variants
 * Follows standardized prop patterns for consistency
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1
 */
interface LoadingStateProps extends Omit<StandardLoadingProps, 'variant'> {
  /** Loading variant type with multiple display options */
  variant?: 'spinner' | 'skeleton' | 'progress';
  /** Size variant with consistent scaling */
  size?: 'small' | 'medium' | 'large';
  /** Optional text to display alongside isLoading indicator */
  text?: string;
  /** Full height container for centering */
  isFullHeight?: boolean;
  /** Full height container (alias for isFullHeight) */
  fullHeight?: boolean;
  /** Additional sx props for custom styling */
  sx?: SxProps<Theme>;
}

/**
 * LoadingSpinner props for backward compatibility
 * Uses standardized prop patterns with clean interface
 */
interface LoadingSpinnerProps {
  /** Size variant with consistent scaling */
  size?: 'small' | 'medium' | 'large';
  /** Color variant for semantic styling */
  color?: 'primary' | 'secondary' | 'inherit' | 'success' | 'warning' | 'error';
  /** Optional text to display alongside spinner */
  text?: string;
  /** Full height container with standardized naming */
  isFullHeight?: boolean;
  /** Additional sx props for custom styling */
  sx?: SxProps<Theme>;
}

/**
 * LoadingState component using Material-UI components exclusively
 * Implements multiple isLoading variants with consistent styling
 * Validates Requirements: 5.1, 7.1
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'medium',
  text,
  isFullHeight = false,
  fullHeight = false,
  sx,
}) => {

  const theme = useTheme();

  // Size configuration using design tokens
  const sizeConfig = {
    small: {
      spinner: 16,
      skeleton: { width: 120, height: 16 },
      fontSize: theme.typography.caption?.fontSize || '0.75rem',
      gap: theme.spacing(1),
      padding: theme.spacing(2),
    },
    medium: {
      spinner: 24,
      skeleton: { width: 200, height: 20 },
      fontSize: theme.typography.body2.fontSize,
      gap: theme.spacing(1.5),
      padding: theme.spacing(3),
    },
    large: {
      spinner: 32,
      skeleton: { width: 280, height: 24 },
      fontSize: theme.typography.body1.fontSize,
      gap: theme.spacing(2),
      padding: theme.spacing(4),
    },
  };

  const config = sizeConfig[size];

  // Support both isFullHeight and fullHeight prop names
  const shouldUseFullHeight = isFullHeight || fullHeight;

  // Container styles with theme integration
  const containerSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: config.gap,
    padding: config.padding,
    ...(shouldUseFullHeight && {
      minHeight: '100%',
      height: '100%',
    }),
    ...sx,
  };

  // Text styles with theme integration
  const textSx: SxProps<Theme> = {
    fontSize: config.fontSize,
    fontWeight: theme.typography.body2.fontWeight,
    color: 'text.secondary',
    userSelect: 'none',
  };

  // Render different variants
  const renderLoadingContent = () => {
    switch (variant) {
      case 'skeleton':
        return (
          <Stack spacing={config.gap} alignItems="center">
            <Skeleton 
              variant="rectangular" 
              width={config.skeleton.width}
              height={config.skeleton.height}
              sx={{ borderRadius: 1 }}
            />
            {text && (
              <Skeleton 
                variant="text" 
                width={config.skeleton.width * 0.7}
                sx={{ fontSize: config.fontSize }}
              />
            )}
          </Stack>
        );
      
      case 'progress':
        return (
          <Stack spacing={config.gap} alignItems="center" sx={{ width: '100%', maxWidth: config.skeleton.width }}>
            <LinearProgress 
              sx={{ 
                width: '100%',
                height: size === 'small' ? 2 : size === 'large' ? 6 : 4,
                borderRadius: 1,
              }}
            />
            {text && (
              <Typography variant="body2" sx={textSx}>
                {text}
              </Typography>
            )}
          </Stack>
        );
      
      case 'spinner':
      default:
        return (
          <>
            <CircularProgress 
              size={config.spinner}
              color="primary"
              thickness={4}
            />
            {text && (
              <Typography variant="body2" sx={textSx}>
                {text}
              </Typography>
            )}
          </>
        );
    }
  };

  return (
    <Box sx={containerSx}>
      {renderLoadingContent()}
    </Box>
  );
};

/**
 * LoadingSpinner component for backward compatibility
 * Wraps LoadingState with spinner variant
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'primary',
  text,
  isFullHeight = false,
  sx
}) => {
  return (
    <LoadingState
      variant="spinner"
      size={size}
      text={text}
      isFullHeight={isFullHeight}
      sx={sx}
    />
  );
};

export default LoadingSpinner;