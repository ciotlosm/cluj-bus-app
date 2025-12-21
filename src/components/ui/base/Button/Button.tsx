import React, { forwardRef } from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme, alpha } from '@mui/material/styles';

// Temporary fix - define types locally
type ButtonVariant = 'text' | 'outlined' | 'contained' | 'tonal' | 'filled';
type SizeVariant = 'small' | 'medium' | 'large';
type ColorVariant = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
type ResponsiveProp<T> = T;

// Temporary polymorphic type definition
type PolymorphicComponentPropsWithRef<C extends React.ElementType, P> = P & {
  as?: C;
} & React.ComponentPropsWithRef<C>;

/**
 * Enhanced Button component props with comprehensive TypeScript integration
 * Implements type-safe variants, responsive props, and Material-UI extension
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */
export interface ButtonProps<T = any> extends Omit<MuiButtonProps, 'variant' | 'size' | 'color'> {
  /** Button variant with type safety */
  variant?: ButtonVariant;
  /** Button size with responsive support */
  size?: ResponsiveProp<SizeVariant>;
  /** Color variant with type safety */
  color?: ColorVariant;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Full width */
  isFullWidth?: boolean;
  /** Icon */
  icon?: React.ReactNode;
  /** Start icon */
  startIcon?: React.ReactNode;
  /** End icon */
  endIcon?: React.ReactNode;
  /** Generic click handler with data support */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>, data?: T) => void;
  /** Generic data to pass to event handlers */
  data?: T;
  /** Loading text override */
  loadingText?: string;
  /** Icon position */
  iconPosition?: 'start' | 'end';
  /** Additional sx props for custom styling */
  sx?: SxProps<Theme>;
}

/**
 * Polymorphic Button props for 'as' prop support
 */
export type PolymorphicButtonProps<C extends React.ElementType = 'button'> = 
  PolymorphicComponentPropsWithRef<C, ButtonProps>;

