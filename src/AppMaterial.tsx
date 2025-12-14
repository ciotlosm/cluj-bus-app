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
  Fab,
  Badge,
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
  Refresh as RefreshIcon,
  Check as CheckIcon,
  LiveTv as LiveIcon,
} from '@mui/icons-material';

import ThemeToggle from './components/ui/ThemeToggle';

import { 
  ErrorBoundary, 
  ErrorDisplay
} from './components';
import MaterialRefreshControl from './components/layout/Indicators/MaterialRefreshControl';

import MaterialApiKeySetup from './components/features/Setup/MaterialApiKeySetup';
import MaterialOfflineIndicator from './components/layout/Indicators/MaterialOfflineIndicator';
import { useConfigStore, useOfflineStore, useAgencyStore } from './stores';
import { useRefreshSystem } from './hooks/useRefreshSystem';
import { useErrorHandler } from './hooks/useErrorHandler';

import { useComponentLifecycle, logPerformanceMetrics } from './utils/performance';
import { logger } from './utils/logger';
import { DebugPanel } from './components/features/Debug/DebugPanel';
import MaterialIntelligentBusDisplay from './components/features/BusDisplay/MaterialIntelligentBusDisplay';
import MaterialFavoriteBusDisplay from './components/features/FavoriteBuses/MaterialFavoriteBusDisplay';
import { useIntelligentBusStore } from './stores/intelligentBusStore';
import { useFavoriteBusStore } from './stores/favoriteBusStore';



// Import Settings component directly to avoid lazy loading issues
import Settings from './components/features/Settings/MaterialSettings';



// Material Design Header component
const MaterialHeader: React.FC<{ 
  title: string; 
  showRefresh?: boolean;
  isLoading?: boolean;
}> = React.memo(({ title, showRefresh = false, isLoading = false }) => {
  const theme = useTheme();
  
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
        
        {/* Theme Toggle */}
        <ThemeToggle color="inherit" />
        
        {showRefresh && (
          <Box sx={{ ml: 2 }}>
            <MaterialRefreshControl />
          </Box>
        )}
      </Toolbar>
      {isLoading && <LinearProgress sx={{ height: 3 }} />}
    </AppBar>
  );
});

