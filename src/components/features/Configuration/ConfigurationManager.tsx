import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Stack,
  InputAdornment,
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
} from '@mui/icons-material';

import { useConfigurationManager } from '../../../hooks/useConfigurationManager';
import { Button } from '../../ui/Button';
import LocationPicker from '../LocationPicker/LocationPicker';
import ThemeToggle from '../../ui/ThemeToggle';
import { LocationSettingsSection } from './sections/LocationSettingsSection';

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
        {/* Header with Status Chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
          
          {isConfigured && (
            <Chip
              icon={<CheckIcon />}
              label="Valid Config"
              color="success"
              variant="filled"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

      <Stack spacing={3}>
        {/* Common Settings - Inline Layout */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon sx={{ color: 'primary.main' }} />
            Common Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              label="Refresh Rate (seconds)"
              type="number"
              value={(formData.refreshRate || 30000) / 1000}
              onChange={(e) => {
                const seconds = parseInt(e.target.value) || 30;
                setFormData(prev => ({ ...prev, refreshRate: seconds * 1000 }));
              }}
              error={!!errors.refreshRate}
              helperText={errors.refreshRate || 'How often to refresh bus data (5-300 seconds)'}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimerIcon color="action" />
                    </InputAdornment>
                  ),
                  inputProps: { min: 5, max: 300 }
                }
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Stale Data Threshold (minutes)"
              type="number"
              value={formData.staleDataThreshold || 2}
              onChange={(e) => {
                const minutes = parseInt(e.target.value) || 2;
                setFormData(prev => ({ ...prev, staleDataThreshold: minutes }));
              }}
              error={!!errors.staleDataThreshold}
              helperText={errors.staleDataThreshold || 'When to consider vehicle data as outdated (1-30 minutes)'}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimerIcon color="action" />
                    </InputAdornment>
                  ),
                  inputProps: { min: 1, max: 30 }
                }
              }}
              sx={{ flex: 1 }}
            />
          </Box>
          
          {/* Default Location Setting */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                Offline Location
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleLocationPicker('offline')}
              >
                {formData.defaultLocation ? 'Change Offline' : 'Set Offline Location'}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Used when GPS and saved locations are unavailable
            </Typography>
            {formData.defaultLocation && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Current: {formatLocationDisplay(formData.defaultLocation)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Theme Settings */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteIcon />
            Theme
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
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