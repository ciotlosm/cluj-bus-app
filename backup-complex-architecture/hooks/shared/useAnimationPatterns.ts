import { useCallback } from 'react';
import { useThemeUtils } from './useThemeUtils';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared animation and transition patterns
 * Extracts common animation patterns used across components
 * Validates Requirements: 2.5, 6.2, 6.5
 */
export const useAnimationPatterns = () => {
  const { getAnimationStyles, theme } = useThemeUtils();

  // Common fade animation pattern
  const getFadeAnimationStyles = useCallback((
    direction: 'in' | 'out' = 'in',
    duration: 'fast' | 'normal' | 'slow' = 'normal'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    return {
      transition: `opacity ${animation.duration[duration]} ${animation.easing.standard}`,
      opacity: direction === 'in' ? 1 : 0,
    };
  }, [getAnimationStyles]);

  // Common slide animation pattern
  const getSlideAnimationStyles = useCallback((
    direction: 'up' | 'down' | 'left' | 'right' = 'up',
    distance: number = 20,
    duration: 'fast' | 'normal' | 'slow' = 'normal'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    const transformMap = {
      up: `translateY(${distance}px)`,
      down: `translateY(-${distance}px)`,
      left: `translateX(${distance}px)`,
      right: `translateX(-${distance}px)`,
    };

    return {
      transition: `transform ${animation.duration[duration]} ${animation.easing.standard}, opacity ${animation.duration[duration]} ${animation.easing.standard}`,
      transform: transformMap[direction],
      opacity: 0,
      '&.animate-in': {
        transform: 'translate(0)',
        opacity: 1,
      },
    };
  }, [getAnimationStyles]);

  // Common scale animation pattern
  const getScaleAnimationStyles = useCallback((
    scale: number = 0.9,
    duration: 'fast' | 'normal' | 'slow' = 'normal'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    return {
      transition: `transform ${animation.duration[duration]} ${animation.easing.standard}, opacity ${animation.duration[duration]} ${animation.easing.standard}`,
      transform: `scale(${scale})`,
      opacity: 0,
      '&.animate-in': {
        transform: 'scale(1)',
        opacity: 1,
      },
    };
  }, [getAnimationStyles]);

  // Common hover animation pattern
  const getHoverAnimationStyles = useCallback((
    effects: {
      scale?: number;
      translateY?: number;
      shadow?: boolean;
      brightness?: number;
    } = {}
  ): SxProps<Theme> => {
    const { scale = 1.02, translateY = -2, shadow = true, brightness = 1.1 } = effects;
    const animation = getAnimationStyles();

    return {
      transition: animation.transition.normal,
      '&:hover': {
        transform: `scale(${scale}) translateY(${translateY}px)`,
        ...(shadow && { boxShadow: theme.shadows[4] }),
        filter: `brightness(${brightness})`,
      },
    };
  }, [getAnimationStyles, theme]);

  // Common isLoading animation pattern
  const getLoadingAnimationStyles = useCallback((
    type: 'pulse' | 'spin' | 'bounce' | 'wave' = 'pulse'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    const animationMap = {
      pulse: {
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      spin: {
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      bounce: {
        animation: 'bounce 1s infinite',
        '@keyframes bounce': {
          '0%, 100%': { 
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': { 
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      wave: {
        animation: 'wave 2s ease-in-out infinite',
        '@keyframes wave': {
          '0%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(14deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(14deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
    };

    return animationMap[type];
  }, []);

  // Common stagger animation pattern for lists
  const getStaggerAnimationStyles = useCallback((
    index: number,
    delay: number = 100
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    return {
      opacity: 0,
      transform: 'translateY(20px)',
      animation: `fadeInUp ${animation.duration.normal} ${animation.easing.standard} forwards`,
      animationDelay: `${index * delay}ms`,
      '@keyframes fadeInUp': {
        to: {
          opacity: 1,
          transform: 'translateY(0)',
        },
      },
    };
  }, [getAnimationStyles]);

  // Common entrance animation pattern
  const getEntranceAnimationStyles = useCallback((
    type: 'fadeIn' | 'slideUp' | 'scaleIn' | 'slideInLeft' | 'slideInRight' = 'fadeIn',
    delay: number = 0
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    const animationMap = {
      fadeIn: {
        opacity: 0,
        animation: `fadeIn ${animation.duration.normal} ${animation.easing.standard} forwards`,
        animationDelay: `${delay}ms`,
        '@keyframes fadeIn': animation.keyframes.fadeIn,
      },
      slideUp: {
        opacity: 0,
        transform: 'translateY(20px)',
        animation: `slideUp ${animation.duration.normal} ${animation.easing.standard} forwards`,
        animationDelay: `${delay}ms`,
        '@keyframes slideUp': animation.keyframes.slideUp,
      },
      scaleIn: {
        opacity: 0,
        transform: 'scale(0.9)',
        animation: `scaleIn ${animation.duration.normal} ${animation.easing.standard} forwards`,
        animationDelay: `${delay}ms`,
        '@keyframes scaleIn': animation.keyframes.scaleIn,
      },
      slideInLeft: {
        opacity: 0,
        transform: 'translateX(-20px)',
        animation: `slideInLeft ${animation.duration.normal} ${animation.easing.standard} forwards`,
        animationDelay: `${delay}ms`,
        '@keyframes slideInLeft': {
          to: {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      },
      slideInRight: {
        opacity: 0,
        transform: 'translateX(20px)',
        animation: `slideInRight ${animation.duration.normal} ${animation.easing.standard} forwards`,
        animationDelay: `${delay}ms`,
        '@keyframes slideInRight': {
          to: {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      },
    };

    return animationMap[type];
  }, [getAnimationStyles]);

  // Common exit animation pattern
  const getExitAnimationStyles = useCallback((
    type: 'fadeOut' | 'slideDown' | 'scaleOut' = 'fadeOut'
  ): SxProps<Theme> => {
    const animation = getAnimationStyles();

    const animationMap = {
      fadeOut: {
        animation: `fadeOut ${animation.duration.fast} ${animation.easing.standard} forwards`,
        '@keyframes fadeOut': {
          to: { opacity: 0 },
        },
      },
      slideDown: {
        animation: `slideDown ${animation.duration.fast} ${animation.easing.standard} forwards`,
        '@keyframes slideDown': {
          to: {
            opacity: 0,
            transform: 'translateY(20px)',
          },
        },
      },
      scaleOut: {
        animation: `scaleOut ${animation.duration.fast} ${animation.easing.standard} forwards`,
        '@keyframes scaleOut': {
          to: {
            opacity: 0,
            transform: 'scale(0.9)',
          },
        },
      },
    };

    return animationMap[type];
  }, [getAnimationStyles]);

  // Common ripple effect animation
  const getRippleAnimationStyles = useCallback((
    color: string = theme.palette.primary.main,
    size: number = 300
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
        backgroundColor: color,
        opacity: 0.3,
        transform: 'translate(-50%, -50%)',
        transition: 'width 0.6s, height 0.6s',
        pointerEvents: 'none',
      },
      '&:active::before': {
        width: size,
        height: size,
      },
    };
  }, [theme]);

  // Reduced motion support
  const getReducedMotionStyles = useCallback((): SxProps<Theme> => {
    return {
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none !important',
        transition: 'none !important',
      },
    };
  }, []);

  return {
    getFadeAnimationStyles,
    getSlideAnimationStyles,
    getScaleAnimationStyles,
    getHoverAnimationStyles,
    getLoadingAnimationStyles,
    getStaggerAnimationStyles,
    getEntranceAnimationStyles,
    getExitAnimationStyles,
    getRippleAnimationStyles,
    getReducedMotionStyles,
  };
};

/**
 * Simplified hooks for common animation patterns
 */
export const useFadeAnimation = () => {
  const { getFadeAnimationStyles } = useAnimationPatterns();
  return getFadeAnimationStyles;
};

export const useHoverAnimation = () => {
  const { getHoverAnimationStyles } = useAnimationPatterns();
  return getHoverAnimationStyles;
};

export const useEntranceAnimation = () => {
  const { getEntranceAnimationStyles } = useAnimationPatterns();
  return getEntranceAnimationStyles;
};