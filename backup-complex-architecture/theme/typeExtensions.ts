/**
 * Material-UI theme type extensions
 * Provides comprehensive type safety for custom theme properties
 * Validates Requirements: 8.2 (Material-UI type extension)
 */

import type { Theme, ThemeOptions } from '@mui/material/styles';
import type { PaletteOptions, Palette } from '@mui/material/styles';
import type { ComponentsOverrides, ComponentsProps, ComponentsVariants } from '@mui/material/styles';
import type { 
  spacing, 
  borderRadius, 
  elevation, 
  typography as typographyTokens, 
  componentVariants,
  animation,
  alpha as alphaTokens 
} from './tokens';

// ============================================================================
// CUSTOM PALETTE EXTENSIONS
// ============================================================================

/**
 * Extended palette interface with custom colors
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/styles' {
  interface Palette {
    /** Tertiary color palette */
    tertiary: Palette['primary'];
    /** Surface color variants */
    surface: {
      main: string;
      variant: string;
      container: string;
      containerHigh: string;
      containerHighest: string;
    };
    /** Outline color variants */
    outline: {
      main: string;
      variant: string;
    };
    /** Custom semantic colors */
    semantic: {
      live: string;
      offline: string;
      stale: string;
      delayed: string;
      onTime: string;
    };
    /** Data visualization colors */
    chart: {
      primary: string;
      secondary: string;
      tertiary: string;
      quaternary: string;
      success: string;
      warning: string;
      error: string;
    };
  }

  interface PaletteOptions {
    /** Tertiary color palette options */
    tertiary?: PaletteOptions['primary'];
    /** Surface color variants options */
    surface?: {
      main?: string;
      variant?: string;
      container?: string;
      containerHigh?: string;
      containerHighest?: string;
    };
    /** Outline color variants options */
    outline?: {
      main?: string;
      variant?: string;
    };
    /** Custom semantic colors options */
    semantic?: {
      live?: string;
      offline?: string;
      stale?: string;
      delayed?: string;
      onTime?: string;
    };
    /** Data visualization colors options */
    chart?: {
      primary?: string;
      secondary?: string;
      tertiary?: string;
      quaternary?: string;
      success?: string;
      warning?: string;
      error?: string;
    };
  }
}

// ============================================================================
// CUSTOM THEME EXTENSIONS
// ============================================================================

/**
 * Extended theme interface with custom design tokens
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/styles' {
  interface Theme {
    /** Custom design tokens */
    custom: {
      /** Spacing scale */
      spacing: typeof spacing;
      /** Border radius scale */
      borderRadius: typeof borderRadius;
      /** Elevation/shadow scale */
      elevation: typeof elevation;
      /** Alpha transparency levels */
      alpha: typeof alphaTokens;
      /** Animation/transition tokens */
      animation: typeof animation;
      /** Component variant configurations */
      componentVariants: typeof componentVariants;
      /** Typography tokens */
      typography: typeof typographyTokens;
      /** Breakpoint utilities */
      breakpoints: {
        /** Check if current breakpoint is mobile */
        isMobile: boolean;
        /** Check if current breakpoint is tablet */
        isTablet: boolean;
        /** Check if current breakpoint is desktop */
        isDesktop: boolean;
        /** Get responsive value based on current breakpoint */
        getResponsiveValue: <T>(values: {
          xs?: T;
          sm?: T;
          md?: T;
          lg?: T;
          xl?: T;
        }) => T | undefined;
      };
      /** Color utilities */
      colors: {
        /** Get status color by name */
        getStatusColor: (status: 'success' | 'warning' | 'error' | 'info') => {
          main: string;
          light: string;
          dark: string;
          contrastText: string;
        };
        /** Get semantic color by name */
        getSemanticColor: (semantic: 'live' | 'offline' | 'stale' | 'delayed' | 'onTime') => string;
        /** Get chart color by index */
        getChartColor: (index: number) => string;
        /** Generate color with alpha */
        withAlpha: (color: string, alpha: number) => string;
      };
      /** Layout utilities */
      layout: {
        /** Container max widths */
        container: {
          xs: string;
          sm: string;
          md: string;
          lg: string;
          xl: string;
        };
        /** Header heights */
        header: {
          mobile: number;
          desktop: number;
        };
        /** Footer heights */
        footer: {
          mobile: number;
          desktop: number;
        };
        /** Sidebar widths */
        sidebar: {
          collapsed: number;
          expanded: number;
        };
      };
    };
  }

  interface ThemeOptions {
    /** Custom design tokens options */
    custom?: {
      /** Spacing scale options */
      spacing?: Partial<typeof spacing>;
      /** Border radius scale options */
      borderRadius?: Partial<typeof borderRadius>;
      /** Elevation/shadow scale options */
      elevation?: Partial<typeof elevation>;
      /** Alpha transparency levels options */
      alpha?: Partial<typeof alphaTokens>;
      /** Animation/transition tokens options */
      animation?: Partial<typeof animation>;
      /** Component variant configurations options */
      componentVariants?: Partial<typeof componentVariants>;
      /** Typography tokens options */
      typography?: Partial<typeof typographyTokens>;
      /** Breakpoint utilities options */
      breakpoints?: Partial<Theme['custom']['breakpoints']>;
      /** Color utilities options */
      colors?: Partial<Theme['custom']['colors']>;
      /** Layout utilities options */
      layout?: Partial<Theme['custom']['layout']>;
    };
  }
}

