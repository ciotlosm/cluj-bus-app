import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import './index.css'
import App from './AppMaterial.tsx'
import { getTheme } from './theme/materialTheme'
import { useThemeStore } from './stores/themeStore'
import { logger } from './utils/loggerFixed'

// Initialize logging
logger.info('Application starting', { 
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
  env: import.meta.env.MODE
});

// Theme wrapper component to use the theme store
const ThemedApp = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  
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
