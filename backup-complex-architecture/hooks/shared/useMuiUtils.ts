import { useCallback } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { useThemeUtils } from './useThemeUtils';

/**
 * Material-UI utility hook providing common component styling patterns
 * Eliminates duplication of sx prop patterns across components
 */
export const useMuiUtils = () => {
  const { 
    getStatusColors, 
    getBackgroundColors, 
    getBorderColors, 
    getShadows,
    alpha,
    theme 
  } = useThemeUtils();

  // Common card styles using design tokens
  const getCardStyles = useCallback((variant: 'default' | 'elevated' | 'outlined' | 'glass' = 'default'): SxProps<Theme> => {
    const backgrounds = getBackgroundColors();
    const borders = getBorderColors();
    const shadows = getShadows();
    const { borderRadius, animation } = theme.custom || { 
      borderRadius: { lg: 16 }, 
      animation: { duration: { normal: '0.3s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };

    const baseStyles: SxProps<Theme> = {
      borderRadius: `${borderRadius.lg}px`,
      transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
      position: 'relative',
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          boxShadow: shadows.light,
          bgcolor: backgrounds.paper,
          '&:hover': {
            boxShadow: shadows.medium,
          },
        };
      
      case 'outlined':
        return {
          ...baseStyles,
          border: `1px solid ${borders.dividerLight}`,
          bgcolor: backgrounds.paper,
          boxShadow: shadows.none,
        };
      
      case 'glass':
        return {
          ...baseStyles,
          bgcolor: backgrounds.blur,
          backdropFilter: 'blur(16px)',
          border: `1px solid ${borders.dividerMedium}`,
        };
      
      default:
        return {
          ...baseStyles,
          bgcolor: backgrounds.paper,
          boxShadow: shadows.light,
        };
    }
  }, [getBackgroundColors, getBorderColors, getShadows, theme]);

  // Common button styles using design tokens
  const getButtonStyles = useCallback((
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary',
    size: 'small' | 'medium' | 'large' = 'medium'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const { spacing, borderRadius, animation } = theme.custom || { 
      spacing: { xs: 4, sm: 8, md: 16, lg: 24 }, 
      borderRadius: { xl: 20 }, 
      animation: { duration: { normal: '0.3s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };
    
    const colorConfig = variant === 'primary' ? colors.primary :
                       variant === 'secondary' ? colors.secondary :
                       variant === 'success' ? colors.success :
                       variant === 'warning' ? colors.warning :
                       colors.error;

    const sizeConfig = {
      small: { 
        height: 32, 
        fontSize: '0.75rem', 
        px: `${spacing.sm}px`,
        py: `${spacing.xs}px`,
      },
      medium: { 
        height: 40, 
        fontSize: '0.875rem', 
        px: `${spacing.md}px`,
        py: `${spacing.sm}px`,
      },
      large: { 
        height: 48, 
        fontSize: '1rem', 
        px: `${spacing.lg}px`,
        py: `${spacing.md}px`,
      },
    };

    return {
      ...sizeConfig[size],
      bgcolor: colorConfig.light,
      color: colorConfig.main,
      border: `1px solid ${colorConfig.border}`,
      borderRadius: `${borderRadius.xl}px`,
      fontWeight: 600,
      transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
      '&:hover': {
        bgcolor: colorConfig.hover,
        border: `1px solid ${colorConfig.main}`,
        transform: 'scale(1.02)',
      },
      '&:active': {
        transform: 'scale(0.98)',
      },
    };
  }, [getStatusColors, theme]);

  // Common chip styles using design tokens
  const getChipStyles = useCallback((
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary',
    size: 'small' | 'medium' = 'medium'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const { spacing, borderRadius, animation } = theme.custom || { 
      spacing: { xs: 4, sm: 8, md: 16 }, 
      borderRadius: { md: 12 }, 
      animation: { duration: { fast: '0.15s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };
    
    const colorConfig = variant === 'primary' ? colors.primary :
                       variant === 'secondary' ? colors.secondary :
                       variant === 'success' ? colors.success :
                       variant === 'warning' ? colors.warning :
                       colors.error;

    return {
      bgcolor: colorConfig.light,
      color: colorConfig.main,
      border: `1px solid ${colorConfig.border}`,
      borderRadius: `${borderRadius.md}px`,
      fontSize: size === 'small' ? '0.65rem' : '0.75rem',
      height: size === 'small' ? 20 : 24,
      fontWeight: 600,
      transition: `all ${animation.duration.fast} ${animation.easing.standard}`,
      '& .MuiChip-label': {
        px: size === 'small' ? `${spacing.xs}px` : `${spacing.sm}px`,
      },
      '&:hover': {
        bgcolor: colorConfig.hover,
      },
    };
  }, [getStatusColors, theme]);

  // Common avatar styles
  const getAvatarStyles = useCallback((
    variant: 'primary' | 'secondary' | 'route' = 'primary',
    size: number = 44
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    
    const colorConfig = variant === 'primary' ? colors.primary :
                       variant === 'secondary' ? colors.secondary :
                       colors.primary; // Default for route

    return {
      bgcolor: colorConfig.main,
      width: size,
      height: size,
      fontWeight: 'bold',
      fontSize: size < 40 ? '0.75rem' : '0.85rem',
    };
  }, [getStatusColors]);

  // Common status indicator styles (pills) using design tokens
  const getStatusIndicatorStyles = useCallback((
    variant: 'success' | 'warning' | 'error' = 'success',
    compact: boolean = false
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const { spacing, borderRadius, animation } = theme.custom || { 
      spacing: { xs: 4, sm: 8 }, 
      borderRadius: { md: 12, lg: 16 }, 
      animation: { duration: { fast: '0.15s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };
    
    const colorConfig = variant === 'success' ? colors.success :
                       variant === 'warning' ? colors.warning :
                       colors.error;

    return {
      display: 'flex',
      alignItems: 'center',
      gap: `${spacing.xs}px`,
      px: compact ? `${spacing.xs}px` : `${spacing.sm}px`,
      py: compact ? `${spacing.xs / 2}px` : `${spacing.xs}px`,
      borderRadius: compact ? `${borderRadius.md}px` : `${borderRadius.lg}px`,
      bgcolor: colorConfig.light,
      border: `1px solid ${colorConfig.border}`,
      color: colorConfig.main,
      minWidth: 'auto',
      fontSize: compact ? '0.65rem' : '0.75rem',
      fontWeight: 600,
      transition: `all ${animation.duration.fast} ${animation.easing.standard}`,
    };
  }, [getStatusColors, theme]);

  // Common modal/dialog styles using design tokens
  const getModalStyles = useCallback((): SxProps<Theme> => {
    const backgrounds = getBackgroundColors();
    const borders = getBorderColors();
    const shadows = getShadows();
    const { borderRadius } = theme.custom || { borderRadius: { lg: 16 } };

    return {
      bgcolor: backgrounds.paper,
      borderRadius: `${borderRadius.lg}px`,
      boxShadow: shadows.highest,
      border: `1px solid ${borders.dividerLight}`,
      backdropFilter: 'blur(8px)',
    };
  }, [getBackgroundColors, getBorderColors, getShadows, theme]);

  // Common header styles using design tokens
  const getHeaderStyles = useCallback((): SxProps<Theme> => {
    const { getHeaderBackground } = useThemeUtils();
    const borders = getBorderColors();
    const shadows = getShadows();
    const { borderRadius } = theme.custom || { borderRadius: { lg: 16 } };

    return {
      background: getHeaderBackground(),
      boxShadow: theme.palette.mode === 'dark' ? shadows.none : shadows.medium,
      borderBottom: theme.palette.mode === 'dark' 
        ? `1px solid ${borders.outline}` 
        : 'none',
      borderRadius: `0 0 ${borderRadius.lg}px ${borderRadius.lg}px`,
    };
  }, [getBorderColors, getShadows, theme]);

  // Common list item styles
  const getListItemStyles = useCallback((
    isLast: boolean = false,
    isSelected: boolean = false,
    variant: 'default' | 'favorite' = 'default'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const borders = getBorderColors();

    return {
      borderBottom: !isLast ? `1px solid ${borders.dividerLight}` : 'none',
      bgcolor: isSelected 
        ? (variant === 'favorite' ? colors.success.light : colors.primary.light)
        : 'transparent',
      '&:hover': {
        bgcolor: isSelected
          ? (variant === 'favorite' ? alpha(colors.success.main, 0.06) : alpha(colors.primary.main, 0.06))
          : (variant === 'favorite' ? alpha(colors.success.main, 0.04) : alpha(colors.primary.main, 0.04)),
      },
    };
  }, [getStatusColors, getBorderColors, alpha]);

  // Form field styles using design tokens
  const getFormFieldStyles = useCallback((
    variant: 'outlined' | 'filled' = 'outlined',
    state: 'default' | 'error' | 'success' = 'default'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const { borderRadius, animation } = theme.custom || { 
      borderRadius: { md: 12 }, 
      animation: { duration: { normal: '0.3s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };

    const stateColors = {
      default: theme.palette.primary,
      error: colors.error,
      success: colors.success,
    };

    const stateColor = stateColors[state];

    return {
      '& .MuiOutlinedInput-root': {
        borderRadius: `${borderRadius.md}px`,
        transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: stateColor.main,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 2,
          borderColor: stateColor.main,
        },
        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
          borderColor: colors.error.main,
        },
      },
      '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary,
        '&.Mui-focused': {
          color: stateColor.main,
        },
        '&.Mui-error': {
          color: colors.error.main,
        },
      },
      '& .MuiFormHelperText-root': {
        fontSize: '0.75rem',
        marginTop: `${theme.custom.spacing.xs}px`,
        '&.Mui-error': {
          color: colors.error.main,
        },
      },
    };
  }, [getStatusColors, theme]);

  // Navigation styles using design tokens
  const getNavigationStyles = useCallback((
    variant: 'tabs' | 'pills' | 'breadcrumb' = 'tabs'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const { borderRadius, spacing, animation } = theme.custom || { 
      borderRadius: { xs: 4, lg: 16, xl: 20 }, 
      spacing: { xs: 4, sm: 8 }, 
      animation: { duration: { normal: '0.3s', fast: '0.15s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };

    switch (variant) {
      case 'pills':
        return {
          '& .MuiTab-root': {
            borderRadius: `${borderRadius.xl}px`,
            margin: `0 ${spacing.xs}px`,
            minHeight: 40,
            transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
            '&:hover': {
              bgcolor: colors.primary.hover,
            },
            '&.Mui-selected': {
              bgcolor: colors.primary.light,
              color: colors.primary.main,
            },
          },
          '& .MuiTabs-indicator': {
            display: 'none',
          },
        };

      case 'breadcrumb':
        return {
          '& .MuiBreadcrumbs-separator': {
            color: theme.palette.text.secondary,
            margin: `0 ${spacing.sm}px`,
          },
          '& .MuiBreadcrumbs-li': {
            '& a, & span': {
              color: theme.palette.text.secondary,
              textDecoration: 'none',
              transition: `color ${animation.duration.fast} ${animation.easing.standard}`,
              '&:hover': {
                color: colors.primary.main,
              },
            },
            '&:last-child': {
              '& a, & span': {
                color: theme.palette.text.primary,
                fontWeight: 500,
              },
            },
          },
        };

      default: // tabs
        return {
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 500,
            transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
            '&:hover': {
              color: colors.primary.main,
              bgcolor: colors.primary.hover,
            },
            '&.Mui-selected': {
              color: colors.primary.main,
            },
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: `${borderRadius.xs}px`,
            bgcolor: colors.primary.main,
          },
        };
    }
  }, [getStatusColors, theme]);

  // Data display styles (tables, lists, grids)
  const getDataDisplayStyles = useCallback((
    variant: 'table' | 'list' | 'grid' = 'table',
    density: 'comfortable' | 'standard' | 'compact' = 'standard'
  ): SxProps<Theme> => {
    const borders = getBorderColors();
    const { spacing } = theme.custom || { spacing: { sm: 8, md: 16, lg: 24 } };

    const densityMap = {
      comfortable: spacing.lg,
      standard: spacing.md,
      compact: spacing.sm,
    };

    const padding = densityMap[density];

    switch (variant) {
      case 'list':
        return {
          '& .MuiListItem-root': {
            padding: `${padding}px`,
            borderBottom: `1px solid ${borders.dividerLight}`,
            '&:last-child': {
              borderBottom: 'none',
            },
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          },
        };

      case 'grid':
        return {
          display: 'grid',
          gap: `${padding}px`,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        };

      default: // table
        return {
          '& .MuiTableCell-root': {
            padding: `${padding}px`,
            borderBottom: `1px solid ${borders.dividerLight}`,
          },
          '& .MuiTableHead-root': {
            '& .MuiTableCell-root': {
              fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          },
          '& .MuiTableRow-root': {
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          },
        };
    }
  }, [getBorderColors, theme, alpha]);

  // Feedback styles (alerts, notifications, toasts)
  const getFeedbackStyles = useCallback((
    variant: 'alert' | 'toast' | 'banner' = 'alert',
    severity: 'success' | 'warning' | 'error' | 'info' = 'info'
  ): SxProps<Theme> => {
    const colors = getStatusColors();
    const { borderRadius, spacing, animation } = theme.custom || { 
      borderRadius: { md: 12 }, 
      spacing: { sm: 8, md: 16 }, 
      animation: { duration: { normal: '0.3s' }, easing: { standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)' } } 
    };

    const severityColors = {
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      info: colors.primary,
    };

    const severityColor = severityColors[severity];

    const baseStyles: SxProps<Theme> = {
      borderRadius: `${borderRadius.md}px`,
      padding: `${spacing.md}px`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: `${spacing.sm}px`,
      transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
    };

    switch (variant) {
      case 'toast':
        return {
          ...baseStyles,
          bgcolor: severityColor.main,
          color: theme.palette.common.white,
          boxShadow: theme.custom.elevation.medium,
          minWidth: 300,
          maxWidth: 500,
        };

      case 'banner':
        return {
          ...baseStyles,
          bgcolor: severityColor.light,
          color: severityColor.main,
          border: `1px solid ${severityColor.border}`,
          borderRadius: 0,
          padding: `${spacing.sm}px ${spacing.md}px`,
        };

      default: // alert
        return {
          ...baseStyles,
          bgcolor: severityColor.light,
          color: severityColor.main,
          border: `1px solid ${severityColor.border}`,
        };
    }
  }, [getStatusColors, theme]);

  return {
    getCardStyles,
    getButtonStyles,
    getChipStyles,
    getAvatarStyles,
    getStatusIndicatorStyles,
    getModalStyles,
    getHeaderStyles,
    getListItemStyles,
    getFormFieldStyles,
    getNavigationStyles,
    getDataDisplayStyles,
    getFeedbackStyles,
  };
};

/**
 * Simplified hook for common card styles
 */
export const useCardStyles = () => {
  const { getCardStyles } = useMuiUtils();
  return getCardStyles;
};

/**
 * Simplified hook for common button styles
 */
export const useButtonStyles = () => {
  const { getButtonStyles } = useMuiUtils();
  return getButtonStyles;
};

/**
 * Simplified hook for form field styles
 */
export const useFormFieldStyles = () => {
  const { getFormFieldStyles } = useMuiUtils();
  return getFormFieldStyles;
};

/**
 * Simplified hook for navigation styles
 */
export const useNavigationStyles = () => {
  const { getNavigationStyles } = useMuiUtils();
  return getNavigationStyles;
};

/**
 * Simplified hook for data display styles
 */
export const useDataDisplayStyles = () => {
  const { getDataDisplayStyles } = useMuiUtils();
  return getDataDisplayStyles;
};

/**
 * Simplified hook for feedback styles
 */
export const useFeedbackStyles = () => {
  const { getFeedbackStyles } = useMuiUtils();
  return getFeedbackStyles;
};