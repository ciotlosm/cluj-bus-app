// SettingsView - Core view component for settings
// Enhanced with API key management and agency selection

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { useConfigStore } from '../../../stores/configStore';
import { useAgencyStore } from '../../../stores/agencyStore';

interface SettingsViewProps {
  onNavigateToApiKeySetup?: () => void;
}

export const SettingsView: FC<SettingsViewProps> = ({ onNavigateToApiKeySetup }) => {
  const { 
    apiKey, 
    agency_id, 
    theme, 
    validateAndSave,
    error, 
    success,
    loading, 
    clearError,
    clearSuccess
  } = useConfigStore();
  
  const {
    agencies,
    loading: agenciesLoading,
    error: agenciesError,
    loadAgencies,
    clearError: clearAgenciesError
  } = useAgencyStore();
  
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | ''>(agency_id || '');
  const [agencyValidationError, setAgencyValidationError] = useState<string | null>(null);

  // Clear success message on mount (from API key validation)
  useEffect(() => {
    clearSuccess();
  }, [clearSuccess]);

  // Load agencies on mount if not cached
  useEffect(() => {
    if (apiKey && agencies.length === 0 && !agenciesLoading && !agenciesError) {
      loadAgencies();
    }
  }, [apiKey, agencies.length, agenciesLoading, agenciesError, loadAgencies]);

  const handleAgencyChange = async (agencyId: number) => {
    setSelectedAgencyId(agencyId);
    setAgencyValidationError(null);
    
    // Clear any existing errors when user takes action
    clearError();
    
    if (!apiKey) {
      setAgencyValidationError('API key is required');
      return;
    }
    
    try {
      await validateAndSave(apiKey, agencyId);
    } catch (error) {
      // Error is already set in configStore, but we also show inline
      setAgencyValidationError(
        error instanceof Error ? error.message : 'Failed to validate agency'
      );
    }
  };
  
  const handleManageApiKey = () => {
    // Clear error when user clicks to manage API key
    clearError();
    clearSuccess();
    if (onNavigateToApiKeySetup) {
      onNavigateToApiKeySetup();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={clearError}
            >
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={clearSuccess}
            >
              Dismiss
            </Button>
          }
        >
          {success}
        </Alert>
      )}
      
      {agenciesError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={clearAgenciesError}
            >
              Dismiss
            </Button>
          }
        >
          {agenciesError}
        </Alert>
      )}
      
      {/* Agency Selection Section - First and highlighted if not selected */}
      {apiKey && (
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 2,
            ...((!agency_id) && {
              borderColor: 'primary.main',
              borderWidth: 2,
              bgcolor: 'action.hover'
            })
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Agency Selection
            </Typography>
            {!agency_id && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please select your transit agency to continue
              </Alert>
            )}
            <FormControl 
              fullWidth 
              error={!!agencyValidationError}
              disabled={loading || agenciesLoading}
            >
              <InputLabel id="agency-select-label">Agency</InputLabel>
              <Select
                labelId="agency-select-label"
                id="agency-select"
                value={selectedAgencyId}
                label="Agency"
                onChange={(e) => handleAgencyChange(e.target.value as number)}
              >
                {agenciesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading agencies...
                  </MenuItem>
                ) : agencies.length === 0 ? (
                  <MenuItem disabled>No agencies available</MenuItem>
                ) : (
                  agencies.map((agency) => (
                    <MenuItem key={agency.agency_id} value={agency.agency_id}>
                      {agency.agency_name}
                    </MenuItem>
                  ))
                )}
              </Select>
              {agencyValidationError && (
                <FormHelperText>{agencyValidationError}</FormHelperText>
              )}
              {loading && (
                <FormHelperText>
                  <CircularProgress size={12} sx={{ mr: 0.5 }} />
                  Validating agency...
                </FormHelperText>
              )}
            </FormControl>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Theme
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {theme === 'dark' ? 'Dark Mode' : theme === 'light' ? 'Light Mode' : 'System Default'}
              </Typography>
            </Box>
            <ThemeToggle size="large" />
          </Box>
        </CardContent>
      </Card>

      {/* API Key Management Section - Last */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API Key
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {apiKey ? 'API key is configured' : 'No API key configured'}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleManageApiKey}
            fullWidth
          >
            Manage API Key
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};