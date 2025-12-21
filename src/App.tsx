import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Container,
  Paper,
  LinearProgress,
  Alert,
  AlertTitle,
  Card,
  Button,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  Settings as SettingsIcon,
  Favorite as FavoriteIcon,
  LocationOn as StationIcon,
} from '@mui/icons-material';


import LocationPicker from './components/features/LocationPicker/LocationPicker';
import { useConfigurationManager } from './hooks/shared/useConfigurationManager';



import { 
  ErrorBoundary, 
  ErrorDisplay
} from './components';
import RefreshControl from './components/layout/Indicators/RefreshControl';

import { SetupWizard } from './components/features/Setup';
import OfflineIndicator from './components/layout/Indicators/OfflineIndicator';
import StatusIndicators from './components/layout/Indicators/StatusIndicators';
import { useConfigStore, useVehicleStore } from './stores';
import { useStoreEvents, StoreEvents } from './stores/shared/storeEvents';
import { useRefreshSystem } from './hooks/shared/useRefreshSystem';
import { useErrorHandler } from './hooks/shared/useErrorHandler';
import { useAppInitialization } from './hooks/shared/useAppInitialization';
import { useThemeUtils, useMuiUtils } from './hooks';

import { useComponentLifecycle, logPerformanceMetrics } from './utils/performance';
import { logger } from './utils/shared/logger';



import { StationDisplay } from './components/features/StationDisplay';
import UpdateNotification from './components/layout/UpdateNotification';

import { initializeServiceWorker } from './utils/shared/serviceWorkerManager';



// Import Settings component directly to avoid lazy isLoading issues
import { Settings } from './components/features/Settings';



// Material Design Header component
const MaterialHeader: React.FC<{ 
  title: string; 
  showRefresh?: boolean;
  isLoading?: boolean;
}> = React.memo(({ title, showRefresh = false, isLoading = false }) => {
  const { theme, alpha } = useThemeUtils();
  const { getHeaderStyles } = useMuiUtils();
  
  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        // Use theme-aware background - bright gradient for light mode, subdued for dark mode
        background: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper
          : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        boxShadow: theme.palette.mode === 'dark' ? 'none' : theme.shadows[4],
        borderBottom: theme.palette.mode === 'dark' 
          ? `1px solid ${alpha(theme.palette.outline.main, 0.12)}` 
          : 'none',
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        <Avatar
          sx={{
            bgcolor: alpha(theme.palette.common.white, 0.2),
            mr: 2,
            width: 48,
            height: 48,
          }}
        >
          <BusIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Real-time transit
          </Typography>
        </Box>
        
        {/* Status Indicators */}
        <Box sx={{ mr: 1 }}>
          <StatusIndicators compact />
        </Box>
        
        {/* Manual Refresh Button */}
        {showRefresh && (
          <Box sx={{ ml: 1 }}>
            <RefreshControl />
          </Box>
        )}
      </Toolbar>
      {isLoading && <LinearProgress sx={{ height: 1 }} />}
    </AppBar>
  );
});

// Material Design Bottom Navigation
const MaterialBottomNav: React.FC<{ 
  currentView: 'station' | 'settings'; 
  onViewChange: (view: 'station' | 'settings') => void;
  isConfigured: boolean;
  isFromSetupFlowRef: React.MutableRefObject<boolean>;
}> = React.memo(({ currentView, onViewChange, isConfigured: isFullyConfigured, isFromSetupFlowRef }) => {
  const { theme, alpha } = useThemeUtils();
  
  const handleNavigation = React.useCallback((view: 'station' | 'settings') => {
    logger.debug('Navigation attempt', { from: currentView, to: view, isFullyConfigured }, 'NAVIGATION');
    
    // Only prevent if isDisabled due to configuration
    if (view === 'station' && !isFullyConfigured) {
      logger.warn('Navigation blocked - not fully configured', { view, isFullyConfigured }, 'NAVIGATION');
      return;
    }
    
    logger.debug('Navigation proceeding', { from: currentView, to: view }, 'NAVIGATION');
    
    // Reset setup flow flag when user manually navigates
    if (view === 'settings') {
      isFromSetupFlowRef.current = false;
    }
    
    // Direct state update
    onViewChange(view);
  }, [currentView, onViewChange, isFullyConfigured]);

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderRadius: '24px 24px 0 0',
        boxShadow: theme.shadows[8],
      }}
      elevation={8}
    >
      <Box sx={{ position: 'relative' }}>
        <BottomNavigation
          value={currentView}
          onChange={(event, newValue) => {
            logger.debug('BottomNavigation onChange', { currentValue: currentView, newValue, event: event.type }, 'NAVIGATION');
            // Handle navigation through MUI's built-in onChange
            if (newValue) {
              handleNavigation(newValue as 'station' | 'settings');
            }
          }}
          sx={{
            borderRadius: '24px 24px 0 0',
            height: 80,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '8px 12px',
              // Ensure proper touch/click handling
              touchAction: 'manipulation',
              userSelect: 'none',
            },
          }}
        >
        <BottomNavigationAction
          label="Station"
          value="station"
          icon={<StationIcon />}
          disabled={!isFullyConfigured}
          sx={{
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            },
          }}
        />

        <BottomNavigationAction
          label="Settings"
          value="settings"
          icon={<SettingsIcon />}
          sx={{
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          }}
        />

        </BottomNavigation>
      </Box>
    </Paper>
  );
});