// ============================================================================
// COMPONENT OVERRIDES TYPE EXTENSIONS
// ============================================================================

/**
 * Extended component overrides with custom variants
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/styles' {
  interface ComponentNameToClassKey {
    /** Custom Button variants */
    MuiButtonCustom: 'tonal' | 'filled' | 'outlined' | 'text';
    /** Custom Card variants */
    MuiCardCustom: 'elevated' | 'outlined' | 'filled' | 'glass';
    /** Custom Input variants */
    MuiInputCustom: 'outlined' | 'filled' | 'underlined';
    /** Custom Loading variants */
    MuiLoadingCustom: 'spinner' | 'skeleton' | 'progress' | 'dots' | 'pulse';
  }

  interface ComponentsPropsList {
    /** Custom Button props */
    MuiButtonCustom: {
      variant?: 'tonal' | 'filled' | 'outlined' | 'text';
      size?: 'small' | 'medium' | 'large';
      color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
      isLoading?: boolean;
      loadingText?: string;
    };
    /** Custom Card props */
    MuiCardCustom: {
      variant?: 'elevated' | 'outlined' | 'filled' | 'glass';
      padding?: 'none' | 'small' | 'medium' | 'large';
      isInteractive?: boolean;
      elevation?: 'none' | 'low' | 'medium' | 'high';
    };
    /** Custom Input props */
    MuiInputCustom: {
      variant?: 'outlined' | 'filled' | 'underlined';
      size?: 'small' | 'medium' | 'large';
      isClearable?: boolean;
      hasError?: boolean;
    };
    /** Custom Loading props */
    MuiLoadingCustom: {
      variant?: 'spinner' | 'skeleton' | 'progress' | 'dots' | 'pulse';
      size?: 'small' | 'medium' | 'large';
      color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    };
  }
}

// ============================================================================
// TYPOGRAPHY EXTENSIONS
// ============================================================================

/**
 * Extended typography variants
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/styles' {
  interface TypographyVariants {
    /** Display typography variants */
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
    displaySmall: React.CSSProperties;
    /** Headline typography variants */
    headlineLarge: React.CSSProperties;
    headlineMedium: React.CSSProperties;
    headlineSmall: React.CSSProperties;
    /** Title typography variants */
    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;
    /** Label typography variants */
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
    /** Body typography variants */
    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    /** Display typography variants options */
    displayLarge?: React.CSSProperties;
    displayMedium?: React.CSSProperties;
    displaySmall?: React.CSSProperties;
    /** Headline typography variants options */
    headlineLarge?: React.CSSProperties;
    headlineMedium?: React.CSSProperties;
    headlineSmall?: React.CSSProperties;
    /** Title typography variants options */
    titleLarge?: React.CSSProperties;
    titleMedium?: React.CSSProperties;
    titleSmall?: React.CSSProperties;
    /** Label typography variants options */
    labelLarge?: React.CSSProperties;
    labelMedium?: React.CSSProperties;
    labelSmall?: React.CSSProperties;
    /** Body typography variants options */
    bodyLarge?: React.CSSProperties;
    bodyMedium?: React.CSSProperties;
    bodySmall?: React.CSSProperties;
  }
}