/**
 * Enhanced Button component with comprehensive TypeScript integration
 * Implements type-safe variants, responsive props, and generic event handling
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'filled',
  size = 'medium',
  color = 'primary',
  isLoading = false,
  disabled = false,
  isFullWidth = false,
  icon,
  startIcon,
  endIcon,
  loadingText,
  iconPosition = 'start',
  onClick,
  data,
  children,
  sx,
  ...props
}, ref) => {

  const theme = useTheme();

  // Handle responsive size prop
  const getResponsiveSize = (sizeValue: ResponsiveProp<SizeVariant>): SizeVariant => {
    if (typeof sizeValue === 'string') return sizeValue;
    // For responsive objects, use the base value (xs) or fallback to medium
    if (typeof sizeValue === 'object' && sizeValue && 'xs' in sizeValue) return (sizeValue as any).xs;
    return 'medium';
  };

  const actualSize = getResponsiveSize(size) as SizeVariant;

  // Map custom variants to Material-UI variants with type safety
  const muiVariant = variant === 'filled' ? 'contained' : 
                     variant === 'tonal' ? 'contained' :
                     variant === 'outlined' ? 'outlined' : 'text';

  // Get color palette with type safety
  const colorPalette = theme.palette[color];

  // Size configuration using design tokens with type safety
  const sizeConfig: Record<SizeVariant, {
    minHeight: number;
    fontSize: string;
    px: number;
    py: number;
  }> = {
    small: {
      minHeight: 32,
      fontSize: '0.75rem',
      px: 2,
      py: 1,
    },
    medium: {
      minHeight: 40,
      fontSize: '0.875rem',
      px: 3,
      py: 1.5,
    },
    large: {
      minHeight: 48,
      fontSize: '1rem',
      px: 4,
      py: 2,
    },
  };

  // Handle generic click events with data support
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled && !isLoading) {
      onClick(event, data);
    }
  };

  // Create combined styles with responsive support and type safety
  const buttonSx: SxProps<Theme> = (theme) => {
    const styles: any = {
      borderRadius: theme.custom?.borderRadius?.xl ? `${theme.custom.borderRadius.xl}px` : 5,
      textTransform: 'none',
      fontWeight: theme.typography.button.fontWeight,
      transition: theme.custom?.animation ? 
        `all ${theme.custom.animation.duration.normal} ${theme.custom.animation.easing.standard}` :
        'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
      // Size configuration with type safety
      minHeight: sizeConfig[actualSize as keyof typeof sizeConfig].minHeight,
      fontSize: sizeConfig[actualSize as keyof typeof sizeConfig].fontSize,
      px: sizeConfig[actualSize as keyof typeof sizeConfig].px,
      py: sizeConfig[actualSize as keyof typeof sizeConfig].py,
    };

    // Handle responsive size prop
    if (typeof size === 'object') {
      Object.entries(size).forEach(([breakpoint, sizeValue]) => {
        if (breakpoint !== 'xs' && sizeValue && typeof sizeValue === 'string' && sizeValue in sizeConfig) {
          const breakpointStyles = {
            minHeight: sizeConfig[sizeValue as keyof typeof sizeConfig].minHeight,
            fontSize: sizeConfig[sizeValue as keyof typeof sizeConfig].fontSize,
            px: sizeConfig[sizeValue as keyof typeof sizeConfig].px,
            py: sizeConfig[sizeValue as keyof typeof sizeConfig].py,
          };
          
          if (breakpoint === 'sm' || breakpoint === 'md' || breakpoint === 'lg' || breakpoint === 'xl') {
            styles[theme.breakpoints.up(breakpoint)] = breakpointStyles;
          }
        }
      });
    }

    // Add variant-specific styles
    switch (variant) {
      case 'filled':
        styles.bgcolor = colorPalette.main;
        styles.color = colorPalette.contrastText;
        styles.boxShadow = theme.custom?.elevation?.low || theme.shadows[1];
        styles['&:hover'] = {
          bgcolor: colorPalette.dark,
          boxShadow: theme.custom?.elevation?.medium || theme.shadows[2],
        };
        styles['&:active'] = {
          boxShadow: theme.custom?.elevation?.low || theme.shadows[1],
        };
        break;

      case 'tonal':
        styles.bgcolor = alpha(colorPalette.main, 0.12);
        styles.color = colorPalette.main;
        styles['&:hover'] = {
          bgcolor: alpha(colorPalette.main, 0.16),
        };
        break;

      case 'outlined':
        styles.bgcolor = 'transparent';
        styles.color = colorPalette.main;
        styles.border = `1px solid ${colorPalette.main}`;
        styles['&:hover'] = {
          bgcolor: alpha(colorPalette.main, 0.04),
          borderColor: colorPalette.dark,
        };
        break;

      case 'text':
        styles.bgcolor = 'transparent';
        styles.color = colorPalette.main;
        styles['&:hover'] = {
          bgcolor: alpha(colorPalette.main, 0.04),
        };
        break;
    }

    // Add isLoading styles
    if (isLoading) {
      styles.pointerEvents = 'none';
    }

    // Add custom styles
    if (sx) {
      const customStyles = typeof sx === 'function' ? sx(theme) : sx;
      Object.assign(styles, customStyles);
    }

    return styles;
  };

  // Determine isLoading indicator size based on actual size
  const loadingSize = actualSize === 'small' ? 14 : actualSize === 'large' ? 20 : 16;

  // Handle icon positioning with isLoading state
  const getStartIcon = () => {
    if (isLoading && iconPosition === 'start') {
      return <CircularProgress size={loadingSize} />;
    }
    // Use icon prop as startIcon if no explicit startIcon is provided
    if (iconPosition === 'start') {
      return startIcon || icon;
    }
    return startIcon;
  };

  const getEndIcon = () => {
    if (isLoading && iconPosition === 'end') {
      return <CircularProgress size={loadingSize} />;
    }
    // Use icon prop as endIcon if no explicit endIcon is provided and iconPosition is 'end'
    if (iconPosition === 'end' && !isLoading) {
      return endIcon || icon;
    }
    return endIcon;
  };

  // Handle button content with isLoading text
  const getButtonContent = () => {
    if (isLoading && loadingText) {
      return loadingText;
    }
    return children;
  };

  return (
    <MuiButton
      ref={ref}
      variant={muiVariant}
      disabled={disabled || isLoading}
      startIcon={getStartIcon()}
      endIcon={getEndIcon()}
      fullWidth={isFullWidth}
      onClick={handleClick}
      sx={buttonSx}
      {...props}
    >
      {getButtonContent()}
    </MuiButton>
  );
});

// Set display name for debugging
Button.displayName = 'Button';

export default Button;