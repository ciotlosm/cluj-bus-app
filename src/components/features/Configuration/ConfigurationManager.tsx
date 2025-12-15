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
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Palette as PaletteIcon,
  LocationOn as LocationOnIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

import { useConfigurationManager } from '../../../hooks/useConfigurationManager';
import { Button } from '../../ui/Button';
import LocationPicker from '../LocationPicker/LocationPicker';
import ThemeToggle from '../../ui/ThemeToggle';
import { LocationSettingsSection } from './sections/LocationSettingsSection';
import { AdvancedSettingsSection } from './sections/AdvancedSettingsSection';
import { logger, LogLevel } from '../../../utils/logger';

interface ConfigurationManagerProps {
  onConfigComplete?: () => void;
}

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({
  onConfigComplete,
}) => {
  const theme = useTheme();
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
    
    // Actions
    handleApiKeyChange,
    handleCityChange,
    handleLogLevelChange,
    validateApiKey,
    handleLocationPicker,
    handleLocationSelected,
    handleSubmit,
    
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
        borderRadius: 3,
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
          staleDataThreshold={formData.staleDataThreshold || 2}
          onStaleDataThresholdChange={(threshold) => setFormData(prev => ({ ...prev, staleDataThreshold: threshold }))}
          logLevel={formData.logLevel ?? 1}
          onLogLevelChange={handleLogLevelChange}
          maxVehiclesPerStation={formData.maxVehiclesPerStation || 5}
          onMaxVehiclesPerStationChange={(max) => setFormData(prev => ({ ...prev, maxVehiclesPerStation: max }))}
          refreshRateError={errors.refreshRate}
          staleDataError={errors.staleDataThreshold}
          maxVehiclesError={errors.maxVehiclesPerStation}
        />

        {/* Theme Settings */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteIcon />
            Theme
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Dark Mode
            </Typography>
            <ThemeToggle size="medium" />
            <Typography variant="body2" color="text.secondary">
              Toggle between light and dark themes
            </Typography>
          </Box>
        </Box>

        {/* Location Settings */}
        <LocationSettingsSection
          homeLocation={formData.homeLocation}
          workLocation={formData.workLocation}
          defaultLocation={formData.defaultLocation}
          onLocationPicker={handleLocationPicker}
          formatLocationDisplay={formatLocationDisplay}
        />

        {/* Save Button */}
        <Box sx={{ pt: 2 }}>
          <Button
            variant="filled"
            size="large"
            fullWidth
            onClick={handleSubmit}
            loading={isSubmitting}
            sx={{ py: 1.5 }}
          >
            {isConfigured ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        </Box>

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