// Material Design Content Area
const MaterialContentArea: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => (
  <Box
    component="main"
    sx={{
      flexGrow: 1,
      pb: 12, // Space for bottom navigation
      pt: 2,
      minHeight: '100vh',
      bgcolor: 'background.default',
    }}
  >
    <Container maxWidth="md" sx={{ py: 2 }}>
      {children}
    </Container>
  </Box>
));

function AppMaterial() {
  const [currentView, setCurrentView] = useState<'station' | 'settings'>('station');
  const { isConfigured: initialConfigured, isFullyConfigured: initialFullyConfigured } = useConfigStore();
  
  // Use local state to track configuration changes via events
  const [configState, setConfigState] = React.useState({
    isConfigured: initialConfigured,
    isFullyConfigured: initialFullyConfigured
  });
  
  const { 
    locationPickerOpen, 
    locationPickerType, 
    setLocationPickerOpen, 
    handleLocationSelected
  } = useConfigurationManager();

  const { startAutoRefresh } = useRefreshSystem();
  const { error: globalError, clearError } = useErrorHandler();
  const vehicleStore = useVehicleStore();
  const configStore = useConfigStore();
  
  // Subscribe to configuration change events
  useStoreEvents([
    {
      event: StoreEvents.CONFIG_CHANGED,
      handler: React.useCallback((data: any) => {
        // Update local state when configuration changes
        const config = data.config;
        const isConfigured = !!(config?.apiKey && config?.refreshRate);
        const isFullyConfigured = !!(
          config?.city &&
          config?.agencyId &&
          config?.apiKey &&
          config?.refreshRate &&
          config?.homeLocation &&
          config?.workLocation
        );
        
        setConfigState({
          isConfigured,
          isFullyConfigured
        });
      }, [])
    }
  ], []);
  const { 
    isInitializing, 
    initializationProgress, 
    initializationStep, 
    initializationError,
    retryInitialization 
  } = useAppInitialization();
  const { theme, alpha } = useThemeUtils();
  const { getHeaderStyles } = useMuiUtils();

  // Track if navigation is coming from setup flow
  const isFromSetupFlow = React.useRef(false);

  // Performance monitoring
  useComponentLifecycle('App');

  // Initialize offline capabilities and check for corrupted data
  useEffect(() => {
    logger.info('App initializing', { isConfigured: configState.isConfigured, currentView });
    
    // Initialize service worker for PWA functionality and updates
    initializeServiceWorker().catch((error) => {
      logger.error('Failed to initialize service worker:', error);
    });
    
    // The new unified stores handle initialization automatically
    // No need for manual offline initialization or corruption checks
    
    // Initialize modern refresh system and favorite bus store if fully configured
    if (configState.isFullyConfigured) {
      startAutoRefresh(); // Start modern refresh system
      vehicleStore.startAutoRefresh(); // Start vehicle auto-refresh
    }
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const interval = setInterval(logPerformanceMetrics, 30000);
      return () => {
        clearInterval(interval);
        // Cleanup is handled automatically by the new unified stores
      };
    }
    
    // Cleanup on unmount
    return () => {
      logger.info('App cleanup');
      // Auto-refresh cleanup is handled automatically by the new unified stores
      vehicleStore.stopAutoRefresh();
    };
  }, [configState.isFullyConfigured]);

  // Auto-switch to station view when full configuration is complete (only from setup flow)
  const hasAutoSwitched = React.useRef(false);
  
  useEffect(() => {
    // Only auto-switch if we're coming from the setup flow, not from user navigation
    if (configState.isFullyConfigured && currentView === 'settings' && !hasAutoSwitched.current && isFromSetupFlow.current) {
      logger.info('Auto-switching to station view after full configuration');
      hasAutoSwitched.current = true;
      setCurrentView('station');
    }
  }, [configState.isFullyConfigured, currentView]);

  // Show setup wizard if not configured (includes API key + city selection)
  if (!configState.isConfigured) {
    return (
      <ErrorBoundary>
        <SetupWizard onComplete={() => {
          logger.info('Setup wizard completed, user can now access the app');
          // Configuration is automatically saved by the wizard
          // The component should automatically re-render when config store updates
        }} />
      </ErrorBoundary>
    );
  }



  const renderContent = () => {
    // Show initialization error if present
    if (initializationError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Initialization Error</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {initializationError}
          </Typography>
          <Button 
            variant="contained" 
            size="small" 
            onClick={retryInitialization}
            sx={{ textTransform: 'none' }}
          >
            Retry Initialization
          </Button>
        </Alert>
      );
    }

    // Show global error if present
    if (globalError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          <ErrorDisplay error={globalError} onRetry={clearError} />
        </Alert>
      );
    }

    // Show initialization progress if initializing
    if (isInitializing) {
      return (
        <Card sx={{ textAlign: 'center', p: 4, mt: 4 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 3,
            }}
          >
            <BusIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Loading Transit Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {initializationStep}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={initializationProgress} 
            sx={{ width: '100%', height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {Math.round(initializationProgress)}% complete
          </Typography>
        </Card>
      );
    }

    switch (currentView) {
      case 'station':
        if (!configState.isFullyConfigured) {
          return (
            <Card sx={{ textAlign: 'center', p: 4, mt: 4 }}>
              <Avatar
                sx={{
                  bgcolor: theme.palette.warning.main,
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <SettingsIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Setup Required
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Please complete your setup to view nearby station buses.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  isFromSetupFlow.current = true; // Mark that we're coming from setup
                  setCurrentView('settings');
                }}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Complete Setup
              </Button>
            </Card>
          );
        }

        return (
          <Box sx={{ space: 3 }}>
            {/* Offline Indicator */}
            <Box sx={{ mb: 2 }}>
              <OfflineIndicator />
            </Box>
            
            {/* Station Display */}
            <Box sx={{ mb: 3 }}>
              <StationDisplay />
            </Box>
          </Box>
        );



      case 'settings':
        return (
          <Settings onClose={() => {
            setCurrentView('station');
          }} />
        );

      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'station':
        return 'Nearby';
      case 'settings':
        return 'Settings';
      default:
        return 'Nearby';
    }
  };

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <MaterialHeader 
          title={getHeaderTitle()}
          showRefresh={currentView === 'station'}
          isLoading={isInitializing}
        />
        
        {/* Initialization Progress */}
        {isInitializing && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {initializationStep}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={initializationProgress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
        
        <MaterialContentArea>
          {renderContent()}
        </MaterialContentArea>

        <MaterialBottomNav 
          currentView={currentView}
          onViewChange={setCurrentView}
          isConfigured={configState.isFullyConfigured}
          isFromSetupFlowRef={isFromSetupFlow}
        />

        {/* Update Notification for PWA */}
        <UpdateNotification />



        {/* Location Picker Dialog */}
        <LocationPicker
          open={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          onLocationSelected={handleLocationSelected}
          title={
            locationPickerType === 'home' 
              ? 'Set Home Location' 
              : locationPickerType === 'work' 
                ? 'Set Work Location'
                : 'Set Offline Location'
          }
          type={locationPickerType}
        />
      </Box>
    </ErrorBoundary>
  );
}

export default AppMaterial;