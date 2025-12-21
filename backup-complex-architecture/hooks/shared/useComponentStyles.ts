import { useCallback } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Component-specific styling patterns hook
 * Provides reusable styling patterns for common component configurations
 */
export const useComponentStyles = () => {
  const theme = useTheme();

  // Button variant styles using design tokens
  const getButtonVariantStyles = useCallback((
    variant: 'filled' | 'outlined' | 'text' | 'tonal' = 'filled',
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary'
  ): SxProps<Theme> => {
    const colorPalette = theme.palette[color];
    const { componentVariants, alpha: alphaTokens } = theme.custom || { 
      componentVariants: { 
        button: { 
          filled: { borderRadius: 20, elevation: '0px 1px 3px rgba(0, 0, 0, 0.12)' },
          outlined: { borderRadius: 20, borderWidth: 1 },
          text: { borderRadius: 12 },
          tonal: { borderRadius: 20 }
        } 
      }, 
      alpha: { hover: 0.04 } 
    };

    const baseStyles: SxProps<Theme> = {
      borderRadius: `${componentVariants.button[variant].borderRadius}px`,
      fontWeight: theme.typography.button.fontWeight,
      fontSize: theme.typography.button.fontSize,
      textTransform: 'none',
      transition: `all ${theme.custom.animation.duration.normal} ${theme.custom.animation.easing.standard}`,
    };

    switch (variant) {
      case 'filled':
        return {
          ...baseStyles,
          bgcolor: colorPalette.main,
          color: colorPalette.contrastText,
          boxShadow: componentVariants.button.filled.elevation,
          '&:hover': {
            bgcolor: colorPalette.dark,
            boxShadow: theme.custom.elevation.medium,
          },
          '&:active': {
            boxShadow: theme.custom.elevation.low,
          },
        };

      case 'outlined':
        return {
          ...baseStyles,
          bgcolor: 'transparent',
          color: colorPalette.main,
          border: `${componentVariants.button.outlined.borderWidth}px solid ${colorPalette.main}`,
          '&:hover': {
            bgcolor: alpha(colorPalette.main, alphaTokens.hover),
            borderColor: colorPalette.dark,
          },
        };

      case 'text':
        return {
          ...baseStyles,
          bgcolor: 'transparent',
          color: colorPalette.main,
          '&:hover': {
            bgcolor: alpha(colorPalette.main, alphaTokens.hover),
          },
        };

      case 'tonal':
        return {
          ...baseStyles,
          bgcolor: alpha(colorPalette.main, 0.12),
          color: colorPalette.main,
          '&:hover': {
            bgcolor: alpha(colorPalette.main, 0.16),
          },
        };

      default:
        return baseStyles;
    }
  }, [theme]);

  // Card variant styles using design tokens
  const getCardVariantStyles = useCallback((
    variant: 'elevated' | 'outlined' | 'filled' = 'elevated',
    padding: 'none' | 'small' | 'medium' | 'large' = 'medium'
  ): SxProps<Theme> => {
    const { componentVariants, spacing } = theme.custom || { 
      componentVariants: { 
        card: { 
          elevated: { borderRadius: 16, elevation: '0px 1px 3px rgba(0, 0, 0, 0.12)' },
          outlined: { borderRadius: 16, borderWidth: 1 },
          filled: { borderRadius: 16 }
        } 
      }, 
      spacing: { sm: 8, md: 16, lg: 24 } 
    };

    const paddingMap = {
      none: 0,
      small: spacing.sm,
      medium: spacing.md,
      large: spacing.lg,
    };

    const baseStyles: SxProps<Theme> = {
      borderRadius: `${componentVariants.card[variant].borderRadius}px`,
      padding: `${paddingMap[padding]}px`,
      transition: `all ${theme.custom.animation.duration.normal} ${theme.custom.animation.easing.standard}`,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          boxShadow: componentVariants.card.elevated.elevation,
          bgcolor: theme.palette.background.paper,
          '&:hover': {
            boxShadow: theme.custom.elevation.medium,
          },
        };

      case 'outlined':
        return {
          ...baseStyles,
          border: `${componentVariants.card.outlined.borderWidth}px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          boxShadow: 'none',
        };

      case 'filled':
        return {
          ...baseStyles,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          boxShadow: 'none',
        };

      default:
        return baseStyles;
    }
  }, [theme]);

  // Input variant styles using design tokens
  const getInputVariantStyles = useCallback((
    variant: 'outlined' | 'filled' = 'outlined',
    size: 'small' | 'medium' = 'medium'
  ): SxProps<Theme> => {
    const { componentVariants, spacing } = theme.custom || { 
      componentVariants: { 
        input: { 
          outlined: { borderRadius: 12 },
          filled: { borderRadius: 12 }
        } 
      }, 
      spacing: { sm: 8, md: 16 } 
    };

    const sizeMap = {
      small: {
        height: 40,
        fontSize: theme.custom.spacing.sm + 'px',
      },
      medium: {
        height: 48,
        fontSize: theme.custom.spacing.md + 'px',
      },
    };

    return {
      '& .MuiOutlinedInput-root': {
        borderRadius: `${componentVariants.input[variant].borderRadius}px`,
        height: sizeMap[size].height,
        fontSize: sizeMap[size].fontSize,
        transition: `all ${theme.custom.animation.duration.normal} ${theme.custom.animation.easing.standard}`,
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 2,
          borderColor: theme.palette.primary.main,
        },
      },
    };
  }, [theme]);

  // Loading state styles
  const getLoadingStateStyles = useCallback((
    variant: 'spinner' | 'skeleton' | 'overlay' = 'spinner',
    size: 'small' | 'medium' | 'large' = 'medium'
  ): SxProps<Theme> => {
    const sizeMap = {
      small: 20,
      medium: 32,
      large: 48,
    };

    const baseStyles: SxProps<Theme> = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (variant) {
      case 'spinner':
        return {
          ...baseStyles,
          '& .MuiCircularProgress-root': {
            width: `${sizeMap[size]}px !important`,
            height: `${sizeMap[size]}px !important`,
          },
        };

      case 'skeleton':
        return {
          ...baseStyles,
          '& .MuiSkeleton-root': {
            borderRadius: `${theme.custom.borderRadius.md}px`,
          },
        };

      case 'overlay':
        return {
          ...baseStyles,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: alpha(theme.palette.background.paper, theme.custom.alpha.backdrop),
          backdropFilter: 'blur(4px)',
          zIndex: theme.zIndex.modal - 1,
        };

      default:
        return baseStyles;
    }
  }, [theme]);

  // Status indicator styles
  const getStatusIndicatorStyles = useCallback((
    status: 'success' | 'warning' | 'error' | 'info' = 'info',
    variant: 'filled' | 'outlined' | 'soft' = 'soft'
  ): SxProps<Theme> => {
    const statusColor = theme.palette[status];
    const { spacing, borderRadius, alpha: alphaTokens } = theme.custom || { 
      spacing: { xs: 4, sm: 8 }, 
      borderRadius: { md: 12 }, 
      alpha: {} 
    };

    const baseStyles: SxProps<Theme> = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: `${spacing.xs}px`,
      px: `${spacing.sm}px`,
      py: `${spacing.xs}px`,
      borderRadius: `${borderRadius.md}px`,
      fontSize: theme.typography.body2.fontSize,
      fontWeight: theme.typography.button.fontWeight,
      transition: `all ${theme.custom.animation.duration.fast} ${theme.custom.animation.easing.standard}`,
    };

    switch (variant) {
      case 'filled':
        return {
          ...baseStyles,
          bgcolor: statusColor.main,
          color: statusColor.contrastText,
        };

      case 'outlined':
        return {
          ...baseStyles,
          bgcolor: 'transparent',
          color: statusColor.main,
          border: `1px solid ${statusColor.main}`,
        };

      case 'soft':
        return {
          ...baseStyles,
          bgcolor: alpha(statusColor.main, 0.12),
          color: statusColor.main,
        };

      default:
        return baseStyles;
    }
  }, [theme]);

  // Interactive element styles (hover, focus, active states)
  const getInteractiveStyles = useCallback((
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary'
  ): SxProps<Theme> => {
    const colorPalette = theme.palette[color];
    const { alpha: alphaTokens, animation } = theme.custom || { 
      alpha: { hover: 0.04, focus: 0.12, pressed: 0.16, disabled: 0.38 }, 
      animation: { duration: { fast: '0.15s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };

    return {
      cursor: 'pointer',
      transition: `all ${animation.duration.fast} ${animation.easing.standard}`,
      '&:hover': {
        bgcolor: alpha(colorPalette.main, alphaTokens.hover),
      },
      '&:focus-visible': {
        outline: `2px solid ${colorPalette.main}`,
        outlineOffset: '2px',
        bgcolor: alpha(colorPalette.main, alphaTokens.focus),
      },
      '&:active': {
        bgcolor: alpha(colorPalette.main, alphaTokens.pressed),
        transform: 'scale(0.98)',
      },
      '&:disabled': {
        opacity: alphaTokens.disabled,
        cursor: 'not-allowed',
        '&:hover': {
          bgcolor: 'transparent',
        },
      },
    };
  }, [theme]);

  // Variant handler utility - centralizes variant logic
  const getVariantStyles = useCallback(<T extends Record<string, any>>(
    component: 'button' | 'card' | 'input' | 'chip',
    variant: string,
    additionalProps?: T
  ): SxProps<Theme> => {
    switch (component) {
      case 'button':
        return getButtonVariantStyles(
          variant as 'filled' | 'outlined' | 'text' | 'tonal',
          additionalProps?.color || 'primary'
        );
      case 'card':
        return getCardVariantStyles(
          variant as 'elevated' | 'outlined' | 'filled',
          additionalProps?.padding || 'medium'
        );
      case 'input':
        return getInputVariantStyles(
          variant as 'outlined' | 'filled',
          additionalProps?.size || 'medium'
        );
      default:
        return {};
    }
  }, [getButtonVariantStyles, getCardVariantStyles, getInputVariantStyles]);

  // Responsive variant styles
  const getResponsiveVariantStyles = useCallback((
    component: 'button' | 'card' | 'input',
    variants: {
      xs?: string;
      sm?: string;
      md?: string;
      lg?: string;
      xl?: string;
    },
    additionalProps?: any
  ): SxProps<Theme> => {
    const breakpoints = theme.breakpoints;
    const styles: SxProps<Theme> = {};

    // Apply base variant (xs)
    if (variants.xs) {
      Object.assign(styles, getVariantStyles(component, variants.xs, additionalProps));
    }

    // Apply responsive variants
    Object.entries(variants).forEach(([breakpoint, variant]) => {
      if (breakpoint !== 'xs' && variant) {
        styles[breakpoints.up(breakpoint as 'sm' | 'md' | 'lg' | 'xl')] = 
          getVariantStyles(component, variant, additionalProps);
      }
    });

    return styles;
  }, [theme.breakpoints, getVariantStyles]);

  // Component state styles (hover, focus, active, disabled)
  const getComponentStateStyles = useCallback((
    component: 'button' | 'card' | 'input' | 'interactive',
    states: {
      hover?: boolean;
      focus?: boolean;
      active?: boolean;
      disabled?: boolean;
    } = { hover: true, focus: true, active: true, disabled: true }
  ): SxProps<Theme> => {
    const { alpha: alphaTokens, animation } = theme.custom || { 
      alpha: { hover: 0.04, focus: 0.12, pressed: 0.16, disabled: 0.38, backdrop: 0.8 }, 
      animation: { duration: { fast: '0.15s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } },
      elevation: { medium: '0px 3px 6px rgba(0, 0, 0, 0.16)' }
    };
    const primaryColor = theme.palette.primary.main;

    const baseStyles: SxProps<Theme> = {
      transition: `all ${animation.duration.fast} ${animation.easing.standard}`,
    };

    const stateStyles: SxProps<Theme> = {};

    if (states.hover) {
      stateStyles['&:hover'] = {
        bgcolor: alpha(primaryColor, alphaTokens.hover),
        transform: component === 'button' ? 'translateY(-1px)' : undefined,
        boxShadow: component === 'card' ? theme.custom.elevation.medium : undefined,
      };
    }

    if (states.focus) {
      stateStyles['&:focus-visible'] = {
        outline: `2px solid ${primaryColor}`,
        outlineOffset: '2px',
        bgcolor: alpha(primaryColor, alphaTokens.focus),
      };
    }

    if (states.active) {
      stateStyles['&:active'] = {
        bgcolor: alpha(primaryColor, alphaTokens.pressed),
        transform: 'scale(0.98)',
      };
    }

    if (states.disabled) {
      stateStyles['&:disabled, &.Mui-disabled'] = {
        opacity: alphaTokens.disabled,
        cursor: 'not-allowed',
        transform: 'none',
        '&:hover': {
          bgcolor: 'transparent',
          transform: 'none',
        },
      };
    }

    return {
      ...baseStyles,
      ...stateStyles,
    };
  }, [theme, alpha]);

  // Composition utilities for building complex components
  const getCompositionStyles = useCallback((
    layout: 'stack' | 'inline' | 'grid' | 'flex',
    options: {
      gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      align?: 'start' | 'center' | 'end' | 'stretch';
      justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
      wrap?: boolean;
      direction?: 'row' | 'column';
    } = {}
  ): SxProps<Theme> => {
    const { spacing } = theme.custom || { spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } };
    const {
      gap = 'md',
      align = 'start',
      justify = 'start',
      wrap = false,
      direction = 'row'
    } = options;

    const gapValue = spacing[gap];

    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    };

    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    };

    switch (layout) {
      case 'stack':
        return {
          display: 'flex',
          flexDirection: 'column',
          gap: `${gapValue}px`,
          alignItems: alignMap[align],
        };

      case 'inline':
        return {
          display: 'flex',
          flexDirection: 'row',
          gap: `${gapValue}px`,
          alignItems: alignMap[align],
          justifyContent: justifyMap[justify],
          flexWrap: wrap ? 'wrap' : 'nowrap',
        };

      case 'grid':
        return {
          display: 'grid',
          gap: `${gapValue}px`,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        };

      case 'flex':
        return {
          display: 'flex',
          flexDirection: direction,
          gap: `${gapValue}px`,
          alignItems: alignMap[align],
          justifyContent: justifyMap[justify],
          flexWrap: wrap ? 'wrap' : 'nowrap',
        };

      default:
        return {};
    }
  }, [theme]);

  // Accessibility styles
  const getAccessibilityStyles = useCallback((
    features: {
      focusVisible?: boolean;
      highContrast?: boolean;
      reducedMotion?: boolean;
      screenReader?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const {
      focusVisible = true,
      highContrast = false,
      reducedMotion = false,
      screenReader = false
    } = features;

    const styles: SxProps<Theme> = {};

    if (focusVisible) {
      styles['&:focus-visible'] = {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px',
      };
    }

    if (highContrast) {
      styles['@media (prefers-contrast: high)'] = {
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: theme.palette.text.primary,
      };
    }

    if (reducedMotion) {
      styles['@media (prefers-reduced-motion: reduce)'] = {
        transition: 'none',
        animation: 'none',
      };
    }

    if (screenReader) {
      styles['&.sr-only'] = {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      };
    }

    return styles;
  }, [theme]);

  return {
    getButtonVariantStyles,
    getCardVariantStyles,
    getInputVariantStyles,
    getLoadingStateStyles,
    getStatusIndicatorStyles,
    getInteractiveStyles,
    getVariantStyles,
    getResponsiveVariantStyles,
    getComponentStateStyles,
    getCompositionStyles,
    getAccessibilityStyles,
  };
};

/**
 * Simplified hooks for common use cases
 */
export const useButtonVariantStyles = () => {
  const { getButtonVariantStyles } = useComponentStyles();
  return getButtonVariantStyles;
};

export const useCardVariantStyles = () => {
  const { getCardVariantStyles } = useComponentStyles();
  return getCardVariantStyles;
};

export const useInputVariantStyles = () => {
  const { getInputVariantStyles } = useComponentStyles();
  return getInputVariantStyles;
};

/**
 * Simplified hook for variant handling
 */
export const useVariantStyles = () => {
  const { getVariantStyles } = useComponentStyles();
  return getVariantStyles;
};

/**
 * Simplified hook for component state styles
 */
export const useComponentStateStyles = () => {
  const { getComponentStateStyles } = useComponentStyles();
  return getComponentStateStyles;
};

/**
 * Simplified hook for composition styles
 */
export const useCompositionStyles = () => {
  const { getCompositionStyles } = useComponentStyles();
  return getCompositionStyles;
};

/**
 * Simplified hook for accessibility styles
 */
export const useAccessibilityStyles = () => {
  const { getAccessibilityStyles } = useComponentStyles();
  return getAccessibilityStyles;
};