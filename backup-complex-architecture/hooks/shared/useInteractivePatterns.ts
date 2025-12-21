import { useCallback } from 'react';
import { useThemeUtils } from './useThemeUtils';
import type { SxProps, Theme } from '@mui/material/styles';
import type { MouseEvent, KeyboardEvent } from 'react';

/**
 * Shared interactive element patterns
 * Extracts common hover effects, click handlers, and keyboard navigation patterns
 * Validates Requirements: 2.5, 6.2, 6.5
 */
export const useInteractivePatterns = () => {
  const { alpha, theme, getSpacing, getBorderRadius, getAnimationStyles } = useThemeUtils();

  // Common hover effect pattern used across cards and buttons
  const getHoverEffectStyles = useCallback((
    color: string = theme.palette.primary.main,
    intensity: 'subtle' | 'medium' | 'strong' = 'medium'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();
    const intensityMap = {
      subtle: { alpha: 0.04, scale: 1.01, elevation: 1 },
      medium: { alpha: 0.08, scale: 1.02, elevation: 2 },
      strong: { alpha: 0.12, scale: 1.05, elevation: 3 },
    };

    const config = intensityMap[intensity];

    return {
      cursor: 'pointer',
      transition: animation.transition.normal,
      '&:hover': {
        bgcolor: alpha(color, config.alpha),
        transform: `scale(${config.scale})`,
        boxShadow: theme.shadows[config.elevation],
      },
      '&:active': {
        transform: 'scale(0.98)',
      },
    };
  }, [alpha, theme, getAnimationStyles]);

  // Common focus styles pattern for accessibility
  const getFocusStyles = useCallback((
    color: string = theme.palette.primary.main,
    variant: 'outline' | 'background' | 'both' = 'outline'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    const baseStyles: SxProps<Theme> = {
      transition: animation.transition.normal,
      '&:focus-visible': {
        outline: 'none', // Remove default outline
      },
    };

    switch (variant) {
      case 'outline':
        return {
          ...baseStyles,
          '&:focus-visible': {
            ...(typeof baseStyles['&:focus-visible'] === 'object' && baseStyles['&:focus-visible'] !== null ? baseStyles['&:focus-visible'] : {}),
            outline: `2px solid ${color}`,
            outlineOffset: '2px',
          },
        };
      case 'background':
        return {
          ...baseStyles,
          '&:focus-visible': {
            ...(typeof baseStyles['&:focus-visible'] === 'object' && baseStyles['&:focus-visible'] !== null ? baseStyles['&:focus-visible'] : {}),
            bgcolor: alpha(color, 0.12),
          },
        };
      case 'both':
        return {
          ...baseStyles,
          '&:focus-visible': {
            ...(typeof baseStyles['&:focus-visible'] === 'object' && baseStyles['&:focus-visible'] !== null ? baseStyles['&:focus-visible'] : {}),
            outline: `2px solid ${color}`,
            outlineOffset: '2px',
            bgcolor: alpha(color, 0.12),
          },
        };
      default:
        return baseStyles;
    }
  }, [alpha, theme, getAnimationStyles]);

  // Common clickable area pattern with proper touch targets
  const getClickableAreaStyles = useCallback((
    minSize: number = 44, // Minimum touch target size for accessibility
    padding?: string
  ): SxProps<Theme> => {
    const spacing = getSpacing();
    const borderRadius = getBorderRadius();

    return {
      minWidth: minSize,
      minHeight: minSize,
      padding: padding || spacing.sm,
      borderRadius: borderRadius.md,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent', // Remove mobile tap highlight
    };
  }, [getSpacing, getBorderRadius]);

  // Common interactive state styles (hover, focus, active, disabled)
  const getInteractiveStateStyles = useCallback((
    color: string = theme.palette.primary.main,
    options: {
      hover?: boolean;
      focus?: boolean;
      active?: boolean;
      isDisabled?: boolean;
      intensity?: 'subtle' | 'medium' | 'strong';
    } = {}
  ): SxProps<Theme> => {
    const {
      hover = true,
      focus = true,
      active = true,
      isDisabled = true,
      intensity = 'medium',
    } = options;

    const animation = getAnimationStyles();
    const intensityMap = {
      subtle: { hover: 0.04, focus: 0.08, active: 0.12, isDisabled: 0.38 },
      medium: { hover: 0.08, focus: 0.12, active: 0.16, isDisabled: 0.38 },
      strong: { hover: 0.12, focus: 0.16, active: 0.20, isDisabled: 0.38 },
    };

    const alphaValues = intensityMap[intensity];
    const styles: SxProps<Theme> = {
      transition: animation.transition.normal,
    };

    if (hover) {
      styles['&:hover'] = {
        bgcolor: alpha(color, alphaValues.hover),
      };
    }

    if (focus) {
      styles['&:focus-visible'] = {
        outline: `2px solid ${color}`,
        outlineOffset: '2px',
        bgcolor: alpha(color, alphaValues.focus),
      };
    }

    if (active) {
      styles['&:active'] = {
        bgcolor: alpha(color, alphaValues.active),
        transform: 'scale(0.98)',
      };
    }

    if (isDisabled) {
      styles['&:disabled, &.Mui-disabled'] = {
        opacity: alphaValues.isDisabled,
        cursor: 'not-allowed',
        transform: 'none',
        '&:hover': {
          bgcolor: 'transparent',
          transform: 'none',
        },
      };
    }

    return styles;
  }, [alpha, theme, getAnimationStyles]);

  // Generic click handler with data passing pattern
  const createClickHandler = useCallback(<T = any>(
    handler: (data?: T) => void | Promise<void>,
    data?: T,
    options: {
      preventDefault?: boolean;
      stopPropagation?: boolean;
      isDisabled?: boolean;
    } = {}
  ) => {
    const { preventDefault = true, stopPropagation = false, isDisabled = false } = options;

    return async (event: MouseEvent<HTMLElement>) => {
      if (isDisabled) return;

      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();

      await handler(data);
    };
  }, []);

  // Keyboard navigation handler pattern
  const createKeyboardHandler = useCallback(<T = any>(
    handler: (data?: T) => void | Promise<void>,
    data?: T,
    keys: string[] = ['Enter', ' '] // Space and Enter by default
  ) => {
    return async (event: KeyboardEvent<HTMLElement>) => {
      if (keys.includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        await handler(data);
      }
    };
  }, []);

  // Combined click and keyboard handler for full accessibility
  const createAccessibleHandler = useCallback(<T = any>(
    handler: (data?: T) => void | Promise<void>,
    data?: T,
    options: {
      keys?: string[];
      isDisabled?: boolean;
    } = {}
  ) => {
    const { keys = ['Enter', ' '], isDisabled = false } = options;

    return {
      onClick: createClickHandler(handler, data, { isDisabled }),
      onKeyDown: createKeyboardHandler(handler, data, keys),
      tabIndex: isDisabled ? -1 : 0,
      role: 'button',
      'aria-disabled': isDisabled,
    };
  }, [createClickHandler, createKeyboardHandler]);

  // Loading state overlay pattern
  const getLoadingOverlayStyles = useCallback((): SxProps<Theme> => {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: alpha(theme.palette.background.paper, 0.8),
      backdropFilter: 'blur(4px)',
      zIndex: theme.zIndex.modal - 1,
      borderRadius: 'inherit',
    };
  }, [alpha, theme]);

  // Ripple effect pattern for Material Design
  const getRippleStyles = useCallback((
    color: string = theme.palette.primary.main
  ): SxProps<Theme> => {
    return {
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        borderRadius: '50%',
        bgcolor: alpha(color, 0.3),
        transform: 'translate(-50%, -50%)',
        transition: 'width 0.6s, height 0.6s',
      },
      '&:active::before': {
        width: '300px',
        height: '300px',
      },
    };
  }, [alpha, theme]);

  return {
    getHoverEffectStyles,
    getFocusStyles,
    getClickableAreaStyles,
    getInteractiveStateStyles,
    getLoadingOverlayStyles,
    getRippleStyles,
    createClickHandler,
    createKeyboardHandler,
    createAccessibleHandler,
  };
};

/**
 * Simplified hook for hover effects
 */
export const useHoverEffects = () => {
  const { getHoverEffectStyles } = useInteractivePatterns();
  return getHoverEffectStyles;
};

/**
 * Simplified hook for focus styles
 */
export const useFocusStyles = () => {
  const { getFocusStyles } = useInteractivePatterns();
  return getFocusStyles;
};

/**
 * Simplified hook for accessible handlers
 */
export const useAccessibleHandlers = () => {
  const { createAccessibleHandler } = useInteractivePatterns();
  return createAccessibleHandler;
};