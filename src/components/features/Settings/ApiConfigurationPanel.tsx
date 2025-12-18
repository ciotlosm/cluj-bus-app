import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import { Key as KeyIcon } from '@mui/icons-material';
import { InfoCard } from '../../ui/Card';
import { ApiKeySection } from '../Configuration/sections/ApiKeySection';
import { useConfigurationManager } from '../../../hooks/shared/useConfigurationManager';

export const ApiConfigurationPanel: React.FC = () => {
  const {
    formData,
    setFormData,
    errors,
    isValidatingApiKey,
    apiKeyValid,
    showApiKey,
    setShowApiKey,
    handleApiKeyChange,
    validateApiKey,
    handleSubmit,
    isSubmitting,
  } = useConfigurationManager();

  return (
    <InfoCard
      title="API Configuration"
      subtitle="Manage your API keys and external service integrations"
      icon={<KeyIcon />}
    >
      <Stack spacing={3}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Changes to API keys require app restart to take full effect. 
            Your city selection is configured during initial setup and stored locally.
          </Typography>
        </Alert>

        {/* Tranzy API Key Section */}
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



        {/* Save Button */}
        <Box sx={{ pt: 2 }}>
          <button
            onClick={handleSubmit}
            disabled={isValidatingApiKey || apiKeyValid === false || isSubmitting}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save API Configuration'}
          </button>
        </Box>
      </Stack>
    </InfoCard>
  );
};

export default ApiConfigurationPanel;