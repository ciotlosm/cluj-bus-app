// ThemeProvider - Material-UI theme integration component (< 20 lines)
// Connects ConfigStore theme preference with Material-UI

import type { FC, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useConfigStore } from '../../stores/configStore';

// Extend Material-UI Paper component to support custom variants (Card extends Paper)
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    vehicle: true;
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { theme: themeMode } = useConfigStore();
  
  const theme = createTheme({
    palette: {
      mode: themeMode === 'auto' ? 'light' : themeMode || 'light',
      primary: {
        main: '#1976d2',
      },
    },
    components: {
      // Custom component variants for different card types
      MuiPaper: {
        variants: [
          {
            props: { variant: 'vehicle' },
            style: ({ theme }) => ({
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' // Slightly more visible in dark mode
                : 'rgba(255, 255, 255, 0.8)',  // Lighter in light mode
            }),
          },
        ],
      },
    },
  });

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};