// Material Design Bottom Navigation
const MaterialBottomNav: React.FC<{ 
  currentView: 'buses' | 'settings'; 
  onViewChange: (view: 'buses' | 'settings') => void;
  isConfigured: boolean;
}> = React.memo(({ currentView, onViewChange, isConfigured: isFullyConfigured }) => {
  const theme = useTheme();
  
  const handleNavigation = React.useCallback((view: 'buses' | 'settings') => {
    // Prevent duplicate navigation to the same view
    if (view === currentView) {
      logger.info('Navigation ignored - already on target view', { currentView, targetView: view }, 'UI');
      return;
    }
    
    logger.info('Navigation clicked', { from: currentView, to: view }, 'UI');
    
    // Use requestAnimationFrame to ensure the click event is fully processed
    requestAnimationFrame(() => {
      onViewChange(view);
    });
  }, [currentView, onViewChange]);

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
      <BottomNavigation
        value={currentView}
        onChange={(_, newValue) => {
          console.log('BottomNavigation onChange:', { newValue, currentView });
          if (newValue === 'buses' && !isFullyConfigured) return;
          handleNavigation(newValue);
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
          label="Buses"
          value="buses"
          icon={<BusIcon />}
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
  const [currentView, setCurrentView] = useState<'buses' | 'settings'>('buses');
  const [showSetupPrompt, setShowSetupPrompt] = useState(true);
  const { config, isConfigured, isFullyConfigured } = useConfigStore();
  const { isLoading, error } = useIntelligentBusStore();
  const { isAutoRefreshEnabled } = useRefreshSystem();
  const { error: globalError, clearError } = useErrorHandler();
  const { initialize: initializeOffline, cleanup: cleanupOffline } = useOfflineStore();
  const { checkAndFixCorruptedData } = useAgencyStore();
  const theme = useTheme();

  // Performance monitoring
  useComponentLifecycle('App');

  // Initialize offline capabilities and check for corrupted data
  useEffect(() => {
    logger.info('App initializing', { isConfigured, currentView });
    initializeOffline();
    
    // Check for corrupted agency data on startup
    const wasCorrupted = checkAndFixCorruptedData();
    if (wasCorrupted) {
      logger.info('Corrupted agency data was cleared on startup');
    }
    
    // Initialize intelligent bus store if fully configured
    if (isFullyConfigured) {
      const { startAutoRefresh } = useIntelligentBusStore.getState();
      const { startAutoRefresh: startFavoritesRefresh } = useFavoriteBusStore.getState();
      startAutoRefresh();
      startFavoritesRefresh();
    }
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const interval = setInterval(logPerformanceMetrics, 30000);
      return () => {
        clearInterval(interval);
        cleanupOffline();
      };
    }
    
    // Cleanup on unmount
    return () => {
      logger.info('App cleanup');
      const { stopAutoRefresh } = useIntelligentBusStore.getState();
      const { stopAutoRefresh: stopFavoritesRefresh } = useFavoriteBusStore.getState();
      stopAutoRefresh();
      stopFavoritesRefresh();
      cleanupOffline();
    };
  }, [isFullyConfigured]);

  // Auto-switch to buses view when full configuration is complete
  const hasAutoSwitched = React.useRef(false);
  useEffect(() => {
    if (isFullyConfigured && currentView === 'settings' && !hasAutoSwitched.current) {
      logger.info('Auto-switching to buses view after full configuration');
      hasAutoSwitched.current = true;
      setCurrentView('buses');
    }
  }, [isFullyConfigured, currentView]);

  // Show API key setup if not configured
  if (!isConfigured) {
    return (
      <ErrorBoundary>
        <MaterialApiKeySetup onApiKeyValidated={() => {
          logger.info('API key validated, user can now access the app');
        }} />
      </ErrorBoundary>
    );
  }

  // Show setup completion prompt with Material Design
  if (isConfigured && !isFullyConfigured && showSetupPrompt) {
    return (
      <ErrorBoundary>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 3,
          }}
        >
          <Card
            sx={{
              maxWidth: 400,
              textAlign: 'center',
              p: 4,
              boxShadow: theme.shadows[8],
            }}
          >
            <Avatar
              sx={{
                bgcolor: theme.palette.success.main,
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              API Key Validated
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Your Tranzy.ai API key is working. Complete your setup to start tracking buses.
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => {
                setShowSetupPrompt(false);
                setCurrentView('settings');
              }}
              sx={{
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Complete Setup
            </Button>
          </Card>
        </Box>
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    // Show global error if present
    if (globalError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          <ErrorDisplay error={globalError} onRetry={clearError} />
        </Alert>
      );
    }

    switch (currentView) {
      case 'buses':
        if (!isFullyConfigured) {
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
                Please complete your setup to start tracking buses.
              </Typography>
              <Button
                variant="contained"
                onClick={() => setCurrentView('settings')}
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
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <ErrorDisplay error={error} />
              </Alert>
            )}
            
            {/* Offline Indicator */}
            <Box sx={{ mb: 2 }}>
              <MaterialOfflineIndicator />
            </Box>
            
            {/* Favorite Buses */}
            <Box sx={{ mb: 3 }}>
              <MaterialFavoriteBusDisplay />
            </Box>
            
            {/* Intelligent Bus Display */}
            <Box>
              <MaterialIntelligentBusDisplay />
            </Box>
          </Box>
        );

      case 'settings':
        return (
          <Settings onClose={() => {
            console.log('Settings onClose called, navigating to buses');
            setCurrentView('buses');
          }} />
        );

      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'buses':
        return config?.city ? `Buses in ${config.city}` : 'Bus Tracker';
      case 'settings':
        return 'Settings';
      default:
        return 'Bus Tracker';
    }
  };

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <MaterialHeader 
          title={getHeaderTitle()}
          showRefresh={currentView === 'buses'}
          isLoading={isLoading}
        />
        
        <MaterialContentArea>
          {renderContent()}
        </MaterialContentArea>

        <MaterialBottomNav 
          currentView={currentView}
          onViewChange={(view) => {
            console.log('Navigation change requested:', { from: currentView, to: view });
            // Use functional update to ensure we have the latest state
            setCurrentView(prevView => {
              if (prevView === view) {
                console.log('Navigation ignored - already on target view:', view);
                return prevView;
              }
              console.log('Navigation executing:', { from: prevView, to: view });
              return view;
            });
          }}
          isConfigured={isFullyConfigured}
        />



        {/* Debug Panel (Development Only) */}
        <DebugPanel />
      </Box>
    </ErrorBoundary>
  );
}

export default AppMaterial;