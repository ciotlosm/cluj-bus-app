// Clean main entry point - minimal setup
// Single file for app initialization

import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './components/layout/AppLayout';
import { Navigation } from './components/layout/Navigation';
import { StationView } from './components/features/StationView';
import { VehicleView } from './components/features/VehicleView';
import { SettingsView } from './components/features/SettingsView';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { useLocationStore } from './stores/locationStore';

function App() {
  const [currentView, setCurrentView] = useState(0); // 0 = stations, 1 = vehicles, 2 = settings
  const { requestLocation } = useLocationStore();

  // Request location on app start and when returning from background
  useEffect(() => {
    // Request location immediately when app starts
    requestLocation();

    // Handle visibility changes - request location when coming back to foreground
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Browser came back to foreground - request location once
        requestLocation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestLocation]);

  const renderContent = () => {
    switch (currentView) {
      case 0:
        return <StationView />;
      case 1:
        return <VehicleView />;
      case 2:
        return <SettingsView />;
      default:
        return <StationView />;
    }
  };

  return (
    <ThemeProvider>
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