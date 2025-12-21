// Clean main entry point - minimal setup
// Single file for app initialization

import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { 
  AppLayout, 
  Navigation, 
  StationView, 
  SettingsView 
} from './components';

// Simple theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  const [currentView, setCurrentView] = useState(0); // 0 = stations, 1 = vehicles, 2 = settings

  const renderContent = () => {
    switch (currentView) {
      case 0:
        return <StationView />;
      case 1:
        return <StationView />; // For now, same as stations
      case 2:
        return <SettingsView />;
      default:
        return <StationView />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppLayout>
        {renderContent()}
        <Navigation 
          value={currentView} 
          onChange={setCurrentView} 
        />
      </AppLayout>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);