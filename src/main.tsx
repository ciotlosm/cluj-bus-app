// Clean main entry point - minimal setup
// Single file for app initialization

import { StrictMode, useState, Component, useEffect, startTransition } from 'react';
// Leaflet CSS for map components
import 'leaflet/dist/leaflet.css';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './components/layout/AppLayout';
import { Navigation } from './components/layout/Navigation';
import { StationView } from './components/features/views/StationView';
import { RouteView } from './components/features/views/RouteView';
import { SettingsView } from './components/features/views/SettingsView';
import { ApiKeySetupView } from './components/features/views/ApiKeySetupView';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { useAutoLocation } from './hooks/useAutoLocation';
import { setupAppContext } from './context/contextInitializer';
import { automaticRefreshService } from './services/automaticRefreshService';
import { useConfigStore } from './stores/configStore';

// Error boundary for context initialization failures
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ContextErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Context initialization error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'system-ui, sans-serif' 
        }}>
          <h2>Application Initialization Error</h2>
          <p>Failed to initialize the application context.</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Calculate initial view based on configuration state
  // -1 = API key setup, 0 = stations, 1 = routes, 2 = settings
  const [currentView, setCurrentView] = useState(() => {
    const { apiKey, agency_id } = useConfigStore.getState();
    
    // No API key → Setup view
    if (!apiKey) return -1;
    
    // Has API key but no agency → Settings
    if (!agency_id) return 2;
    
    // Fully configured → Stations
    return 0;
  });
  
  // Auto-request location on app start and foreground return
  useAutoLocation();

  // Initialize automatic refresh service on app start
  useEffect(() => {
    automaticRefreshService.initialize().catch(error => {
      console.warn('Failed to initialize automatic refresh service:', error);
    });

    // Cleanup on unmount
    return () => {
      automaticRefreshService.destroy();
    };
  }, []);
  
  // Listen for navigation events from error handlers
  useEffect(() => {
    const handleNavigateToSettings = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Navigation to settings triggered:', customEvent.detail);
      setCurrentView(2);
    };
    
    window.addEventListener('navigate-to-settings', handleNavigateToSettings);
    
    return () => {
      window.removeEventListener('navigate-to-settings', handleNavigateToSettings);
    };
  }, []);

  const getViewTitle = () => {
    switch (currentView) {
      case -1:
        return 'Setup';
      case 0:
        return 'Stations';
      case 1:
        return 'Routes';
      case 2:
        return 'Settings';
      default:
        return 'Stations';
    }
  };

  const renderContent = () => {
    const { apiKey, agency_id } = useConfigStore.getState();
    
    switch (currentView) {
      case -1:
        return (
          <ApiKeySetupView
            initialApiKey={apiKey || undefined}
            isUpdate={!!apiKey}
            onSuccess={() => {
              // After API key validation
              const { agency_id: currentAgencyId } = useConfigStore.getState();
              if (!currentAgencyId) {
                setCurrentView(2); // Go to settings for agency selection
              } else {
                setCurrentView(0); // Go to stations if agency already configured
              }
            }}
          />
        );
      case 0:
        return <StationView onNavigateToSettings={() => setCurrentView(2)} />;
      case 1:
        return <RouteView onNavigateToSettings={() => setCurrentView(2)} />;
      case 2:
        return <SettingsView onNavigateToApiKeySetup={() => setCurrentView(-1)} />;
      default:
        return <StationView />;
    }
  };

  return (
    <ThemeProvider>
      <AppLayout 
        title={getViewTitle()}
        onNavigateToSettings={() => setCurrentView(2)}
      >
        {renderContent()}
        {/* Hide navigation when in setup view */}
        {currentView !== -1 && (
          <Navigation 
            value={currentView} 
            onChange={(newView) => {
              // Use startTransition for non-blocking view switching
              startTransition(() => {
                setCurrentView(newView);
              });
            }} 
          />
        )}
      </AppLayout>
    </ThemeProvider>
  );
}

// Initialize app context before rendering
// This ensures configuration is available to all services
try {
  setupAppContext();
} catch (error) {
  console.error('Failed to setup app context:', error);
  // Error will be caught by error boundary
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContextErrorBoundary>
      <App />
    </ContextErrorBoundary>
  </StrictMode>,
);