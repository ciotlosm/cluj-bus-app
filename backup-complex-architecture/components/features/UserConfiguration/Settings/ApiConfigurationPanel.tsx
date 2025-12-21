import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { Key as KeyIcon } from '@mui/icons-material';
import { InfoCard } from '../../../ui';
import { ApiKeySection } from '../../Configuration/sections/ApiKeySection';
import { useConfigurationManager } from '../../../../hooks/shared/useConfigurationManager';

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
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={isValidatingApiKey || apiKeyValid === false || isSubmitting}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save API Configuration'}
          </Button>
        </Box>
      </Stack>
    </InfoCard>
  );
};

export default ApiConfigurationPanel;