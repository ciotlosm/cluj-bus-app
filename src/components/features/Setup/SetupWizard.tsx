import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Autocomplete,
  Link,
} from '@mui/material';
import {
  Key as KeyIcon,
  LocationOn as LocationIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
} from '@mui/icons-material';
import { Button } from '../../ui';
import { useConfigStore } from '../../../stores/configStore';
// Agency functionality is now in configStore
import { useFormHandler, useThemeUtils } from '../../../hooks';

interface CityOption {
  label: string;
  value: string;
  agencyId: string;
}

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { getBackgroundColors, alpha } = useThemeUtils();
  const { updateConfig } = useConfigStore();
  const { agencies, validateApiKey: validateAndFetchAgencies } = useConfigStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  // Use form handler for the setup form
  const form = useFormHandler(
    { apiKey: '', city: '' },
    {
      apiKey: { required: true, minLength: 10 },
      city: { required: true },
    },
    async (values) => {
      if (!selectedCity) {
        throw new Error('Please select a city');
      }

      // Cluj-Napoca center coordinates as default for required fields
      const clujCenter = { latitude: 46.7712, longitude: 23.6236 };
      
      await updateConfig({
        apiKey: values.apiKey.trim(),
        city: selectedCity.value,
        agencyId: selectedCity.agencyId,
        refreshRate: 30000, // Default 30 seconds
        staleDataThreshold: 2, // Default 2 minutes
        defaultLocation: clujCenter, // Cluj-Napoca center
        // Required fields - use Cluj center as default (user can change later in settings)
        homeLocation: clujCenter,
        workLocation: clujCenter,
      });
      
      return values;
    }
  );

  const steps = ['API Key', 'City Selection'];

  const cityOptions: CityOption[] = agencies
    .map(agency => ({ 
      label: agency.name, 
      value: agency.name, 
      agencyId: agency.id 
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key.trim()) {
      setApiKeyValid(null);
      return false;
    }

    setIsValidatingApiKey(true);
    form.clearSubmitError();
    
    try {
      await validateAndFetchAgencies(key.trim());
      setApiKeyValid(true);
      
      return true;
    } catch (error) {
      setApiKeyValid(false);
      throw error;
    } finally {
      setIsValidatingApiKey(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate API key before proceeding
      try {
        await validateApiKey(form.values.apiKey);
      } catch (error) {
        return; // Error already handled in validateApiKey
      }
    }
    
    if (activeStep === steps.length - 1) {
      // Final step - save configuration
      await handleComplete();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    const result = await form.handleSubmit(undefined, {
      errorMessage: 'Failed to save configuration',
      logCategory: 'SETUP_WIZARD',
      onSuccess: () => {
        onComplete();
      },
    });
    return result;
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return form.values.apiKey.trim() && apiKeyValid === true;
      case 1:
        return selectedCity !== null;
      default:
        return false;
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, textAlign: 'center' }}>
          Welcome to Cluj Bus App
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          Let's get you set up with real-time bus tracking
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {form.submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {form.submitError}
          </Alert>
        )}

        {/* Step 0: API Key */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <KeyIcon color="primary" />
              Enter Your Tranzy API Key
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Get your free API key from{' '}
              <Link href="https://tranzy.ai" target="_blank" rel="noopener noreferrer" color="primary">
                tranzy.ai
              </Link>{' '}
              to access live bus tracking data.
            </Typography>

            <TextField
              fullWidth
              label="Tranzy.ai API Key"
              type={showApiKey ? 'text' : 'password'}
              {...form.getFieldProps('apiKey')}
              onChange={(e) => {
                form.setValue('apiKey', e.target.value);
                setApiKeyValid(null);
              }}
              placeholder="Enter your API key here..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isValidatingApiKey && <CircularProgress size={16} />}
                      {apiKeyValid === true && <CheckIcon color="success" />}
                      {apiKeyValid === false && <CloseIcon color="error" />}
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                        size="small"
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </Box>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {form.values.apiKey.trim() && apiKeyValid === null && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => validateApiKey(form.values.apiKey)}
                isLoading={isValidatingApiKey}
                sx={{ mb: 2 }}
              >
                Test API Key
              </Button>
            )}

            {apiKeyValid === true && (
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ API key is valid! You can now proceed to city selection.
              </Alert>
            )}
          </Box>
        )}

        {/* Step 1: City Selection */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon color="secondary" />
              Select Your City
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose your city to get accurate bus schedules and routes.
            </Typography>

            <Autocomplete
              options={cityOptions}
              value={selectedCity}
              onChange={(_, newValue) => {
                setSelectedCity(newValue);
                form.setValue('city', newValue?.value || '');
                form.clearSubmitError();
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select your city"
                  placeholder="Start typing to search..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                    <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    {option.label}
                  </Box>
                );
              }}
              sx={{ mb: 2 }}
            />

            {selectedCity && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Selected:</strong> {selectedCity.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This will be saved and used for all bus tracking in this city.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            isDisabled={activeStep === 0}
            startIcon={<BackIcon />}
          >
            Back
          </Button>

          <Button
            variant="filled"
            onClick={handleNext}
            isDisabled={!canProceed() || isValidatingApiKey}
            isLoading={form.isSubmitting}
            startIcon={activeStep === steps.length - 1 ? <CheckIcon /> : <ForwardIcon />}
          >
            {activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SetupWizard;