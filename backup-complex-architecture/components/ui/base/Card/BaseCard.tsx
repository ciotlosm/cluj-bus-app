import React from 'react';
import {
  Card as MuiCard,
  CardContent,
} from '@mui/material';
import { useThemeUtils, useComponentStyles } from '../../../../hooks';

// Base Card Component Props
export interface BaseCardProps {
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
  const actualLoading = isLoading || loading || false;
  const actualError = hasError || error || false;

  const paddingMap = {
    none: 0,
    small: 1,
    medium: 2,
    large: 3,
  };

  const baseStyles = {
    cursor: actualInteractive ? 'pointer' : 'default',
    transition: theme.transitions.create(['box-shadow', 'transform'], {
      duration: theme.transitions.duration.short,
    }),
    ...(actualInteractive && {
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
      },
    }),
    ...(actualError && {
      borderColor: theme.palette.error.main,
      backgroundColor: alpha(theme.palette.error.main, 0.05),
    }),
    ...getCardVariantStyles(variant),
  };

  return (
    <MuiCard
      variant={variant === 'filled' ? 'elevation' : (variant === 'elevated' ? 'elevation' : 'outlined')}
      sx={{ ...baseStyles, ...sx }}
      className={className}
      onClick={actualInteractive ? onClick : undefined}
    >
      <CardContent sx={{ p: paddingMap[padding] }}>
        {children}
      </CardContent>
    </MuiCard>
  );
};

export default Card;