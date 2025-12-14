import { createTheme } from '@mui/material/styles';

// Material Design 3 inspired theme
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
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 400,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 12, // Material Design 3 uses more rounded corners
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
        },
        body: {
          transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 24px',
          transition: 'all 0.3s ease-in-out',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          borderRadius: '24px 24px 0 0',
          boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: '0 0 16px 16px',
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
          transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
        },
        body: {
          transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
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

// Extend the theme interface to include custom colors
declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
    surface: {
      main: string;
      variant: string;
    };
    outline: {
      main: string;
      variant: string;
    };
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    surface?: {
      main: string;
      variant: string;
    };
    outline?: {
      main: string;
      variant: string;
    };
  }
}