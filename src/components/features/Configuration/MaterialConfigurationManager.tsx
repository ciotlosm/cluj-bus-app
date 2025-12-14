import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Card,
  CardContent,
  CardActions,
  Stack,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

import { useConfigurationManager } from '../../../hooks/useConfigurationManager';
import { MaterialButton } from '../../ui/Button';
import { InfoCard } from '../../ui/Card';
import MaterialLocationPicker from '../LocationPicker/MaterialLocationPicker';
import { ApiKeySection } from './sections/ApiKeySection';
import { CitySelectionSection } from './sections/CitySelectionSection';
import { LocationSettingsSection } from './sections/LocationSettingsSection';
import { AdvancedSettingsSection } from './sections/AdvancedSettingsSection';
import { GoogleMapsApiKeySection } from './sections/GoogleMapsApiKeySection';

interface MaterialConfigurationManagerProps {
  onConfigComplete?: () => void;
}

export const MaterialConfigurationManager: React.FC<MaterialConfigurationManagerProps> = ({
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
    <InfoCard
      title="App Configuration"
      subtitle="Configure your API key, city, and locations"
      icon={<SettingsIcon />}
    >
      <Stack spacing={3}>
        {/* API Key Section */}
        <ApiKeySection
          apiKey={formData.apiKey || ''}
          onApiKeyChange={handleApiKeyChange}
          onValidateApiKey={validateApiKey}
          isValidating={isValidatingApiKey}
          isValid={apiKeyValid}
          error={errors.apiKey}
          showApiKey={showApiKey}
          onToggleShowApiKey={() => setShowApiKey(!showApiKey)}
        />

        {/* City Selection */}
        <CitySelectionSection
          city={formData.city || ''}
          onCityChange={(city) => setFormData(prev => ({ ...prev, city }))}
          cityOptions={cityOptions}
          error={errors.city}
        />

        {/* Google Maps API Key */}
        <GoogleMapsApiKeySection
          googleMapsApiKey={formData.googleMapsApiKey || ''}
          onGoogleMapsApiKeyChange={(key) => setFormData(prev => ({ ...prev, googleMapsApiKey: key }))}
          error={errors.googleMapsApiKey}
        />

        {/* Location Settings */}
        <LocationSettingsSection
          homeLocation={formData.homeLocation}
          workLocation={formData.workLocation}
          onLocationPicker={handleLocationPicker}
          formatLocationDisplay={formatLocationDisplay}
        />

        {/* Advanced Settings */}
        <AdvancedSettingsSection
          refreshRate={formData.refreshRate || 30000}
          onRefreshRateChange={(rate) => setFormData(prev => ({ ...prev, refreshRate: rate }))}
          staleDataThreshold={formData.staleDataThreshold || 2}
          onStaleDataThresholdChange={(threshold) => setFormData(prev => ({ ...prev, staleDataThreshold: threshold }))}
          refreshRateError={errors.refreshRate}
          staleDataError={errors.staleDataThreshold}
        />

        {/* Save Button */}
        <CardActions sx={{ px: 0, pt: 2 }}>
          <MaterialButton
            variant="filled"
            size="large"
            fullWidth
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isValidatingApiKey || apiKeyValid === false}
            sx={{ py: 1.5 }}
          >
            {isConfigured ? 'Update Configuration' : 'Save Configuration'}
          </MaterialButton>
        </CardActions>

        {/* Status Information */}
        {isConfigured && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              Configuration is complete. You can update individual settings above.
            </Typography>
          </Alert>
        )}

        {/* Location Picker Dialog */}
        <MaterialLocationPicker
          open={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          onLocationSelected={handleLocationSelected}
          title={locationPickerType === 'home' ? 'Set Home Location' : 'Set Work Location'}
          type={locationPickerType}
          currentLocation={locationPickerType === 'home' ? formData.homeLocation : formData.workLocation}
        />
      </Stack>
    </InfoCard>
  );
};

export default MaterialConfigurationManager;