import { useCallback } from 'react';
import { useThemeUtils } from './useThemeUtils';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared layout composition patterns
 * Extracts common spacing, alignment, and responsive layout patterns
 * Validates Requirements: 2.5, 6.2, 6.5
 */
export const useLayoutPatterns = () => {
  const { getSpacing, getBorderRadius, theme } = useThemeUtils();

  // Common flex layout patterns
  const getFlexLayoutStyles = useCallback((
    direction: 'row' | 'column' = 'row',
    options: {
      gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
      justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
      wrap?: boolean;
      isFullWidth?: boolean;
      fullHeight?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const {
      gap = 'md',
      align = 'start',
      justify = 'start',
      wrap = false,
      isFullWidth = false,
      fullHeight = false,
    } = options;

    const spacing = getSpacing();

    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
      baseline: 'baseline',
    };

    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    };

    return {
      display: 'flex',
      flexDirection: direction,
      gap: spacing[gap],
      alignItems: alignMap[align],
      justifyContent: justifyMap[justify],
      flexWrap: wrap ? 'wrap' : 'nowrap',
      width: isFullWidth ? '100%' : 'auto',
      height: fullHeight ? '100%' : 'auto',
    };
  }, [getSpacing]);

  // Common grid layout patterns
  const getGridLayoutStyles = useCallback((
    columns: number | 'auto-fit' | 'auto-fill' = 'auto-fit',
    options: {
      gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      minColumnWidth?: string;
      maxColumnWidth?: string;
      rows?: number | 'auto';
      alignItems?: 'start' | 'center' | 'end' | 'stretch';
      justifyItems?: 'start' | 'center' | 'end' | 'stretch';
    } = {}
  ): SxProps<Theme> => {
    const {
      gap = 'md',
      minColumnWidth = '280px',
      maxColumnWidth = '1fr',
      rows = 'auto',
      alignItems = 'stretch',
      justifyItems = 'stretch',
    } = options;

    const spacing = getSpacing();

    let gridTemplateColumns: string;
    if (typeof columns === 'number') {
      gridTemplateColumns = `repeat(${columns}, 1fr)`;
    } else {
      gridTemplateColumns = `repeat(${columns}, minmax(${minColumnWidth}, ${maxColumnWidth}))`;
    }

    return {
      display: 'grid',
      gridTemplateColumns,
      gridTemplateRows: typeof rows === 'number' ? `repeat(${rows}, 1fr)` : rows,
      gap: spacing[gap],
      alignItems,
      justifyItems,
    };
  }, [getSpacing]);

  // Common stack layout pattern (vertical flex with consistent spacing)
  const getStackLayoutStyles = useCallback((
    gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md',
    options: {
      align?: 'start' | 'center' | 'end' | 'stretch';
      isFullWidth?: boolean;
      dividers?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const { align = 'stretch', isFullWidth = true, dividers = false } = options;
    const spacing = getSpacing();

    const baseStyles = getFlexLayoutStyles('column', {
      gap,
      align,
      isFullWidth,
    });

    if (dividers) {
      return {
        ...baseStyles,
        '& > *:not(:last-child)': {
          borderBottom: `1px solid ${theme.palette.divider}`,
          paddingBottom: spacing[gap],
        },
        '& > *:not(:first-of-type)': {
          paddingTop: spacing[gap],
        },
        gap: 0, // Remove gap when using dividers
      };
    }

    return baseStyles;
  }, [getFlexLayoutStyles, getSpacing, theme]);

  // Common inline layout pattern (horizontal flex with consistent spacing)
  const getInlineLayoutStyles = useCallback((
    gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm',
    options: {
      align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
      justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
      wrap?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const { align = 'center', justify = 'start', wrap = true } = options;

    return getFlexLayoutStyles('row', {
      gap,
      align,
      justify,
      wrap,
    });
  }, [getFlexLayoutStyles]);

  // Common container pattern with max width and centering
  const getContainerStyles = useCallback((
    maxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none' | string = 'lg',
    options: {
      padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      centered?: boolean;
      fullHeight?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const { padding = 'md', centered = true, fullHeight = false } = options;
    const spacing = getSpacing();

    const maxWidthMap = {
      xs: '444px',
      sm: '600px',
      md: '900px',
      lg: '1200px',
      xl: '1536px',
      none: 'none',
    };

    return {
      maxWidth: typeof maxWidth === 'string' && maxWidth in maxWidthMap 
        ? maxWidthMap[maxWidth as keyof typeof maxWidthMap] 
        : maxWidth,
      width: '100%',
      margin: centered ? '0 auto' : '0',
      padding: spacing[padding],
      height: fullHeight ? '100%' : 'auto',
    };
  }, [getSpacing]);

  // Common section pattern with consistent spacing
  const getSectionStyles = useCallback((
    options: {
      padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      background?: boolean;
      border?: boolean;
      rounded?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const { 
      padding = 'lg', 
      margin = 'md', 
      background = false, 
      border = false, 
      rounded = false 
    } = options;
    
    const spacing = getSpacing();
    const borderRadius = getBorderRadius();

    return {
      padding: spacing[padding],
      margin: spacing[margin],
      backgroundColor: background ? theme.palette.background.paper : 'transparent',
      border: border ? `1px solid ${theme.palette.divider}` : 'none',
      borderRadius: rounded ? borderRadius.lg : 0,
    };
  }, [getSpacing, getBorderRadius, theme]);

  // Responsive breakpoint utilities
  const getResponsiveStyles = useCallback((
    styles: {
      xs?: SxProps<Theme>;
      sm?: SxProps<Theme>;
      md?: SxProps<Theme>;
      lg?: SxProps<Theme>;
      xl?: SxProps<Theme>;
    }
  ): SxProps<Theme> => {
    const responsiveStyles: SxProps<Theme> = {};

    // Apply base styles (xs)
    if (styles.xs) {
      Object.assign(responsiveStyles, styles.xs);
    }

    // Apply breakpoint-specific styles
    Object.entries(styles).forEach(([breakpoint, breakpointStyles]) => {
      if (breakpoint !== 'xs' && breakpointStyles) {
        responsiveStyles[theme.breakpoints.up(breakpoint as 'sm' | 'md' | 'lg' | 'xl')] = breakpointStyles;
      }
    });

    return responsiveStyles;
  }, [theme]);

  // Common card layout pattern
  const getCardLayoutStyles = useCallback((
    options: {
      padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      headerPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      contentPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      actionsPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    } = {}
  ): {
    card: SxProps<Theme>;
    header: SxProps<Theme>;
    content: SxProps<Theme>;
    actions: SxProps<Theme>;
  } => {
    const {
      padding = 'md',
      headerPadding = padding,
      contentPadding = padding,
      actionsPadding = padding,
      gap = 'sm',
    } = options;

    const spacing = getSpacing();

    return {
      card: {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[gap],
      },
      header: {
        padding: spacing[headerPadding],
        borderBottom: `1px solid ${theme.palette.divider}`,
      },
      content: {
        padding: spacing[contentPadding],
        flexGrow: 1,
      },
      actions: {
        padding: spacing[actionsPadding],
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        gap: spacing.sm,
        justifyContent: 'flex-end',
      },
    };
  }, [getSpacing, theme]);

  // Common list layout pattern
  const getListLayoutStyles = useCallback((
    options: {
      gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      dividers?: boolean;
      padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      dense?: boolean;
    } = {}
  ): SxProps<Theme> => {
    const { gap = 'sm', dividers = true, padding = 'sm', dense = false } = options;
    const spacing = getSpacing();

    const baseStyles: SxProps<Theme> = {
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      '& .MuiListItem-root': {
        padding: dense ? spacing.xs : spacing[padding],
      },
    };

    if (dividers) {
      baseStyles['& .MuiListItem-root:not(:last-child)'] = {
        borderBottom: `1px solid ${theme.palette.divider}`,
      };
    } else {
      baseStyles.gap = spacing[gap];
    }

    return baseStyles;
  }, [getSpacing, theme]);

  return {
    getFlexLayoutStyles,
    getGridLayoutStyles,
    getStackLayoutStyles,
    getInlineLayoutStyles,
    getContainerStyles,
    getSectionStyles,
    getResponsiveStyles,
    getCardLayoutStyles,
    getListLayoutStyles,
  };
};

/**
 * Simplified hook for flex layouts
 */
export const useFlexLayout = () => {
  const { getFlexLayoutStyles } = useLayoutPatterns();
  return getFlexLayoutStyles;
};

/**
 * Simplified hook for stack layouts
 */
export const useStackLayout = () => {
  const { getStackLayoutStyles } = useLayoutPatterns();
  return getStackLayoutStyles;
};

/**
 * Simplified hook for responsive styles
 */
export const useResponsiveStyles = () => {
  const { getResponsiveStyles } = useLayoutPatterns();
  return getResponsiveStyles;
};