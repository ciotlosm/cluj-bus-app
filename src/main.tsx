// Clean main entry point - minimal setup
// Single file for app initialization

import { StrictMode, useState, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './components/layout/AppLayout';
import { Navigation } from './components/layout/Navigation';
import { StationView } from './components/features/views/StationView';
import { RouteView } from './components/features/views/RouteView';
import { SettingsView } from './components/features/views/SettingsView';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { useAutoLocation } from './hooks/useAutoLocation';
import { setupAppContext } from './context/contextInitializer';

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
  const [currentView, setCurrentView] = useState(0); // 0 = stations, 1 = routes, 2 = settings
  
  // Auto-request location on app start and foreground return
  useAutoLocation();

  const renderContent = () => {
    switch (currentView) {
      case 0:
        return <StationView />;
      case 1:
        return <RouteView />;
      case 2:
        return <SettingsView />;
      default:
        return <StationView />;
    }
  };

  return (
    <ThemeProvider>
      <AppLayout onNavigateToSettings={() => setCurrentView(2)}>
        {renderContent()}
        <Navigation 
          value={currentView} 
          onChange={setCurrentView} 
        />
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