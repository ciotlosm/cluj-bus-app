// Clean main entry point - minimal setup
// Single file for app initialization

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './components/AppLayout';
import { Navigation } from './components/Navigation';
import { StationView } from './components/StationView';
import { VehicleView } from './components/VehicleView';
import { SettingsView } from './components/SettingsView';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  const [currentView, setCurrentView] = useState(0); // 0 = stations, 1 = vehicles, 2 = settings

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