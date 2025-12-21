import { useTheme, alpha } from '@mui/material/styles';
import { useCallback } from 'react';

/**
 * Theme utility hook providing common theme-related functions
 * Eliminates duplication of theme color calculations and alpha transparency patterns
 * Enhanced with design tokens for consistent theming
 */
export const useThemeUtils = () => {
  const theme = useTheme();

  // Common color utilities with alpha transparency using design tokens
  const getStatusColors = useCallback(() => {
    const { alpha: alphaTokens } = theme.custom || { alpha: { hover: 0.04, selected: 0.08, inactive: 0.6, disabled: 0.38 } };
    
    return {
      success: {
        main: theme.palette.success.main,
        light: alpha(theme.palette.success.main, 0.12),
        border: alpha(theme.palette.success.main, 0.3),
        hover: alpha(theme.palette.success.main, alphaTokens.hover),
        text: alpha(theme.palette.success.main, 0.8),
        selected: alpha(theme.palette.success.main, alphaTokens.selected),
      },
      warning: {
        main: theme.palette.warning.main,
        light: alpha(theme.palette.warning.main, 0.12),
        border: alpha(theme.palette.warning.main, 0.3),
        hover: alpha(theme.palette.warning.main, alphaTokens.hover),
        text: alpha(theme.palette.warning.main, 0.8),
        selected: alpha(theme.palette.warning.main, alphaTokens.selected),
      },
      error: {
        main: theme.palette.error.main,
        light: alpha(theme.palette.error.main, 0.12),
        border: alpha(theme.palette.error.main, 0.3),
        hover: alpha(theme.palette.error.main, alphaTokens.hover),
        text: alpha(theme.palette.error.main, 0.8),
        selected: alpha(theme.palette.error.main, alphaTokens.selected),
      },
      primary: {
        main: theme.palette.primary.main,
        light: alpha(theme.palette.primary.main, 0.12),
        border: alpha(theme.palette.primary.main, 0.3),
        hover: alpha(theme.palette.primary.main, alphaTokens.hover),
        text: alpha(theme.palette.primary.main, 0.8),
        selected: alpha(theme.palette.primary.main, alphaTokens.selected),
        gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      },
      secondary: {
        main: theme.palette.secondary.main,
        light: alpha(theme.palette.secondary.main, 0.12),
        border: alpha(theme.palette.secondary.main, 0.3),
        hover: alpha(theme.palette.secondary.main, alphaTokens.hover),
        text: alpha(theme.palette.secondary.main, 0.8),
        selected: alpha(theme.palette.secondary.main, alphaTokens.selected),
      },
    };
  }, [theme]);

  // Background utilities for cards and surfaces using design tokens
  const getBackgroundColors = useCallback(() => {
    const { alpha: alphaTokens } = theme.custom || { alpha: { overlay: 0.5, backdrop: 0.8 } };
    
    return {
      paper: theme.palette.background.paper,
      paperFaded: alpha(theme.palette.background.paper, 0.3),
      paperHover: alpha(theme.palette.background.paper, 0.9),
      default: theme.palette.background.default,
      overlay: alpha(theme.palette.background.paper, alphaTokens.overlay),
      blur: alpha(theme.palette.background.paper, alphaTokens.backdrop),
      surface: theme.palette.surface?.main || theme.palette.background.paper,
      surfaceVariant: theme.palette.surface?.variant || alpha(theme.palette.background.paper, 0.8),
    };
  }, [theme]);

  // Border utilities using design tokens
  const getBorderColors = useCallback(() => {
    const { alpha: alphaTokens } = theme.custom || { alpha: { focus: 0.12 } };
    
    return {
      divider: theme.palette.divider,
      dividerLight: alpha(theme.palette.divider, 0.1),
      dividerMedium: alpha(theme.palette.divider, 0.5),
      dividerStrong: alpha(theme.palette.divider, 0.7),
      outline: theme.palette.outline?.main || alpha(theme.palette.divider, alphaTokens.focus),
      outlineVariant: theme.palette.outline?.variant || alpha(theme.palette.divider, 0.2),
    };
  }, [theme]);

  // Text utilities with opacity variations using design tokens
  const getTextColors = useCallback(() => {
    const { alpha: alphaTokens } = theme.custom || { alpha: { inactive: 0.6, disabled: 0.38, hover: 0.04 } };
    
    return {
      primary: theme.palette.text.primary,
      primaryFaded: alpha(theme.palette.text.primary, alphaTokens.inactive),
      primaryLight: alpha(theme.palette.text.primary, 0.8),
      secondary: theme.palette.text.secondary,
      disabled: alpha(theme.palette.text.primary, alphaTokens.disabled),
      white: theme.palette.common.white,
      whiteFaded: alpha(theme.palette.common.white, 0.7),
      whiteLight: alpha(theme.palette.common.white, 0.1),
      whiteHover: alpha(theme.palette.common.white, alphaTokens.hover),
    };
  }, [theme]);

  // Delay/timing color utility (commonly used for ETA displays)
  const getDelayColor = useCallback((delay: number) => {
    if (delay <= 2) return theme.palette.success.main;
    if (delay <= 5) return theme.palette.warning.main;
    return theme.palette.error.main;
  }, [theme]);

  // Route color generator (consistent colors based on route ID)
  const getRouteColor = useCallback((routeId: string) => {
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
  }, [theme]);

  // Data freshness color utility (for status indicators)
  const getDataFreshnessColor = useCallback((
    minutesSinceUpdate: number, 
    staleThreshold: number = 5,
    isOffline: boolean = false
  ) => {
    if (isOffline) {
      return theme.palette.error.main;
    }
    
    if (minutesSinceUpdate <= staleThreshold) {
      return theme.palette.success.main;
    }
    
    return theme.palette.warning.main;
  }, [theme]);

  // Common shadow utilities using design tokens
  const getShadows = useCallback(() => {
    const { elevation } = theme.custom || { 
      elevation: { 
        none: 'none', 
        low: '0px 1px 3px rgba(0, 0, 0, 0.12)', 
        medium: '0px 3px 6px rgba(0, 0, 0, 0.16)', 
        high: '0px 10px 20px rgba(0, 0, 0, 0.19)',
        highest: '0px 14px 28px rgba(0, 0, 0, 0.25)'
      } 
    };
    
    return {
      none: elevation.none,
      light: elevation.low,
      medium: elevation.medium,
      heavy: elevation.high,
      highest: elevation.highest,
    };
  }, [theme]);

  // Mode-specific utilities
  const isDarkMode = theme.palette.mode === 'dark';
  const isLightMode = theme.palette.mode === 'light';

  // Header background utility (commonly used pattern)
  const getHeaderBackground = useCallback(() => {
    return isDarkMode 
      ? theme.palette.background.paper
      : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`;
  }, [theme, isDarkMode]);

  // Spacing utilities using design tokens
  const getSpacing = useCallback(() => {
    const { spacing } = theme.custom || { spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 } };
    
    return {
      xs: `${spacing.xs}px`,
      sm: `${spacing.sm}px`,
      md: `${spacing.md}px`,
      lg: `${spacing.lg}px`,
      xl: `${spacing.xl}px`,
      xxl: `${spacing.xxl}px`,
      xxxl: `${spacing.xxxl}px`,
      // Helper functions
      multiply: (token: keyof typeof spacing, multiplier: number) => `${spacing[token] * multiplier}px`,
      add: (token1: keyof typeof spacing, token2: keyof typeof spacing) => `${spacing[token1] + spacing[token2]}px`,
    };
  }, [theme]);

  // Border radius utilities using design tokens
  const getBorderRadius = useCallback(() => {
    const { borderRadius } = theme.custom || { borderRadius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, round: '50%' } };
    
    return {
      xs: `${borderRadius.xs}px`,
      sm: `${borderRadius.sm}px`,
      md: `${borderRadius.md}px`,
      lg: `${borderRadius.lg}px`,
      xl: `${borderRadius.xl}px`,
      xxl: `${borderRadius.xxl}px`,
      round: borderRadius.round,
    };
  }, [theme]);

  // Animation utilities using design tokens
  const getAnimationStyles = useCallback(() => {
    const { animation } = theme.custom || { 
      animation: { 
        duration: { fast: '0.15s', normal: '0.3s', slow: '0.5s' },
        easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' }
      } 
    };
    
    return {
      transition: {
        fast: `all ${animation.duration.fast} ${animation.easing.standard}`,
        normal: `all ${animation.duration.normal} ${animation.easing.standard}`,
        slow: `all ${animation.duration.slow} ${animation.easing.standard}`,
        colors: `background-color ${animation.duration.normal} ${animation.easing.standard}, color ${animation.duration.normal} ${animation.easing.standard}`,
        transform: `transform ${animation.duration.fast} ${animation.easing.standard}`,
        opacity: `opacity ${animation.duration.normal} ${animation.easing.standard}`,
        elevation: `box-shadow ${animation.duration.normal} ${animation.easing.standard}`,
      },
      duration: animation.duration,
      easing: animation.easing,
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        scaleIn: {
          from: { transform: 'scale(0.9)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 },
        },
      },
    };
  }, [theme]);

  // Comprehensive color utilities with semantic naming
  const getSemanticColors = useCallback(() => {
    const { alpha: alphaTokens } = theme.custom || { alpha: { hover: 0.04, pressed: 0.16, focus: 0.12, disabled: 0.38, overlay: 0.5, backdrop: 0.8 } };
    
    return {
      // Interactive states
      interactive: {
        default: theme.palette.text.primary,
        hover: alpha(theme.palette.primary.main, alphaTokens.hover),
        active: alpha(theme.palette.primary.main, alphaTokens.pressed),
        disabled: alpha(theme.palette.text.primary, alphaTokens.disabled),
        focus: alpha(theme.palette.primary.main, alphaTokens.focus),
      },
      // Surface colors
      surface: {
        default: theme.palette.background.default,
        paper: theme.palette.background.paper,
        elevated: theme.palette.background.paper,
        overlay: alpha(theme.palette.background.paper, alphaTokens.overlay),
        backdrop: alpha(theme.palette.common.black, alphaTokens.backdrop),
      },
      // Content colors
      content: {
        primary: theme.palette.text.primary,
        secondary: theme.palette.text.secondary,
        tertiary: alpha(theme.palette.text.primary, 0.6),
        inverse: theme.palette.common.white,
        onPrimary: theme.palette.primary.contrastText,
        onSecondary: theme.palette.secondary.contrastText,
      },
      // Border colors
      border: {
        default: theme.palette.divider,
        subtle: alpha(theme.palette.divider, 0.1),
        strong: alpha(theme.palette.divider, 0.7),
        focus: theme.palette.primary.main,
        error: theme.palette.error.main,
      },
    };
  }, [theme]);

  // Layout utilities using design tokens
  const getLayoutStyles = useCallback(() => {
    const { spacing } = theme.custom || { spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 } };
    
    return {
      container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: `0 ${spacing.md}px`,
      },
      section: {
        padding: `${spacing.xl}px 0`,
      },
      stack: {
        vertical: (gap: keyof typeof spacing = 'md') => ({
          display: 'flex',
          flexDirection: 'column' as const,
          gap: `${spacing[gap]}px`,
        }),
        horizontal: (gap: keyof typeof spacing = 'md') => ({
          display: 'flex',
          flexDirection: 'row' as const,
          gap: `${spacing[gap]}px`,
          alignItems: 'center',
        }),
      },
      grid: {
        responsive: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: `${spacing.lg}px`,
        },
        columns: (columns: number, gap: keyof typeof spacing = 'md') => ({
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${spacing[gap]}px`,
        }),
      },
    };
  }, [theme]);

  // Typography utilities using design tokens
  const getTypographyStyles = useCallback(() => {
    return {
      heading: {
        display: {
          fontSize: theme.typography.h1.fontSize,
          fontWeight: theme.typography.h1.fontWeight,
          lineHeight: theme.typography.h1.lineHeight,
          color: theme.palette.text.primary,
        },
        headline: {
          fontSize: theme.typography.h2.fontSize,
          fontWeight: theme.typography.h2.fontWeight,
          lineHeight: theme.typography.h2.lineHeight,
          color: theme.palette.text.primary,
        },
        title: {
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.h3.fontWeight,
          lineHeight: theme.typography.h3.lineHeight,
          color: theme.palette.text.primary,
        },
        subtitle: {
          fontSize: theme.typography.h4.fontSize,
          fontWeight: theme.typography.h4.fontWeight,
          lineHeight: theme.typography.h4.lineHeight,
          color: theme.palette.text.secondary,
        },
      },
      body: {
        large: {
          fontSize: theme.typography.body1.fontSize,
          fontWeight: theme.typography.body1.fontWeight,
          lineHeight: theme.typography.body1.lineHeight,
          color: theme.palette.text.primary,
        },
        medium: {
          fontSize: theme.typography.body2.fontSize,
          fontWeight: theme.typography.body2.fontWeight,
          lineHeight: theme.typography.body2.lineHeight,
          color: theme.palette.text.primary,
        },
        small: {
          fontSize: theme.typography.caption?.fontSize || '0.75rem',
          fontWeight: theme.typography.caption?.fontWeight || 400,
          lineHeight: theme.typography.caption?.lineHeight || 1.4,
          color: theme.palette.text.secondary,
        },
      },
      label: {
        large: {
          fontSize: theme.typography.button.fontSize,
          fontWeight: theme.typography.button.fontWeight,
          textTransform: theme.typography.button.textTransform,
          color: theme.palette.text.primary,
        },
        medium: {
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'none' as const,
          color: theme.palette.text.primary,
        },
        small: {
          fontSize: '0.6875rem',
          fontWeight: 500,
          textTransform: 'none' as const,
          color: theme.palette.text.secondary,
        },
      },
    };
  }, [theme]);

  return {
    theme,
    isDarkMode,
    isLightMode,
    getStatusColors,
    getBackgroundColors,
    getBorderColors,
    getTextColors,
    getSemanticColors,
    getDelayColor,
    getRouteColor,
    getDataFreshnessColor,
    getShadows,
    getHeaderBackground,
    getSpacing,
    getBorderRadius,
    getAnimationStyles,
    getLayoutStyles,
    getTypographyStyles,
    // Direct alpha utility for custom cases
    alpha: (color: string, opacity: number) => alpha(color, opacity),
    // Design token access
    tokens: theme.custom || {},
  };
};

/**
 * Simplified hook for just getting status colors (most common use case)
 */
export const useStatusColors = () => {
  const { getStatusColors } = useThemeUtils();
  return getStatusColors();
};

/**
 * Simplified hook for background colors
 */
export const useBackgroundColors = () => {
  const { getBackgroundColors } = useThemeUtils();
  return getBackgroundColors();
};

/**
 * Simplified hook for semantic colors
 */
export const useSemanticColors = () => {
  const { getSemanticColors } = useThemeUtils();
  return getSemanticColors();
};

/**
 * Simplified hook for spacing utilities
 */
export const useSpacing = () => {
  const { getSpacing } = useThemeUtils();
  return getSpacing();
};

/**
 * Simplified hook for animation styles
 */
export const useAnimationStyles = () => {
  const { getAnimationStyles } = useThemeUtils();
  return getAnimationStyles();
};

/**
 * Simplified hook for layout styles
 */
export const useLayoutStyles = () => {
  const { getLayoutStyles } = useThemeUtils();
  return getLayoutStyles();
};

/**
 * Simplified hook for typography styles
 */
export const useTypographyStyles = () => {
  const { getTypographyStyles } = useThemeUtils();
  return getTypographyStyles();
};