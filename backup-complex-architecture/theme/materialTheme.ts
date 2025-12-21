import { createTheme } from '@mui/material/styles';
import { 
  spacing, 
  borderRadius, 
  elevation, 
  typography as typographyTokens, 
  componentVariants,
  animation,
  alpha as alphaTokens 
} from './tokens';

// Material Design 3 inspired theme with custom design tokens
export const materialTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4', // Material Design 3 primary
      light: '#8B7CC8',
      dark: '#4F378B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71', // Material Design 3 secondary
      light: '#7F7896',
      dark: '#4A4458',
      contrastText: '#FFFFFF',
    },
    tertiary: {
      main: '#7D5260',
      light: '#A07C87',
      dark: '#633B48',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#BA1A1A',
      light: '#DE3730',
      dark: '#93000A',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F57C00',
      light: '#FFB74D',
      dark: '#E65100',
      contrastText: '#000000',
    },
    info: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFBFE', // Material Design 3 surface
      paper: '#FFFBFE',
    },
    surface: {
      main: '#FFFBFE',
      variant: '#E7E0EC',
      container: '#FFFBFE',
      containerHigh: '#F7F2FA',
      containerHighest: '#F1ECF4',
    },
    outline: {
      main: '#79747E',
      variant: '#CAC4D0',
    },
    text: {
      primary: '#1C1B1F',
      secondary: '#49454F',
    },
  },
  // Custom design tokens
  custom: {
    spacing,
    borderRadius,
    elevation,
    alpha: alphaTokens,
    animation,
    componentVariants,
  },
  typography: {
    fontFamily: typographyTokens.fontFamily.primary,
    h1: {
      fontSize: typographyTokens.fontSize.xxxl,
      fontWeight: typographyTokens.fontWeight.regular,
      lineHeight: typographyTokens.lineHeight.tight,
    },
    h2: {
      fontSize: typographyTokens.fontSize.xxl,
      fontWeight: typographyTokens.fontWeight.regular,
      lineHeight: typographyTokens.lineHeight.tight,
    },
    h3: {
      fontSize: typographyTokens.fontSize.xl,
      fontWeight: typographyTokens.fontWeight.regular,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    h4: {
      fontSize: typographyTokens.fontSize.lg,
      fontWeight: typographyTokens.fontWeight.medium,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    h5: {
      fontSize: typographyTokens.fontSize.md,
      fontWeight: typographyTokens.fontWeight.medium,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    h6: {
      fontSize: typographyTokens.fontSize.sm,
      fontWeight: typographyTokens.fontWeight.medium,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    body1: {
      fontSize: typographyTokens.fontSize.md,
      fontWeight: typographyTokens.fontWeight.regular,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    body2: {
      fontSize: typographyTokens.fontSize.sm,
      fontWeight: typographyTokens.fontWeight.regular,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    button: {
      fontSize: typographyTokens.fontSize.sm,
      fontWeight: typographyTokens.fontWeight.medium,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: borderRadius.md, // Use design token
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          transition: `background-color ${animation.duration.normal} ${animation.easing.standard}, color ${animation.duration.normal} ${animation.easing.standard}`,
        },
        body: {
          transition: `background-color ${animation.duration.normal} ${animation.easing.standard}, color ${animation.duration.normal} ${animation.easing.standard}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: componentVariants.button.filled.borderRadius,
          textTransform: 'none',
          fontWeight: typographyTokens.fontWeight.medium,
          padding: `${spacing.sm}px ${spacing.lg}px`,
          transition: `all ${animation.duration.normal} ${animation.easing.standard}`,
        },
        contained: {
          boxShadow: componentVariants.button.filled.elevation,
          '&:hover': {
            boxShadow: elevation.medium,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: componentVariants.card.elevated.borderRadius,
          boxShadow: componentVariants.card.elevated.elevation,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: componentVariants.input.outlined.borderRadius,
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          borderRadius: `${borderRadius.xxl}px ${borderRadius.xxl}px 0 0`,
          boxShadow: elevation.medium,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: elevation.none,
          borderRadius: `0 0 ${borderRadius.lg}px ${borderRadius.lg}px`,
        },
      },
    },
  },
});

// Dark theme variant
export const darkMaterialTheme = createTheme({
  ...materialTheme,
  components: {
    ...materialTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          transition: `background-color ${animation.duration.normal} ${animation.easing.standard}, color ${animation.duration.normal} ${animation.easing.standard}`,
        },
        body: {
          transition: `background-color ${animation.duration.normal} ${animation.easing.standard}, color ${animation.duration.normal} ${animation.easing.standard}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: '0 0 16px 16px',
          // Override the bright gradient in dark mode with a more subdued background
          background: '#1D1B20', // Use the dark surface color instead of bright gradient
          borderBottom: '1px solid rgba(147, 143, 153, 0.12)', // Subtle border for definition
        },
      },
    },
  },
  palette: {
    ...materialTheme.palette,
    mode: 'dark',
    primary: {
      main: '#D0BCFF', // Material Design 3 primary dark
      light: '#EADDFF',
      dark: '#B69DF8',
      contrastText: '#21005D',
    },
    secondary: {
      main: '#CCC2DC',
      light: '#E8DEF8',
      dark: '#B0A7C0',
      contrastText: '#332D41',
    },
    tertiary: {
      main: '#EFB8C8',
      light: '#FFD8E4',
      dark: '#D29BAC',
      contrastText: '#492532',
    },
    error: {
      main: '#FFB4AB',
      light: '#FFDAD6',
      dark: '#FF897D',
      contrastText: '#690005',
    },
    warning: {
      main: '#FFB951',
      light: '#FFCC02',
      dark: '#E6A445',
      contrastText: '#2D1600',
    },
    info: {
      main: '#A8C7FA',
      light: '#D3E3FD',
      dark: '#7CACF8',
      contrastText: '#0B2F66',
    },
    success: {
      main: '#79DD72',
      light: '#A9F7A0',
      dark: '#4FB648',
      contrastText: '#0A2F0A',
    },
    background: {
      default: '#141218', // Material Design 3 surface dark
      paper: '#1D1B20',
    },
    surface: {
      main: '#1D1B20',
      variant: '#49454F',
      container: '#1D1B20',
      containerHigh: '#2B2930',
      containerHighest: '#36343B',
    },
    outline: {
      main: '#938F99',
      variant: '#49454F',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
    },
  },
});

// Function to get theme based on mode
export const getTheme = (mode: 'light' | 'dark') => {
  return mode === 'dark' ? darkMaterialTheme : materialTheme;
};

// Theme type extensions are defined in typeExtensions.ts