// Update the Typography component props to include new variants
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    /** Display variants */
    displayLarge: true;
    displayMedium: true;
    displaySmall: true;
    /** Headline variants */
    headlineLarge: true;
    headlineMedium: true;
    headlineSmall: true;
    /** Title variants */
    titleLarge: true;
    titleMedium: true;
    titleSmall: true;
    /** Label variants */
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
    /** Body variants */
    bodyLarge: true;
    bodyMedium: true;
    bodySmall: true;
  }
}

// ============================================================================
// BUTTON COMPONENT EXTENSIONS
// ============================================================================

/**
 * Extended Button component props
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    /** Custom button variants */
    tonal: true;
    filled: true;
  }

  interface ButtonPropsColorOverrides {
    /** Custom button colors */
    tertiary: true;
  }

  interface ButtonPropsSizeOverrides {
    /** Custom button sizes */
    extraSmall: true;
    extraLarge: true;
  }
}

// ============================================================================
// CARD COMPONENT EXTENSIONS
// ============================================================================

/**
 * Extended Card component props
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/Card' {
  interface CardPropsVariantOverrides {
    /** Custom card variants */
    glass: true;
    interactive: true;
  }
}

// ============================================================================
// TEXTFIELD COMPONENT EXTENSIONS
// ============================================================================

/**
 * Extended TextField component props
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/TextField' {
  interface TextFieldPropsVariantOverrides {
    /** Custom input variants */
    underlined: true;
  }

  interface TextFieldPropsColorOverrides {
    /** Custom input colors */
    tertiary: true;
  }
}

// ============================================================================
// CHIP COMPONENT EXTENSIONS
// ============================================================================

/**
 * Extended Chip component props
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    /** Custom chip variants */
    tonal: true;
    soft: true;
  }

  interface ChipPropsColorOverrides {
    /** Custom chip colors */
    tertiary: true;
  }
}

// ============================================================================
// ALERT COMPONENT EXTENSIONS
// ============================================================================

/**
 * Extended Alert component props
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
declare module '@mui/material/Alert' {
  interface AlertPropsVariantOverrides {
    /** Custom alert variants */
    toast: true;
    banner: true;
  }

  interface AlertPropsColorOverrides {
    /** Custom alert colors */
    tertiary: true;
  }
}

// ============================================================================
// UTILITY TYPES FOR THEME EXTENSIONS
// ============================================================================

/**
 * Type-safe theme accessor
 */
export type ThemeAccessor<T> = (theme: Theme) => T;

/**
 * Responsive theme value
 */
export type ResponsiveThemeValue<T> = T | {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
};

/**
 * Theme-aware component props
 */
export interface ThemeAwareComponentProps {
  /** Theme mode override */
  themeMode?: 'light' | 'dark';
  /** Custom theme overrides */
  themeOverrides?: Partial<ThemeOptions>;
}

/**
 * Custom theme hook return type
 */
export interface CustomThemeHookReturn {
  /** Current theme */
  theme: Theme;
  /** Theme mode */
  mode: 'light' | 'dark';
  /** Toggle theme mode */
  toggleMode: () => void;
  /** Set specific theme mode */
  setMode: (mode: 'light' | 'dark') => void;
  /** Check if dark mode */
  isDark: boolean;
  /** Check if light mode */
  isLight: boolean;
  /** Custom theme utilities */
  utils: Theme['custom'];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type {
  Theme,
  ThemeOptions,
  Palette,
  PaletteOptions,
  ComponentsOverrides,
  ComponentsProps,
  ComponentsVariants,
};