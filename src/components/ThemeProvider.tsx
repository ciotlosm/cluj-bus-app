// ThemeProvider - Material-UI theme integration component (< 20 lines)
// Connects ConfigStore theme preference with Material-UI

import type { FC, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useConfigStore } from '../stores/configStore';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { theme: themeMode } = useConfigStore();
  
  const theme = createTheme({
    palette: {
      mode: themeMode === 'auto' ? 'light' : (themeMode || 'light'),
      primary: {
        main: '#1976d2',
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