import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'
import { getTheme } from './theme/materialTheme'
import { useConfigStore } from './stores/configStore'
import { logger } from './utils/shared/logger'

// Initialize logging
logger.info('Application starting', { 
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
  env: import.meta.env.MODE
});

// Theme wrapper component to use the theme store
const ThemedApp = () => {
  const { theme: mode } = useConfigStore();
  const theme = getTheme(mode === 'auto' ? 'dark' : mode);
  
  // Apply theme to document root for PWA consistency
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    // Also set meta theme-color for PWA status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'dark' ? '#1D1B20' : '#6750A4');
    }
  }, [mode]);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
)
