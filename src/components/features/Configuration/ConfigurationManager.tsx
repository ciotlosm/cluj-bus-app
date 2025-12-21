import React, { useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Stack,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { useThemeUtils } from '../../../hooks';
import {
  Settings as SettingsIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  LocationOn as LocationOnIcon,
  BugReport as BugReportIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';

import { useConfigurationManager } from '../../../hooks/shared/useConfigurationManager';
import { Button } from '../../ui';
import LocationPicker from '../LocationPicker/LocationPicker';
import { LocationSettingsSection } from './sections/LocationSettingsSection';
import { AdvancedSettingsSection } from './sections/AdvancedSettingsSection';
import { ThemeToggle } from '../../ui';
import { useConfigStore } from '../../../stores/configStore';
import { logger, LogLevel } from '../../../utils/shared/logger';

interface ConfigurationManagerProps {
  onConfigComplete?: () => void;
}

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({
  onConfigComplete,
}) => {
  const { theme, alpha } = useThemeUtils();
  const {
    // Form state
    formData,
    setFormData,
    errors,
    
    // API key validation
    isValidatingApiKey,
    apiKeyValid,
    showApiKey,
    setShowApiKey,
    
    // Location picker
    locationPickerOpen,
    locationPickerType,
    setLocationPickerOpen,
    
    // Submission
    isSubmitting,
    isSaving,
    
    // Actions
    handleApiKeyChange,
    handleCityChange,
    handleLogLevelChange,
    validateApiKey,
    handleLocationPicker,
    handleLocationSelected,
    handleSubmit,
    handleAutoSave,
    
    // Utilities
    formatLocationDisplay,
    
    // Data
    cityOptions,
    isConfigured,
  } = useConfigurationManager(onConfigComplete);



  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2, // Reduced from 3 to 2 for more reasonable corner radius
        boxShadow: theme.shadows[1],
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              mr: 2,
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon />
          </Box>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              App Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure your API key, city, and locations
            </Typography>
          </Box>
        </Box>

      <Stack spacing={2}>
        {/* Display Settings */}
        <AdvancedSettingsSection
          refreshRate={formData.refreshRate || 30000}
          onRefreshRateChange={(rate) => setFormData(prev => ({ ...prev, refreshRate: rate }))}
          onRefreshRateBlur={(rate) => handleAutoSave('refreshRate', rate)}
          staleDataThreshold={formData.staleDataThreshold || 2}
          onStaleDataThresholdChange={(threshold) => setFormData(prev => ({ ...prev, staleDataThreshold: threshold }))}
          onStaleDataThresholdBlur={(threshold) => handleAutoSave('staleDataThreshold', threshold)}
          logLevel={formData.logLevel ?? 1}
          onLogLevelChange={handleLogLevelChange}
          maxVehiclesPerStation={formData.maxVehiclesPerStation || 5}
          onMaxVehiclesPerStationChange={(max) => setFormData(prev => ({ ...prev, maxVehiclesPerStation: max }))}
          onMaxVehiclesPerStationBlur={(max) => handleAutoSave('maxVehiclesPerStation', max)}
          refreshRateError={errors.refreshRate}
          staleDataError={errors.staleDataThreshold}
          maxVehiclesError={errors.maxVehiclesPerStation}
        />

        {/* Theme Settings */}
        <Card
          sx={{
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.outline.main, 0.12)}`,
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                  mr: 2,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PaletteIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Theme
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Choose your preferred appearance
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {useConfigStore.getState().theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Typography>
              <ThemeToggle size="small" />
            </Box>
          </CardContent>
        </Card>

        {/* Location Settings */}
        <LocationSettingsSection
          homeLocation={formData.homeLocation}
          workLocation={formData.workLocation}
          defaultLocation={formData.defaultLocation}
          onLocationPicker={handleLocationPicker}
          formatLocationDisplay={formatLocationDisplay}
        />

        {/* Auto-save Status */}
        {isConfigured && (
          <Box sx={{ pt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {isSaving ? (
              <>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: 2,
                    borderColor: 'primary.main',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                  Saving changes...
                </Typography>
              </>
            ) : (
              <>
              </>
            )}
          </Box>
        )}

        {/* Initial Setup Button (only for new configurations) */}
        {!isConfigured && (
          <Box sx={{ pt: 2 }}>
            <Button
              variant="filled"
              size="large"
              isFullWidth
              onClick={handleSubmit}
              isLoading={isSubmitting}
              sx={{ py: 1.5 }}
            >
              Save Configuration
            </Button>
          </Box>
        )}

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
          currentLocation={
            locationPickerType === 'home' 
              ? formData.homeLocation 
              : locationPickerType === 'work' 
                ? formData.workLocation
                : formData.defaultLocation
          }
        />
      </Stack>
      </CardContent>
    </Card>
  );
};

export default ConfigurationManager;