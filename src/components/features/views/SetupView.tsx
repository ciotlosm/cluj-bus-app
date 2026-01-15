// SetupView - Unified two-phase setup flow for API key validation and agency selection
// Phase 1: API key entry and validation
// Phase 2: Agency selection (enabled after Phase 1 completes)
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1-2.6, 3.1-3.6, 5.2-5.4

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
  MenuItem,
  Divider
} from '@mui/material';
import { useConfigStore } from '../../../stores/configStore';
import { useAgencyStore } from '../../../stores/agencyStore';

interface SetupViewProps {
  initialApiKey?: string;      // Pre-fill for reconfiguration
  initialAgencyId?: number;    // Pre-select agency for reconfiguration
  onComplete: () => void;      // Callback after successful setup
}

export const SetupView: FC<SetupViewProps> = ({ 
  initialApiKey, 
  initialAgencyId,
  onComplete 
}) => {
  const { validateApiKey, error: configError, clearError: clearConfigError } = useConfigStore();
  const { agencies } = useAgencyStore();
  
  // Mask initial API key if provided (show last 4 chars)
  const getMaskedKey = (key: string): string => {
    if (key.length <= 4) return '****';
    return '*'.repeat(key.length - 4) + key.slice(-4);
  };
  
  // Phase 1 state
  const [apiKey, setApiKey] = useState(
    initialApiKey ? getMaskedKey(initialApiKey) : ''
  );
  const [isKeyModified, setIsKeyModified] = useState(false);
  const [originalMaskedKey] = useState(
    initialApiKey ? getMaskedKey(initialApiKey) : ''
  );
  const [keyValidated, setKeyValidated] = useState(false);
  const [phase1Loading, setPhase1Loading] = useState(false);
  const [phase1Error, setPhase1Error] = useState<string | null>(null);
  
  // Phase 2 state
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | ''>(
    initialAgencyId || ''
  );
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [phase2Error, setPhase2Error] = useState<string | null>(null);
  
  // Load cached agencies on mount if available
  useEffect(() => {
    if (agencies.length > 0 && !keyValidated) {
      setKeyValidated(true);
    }
  }, [agencies, keyValidated]);
  
  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearConfigError();
    };
  }, [clearConfigError]);
  
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setIsKeyModified(value !== originalMaskedKey);
    // Clear Phase 1 error when user types
    if (phase1Error) {
      setPhase1Error(null);
    }
    if (configError) {
      clearConfigError();
    }
  };
  
  const handleValidateKey = async () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      return;
    }
    
    setPhase1Loading(true);
    setPhase1Error(null);
    
    try {
      // If key hasn't been modified and we have an original key, use it
      const keyToValidate = (!isKeyModified && initialApiKey) ? initialApiKey : trimmedKey;
      
      await validateApiKey(keyToValidate);
      
      // On success, enable Phase 2
      setKeyValidated(true);
      setPhase1Loading(false);
    } catch (err) {
      // Get the latest error from the store
      const currentError = useConfigStore.getState().error;
      setPhase1Error(currentError || 'Failed to validate API key');
      setPhase1Loading(false);
    }
  };
  
  const handleApiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKey.trim() && !phase1Loading) {
      handleValidateKey();
    }
  };
  
  const handleAgencyChange = (value: number | '') => {
    setSelectedAgencyId(value);
    // Clear Phase 2 error when user selects agency
    if (phase2Error) {
      setPhase2Error(null);
    }
  };
  
  const handleContinue = async () => {
    if (selectedAgencyId === '') {
      return;
    }
    
    setPhase2Loading(true);
    setPhase2Error(null);
    
    try {
      const { validateAndSave } = useConfigStore.getState();
      const keyToUse = (!isKeyModified && initialApiKey) ? initialApiKey : apiKey.trim();
      
      await validateAndSave(keyToUse, selectedAgencyId as number);
      
      // On success, call completion callback
      setPhase2Loading(false);
      onComplete();
    } catch (err) {
      // Get the latest error from the store
      const currentError = useConfigStore.getState().error;
      setPhase2Error(currentError || 'Failed to validate agency');
      setPhase2Loading(false);
    }
  };
  
  // Enable Validate button when input is non-empty
  const isValidateEnabled = apiKey.trim().length > 0 && !phase1Loading;
  
  // Enable Continue button when agency is selected
  const isContinueEnabled = selectedAgencyId !== '' && !phase2Loading;
  
  // Phase 2 is disabled until Phase 1 completes
  const isPhase2Disabled = !keyValidated;
  
  return (
    <Box sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    }}>
      <Card sx={{ maxWidth: 500, width: '100%', minHeight: 400 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {initialApiKey ? 'Reconfigure Setup' : 'Welcome to Neary'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {initialApiKey 
              ? 'Update your API key and agency configuration.'
              : 'Enter your Tranzy API key and select your transit agency to get started.'
            }
          </Typography>
          
          {/* Phase 1: API Key Validation */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Phase 1: API Key
            </Typography>
            
            {phase1Error && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                onClose={() => setPhase1Error(null)}
              >
                {phase1Error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                onKeyDown={handleApiKeyPress}
                fullWidth
                disabled={phase1Loading}
                autoFocus
                placeholder="Enter your Tranzy API key"
                helperText="Your API key will be validated with the Tranzy API"
              />
              
              <Button 
                variant="contained" 
                onClick={handleValidateKey}
                disabled={!isValidateEnabled}
                fullWidth
                size="large"
                startIcon={phase1Loading ? <CircularProgress size={16} /> : undefined}
              >
                {phase1Loading ? 'Validating...' : 'Validate'}
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Phase 2: Agency Selection */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Phase 2: Agency Selection
            </Typography>
            
            {phase2Error && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                onClose={() => setPhase2Error(null)}
              >
                {phase2Error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Transit Agency"
                value={selectedAgencyId}
                onChange={(e) => handleAgencyChange(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                disabled={isPhase2Disabled || phase2Loading}
                helperText={isPhase2Disabled ? 'Complete Phase 1 to enable agency selection' : 'Select your transit agency'}
              >
                <MenuItem value="">
                  <em>Select an agency</em>
                </MenuItem>
                {agencies.map((agency) => (
                  <MenuItem key={agency.agency_id} value={agency.agency_id}>
                    {agency.agency_name}
                  </MenuItem>
                ))}
              </TextField>
              
              <Button 
                variant="contained" 
                onClick={handleContinue}
                disabled={!isContinueEnabled || isPhase2Disabled}
                fullWidth
                size="large"
                startIcon={phase2Loading ? <CircularProgress size={16} /> : undefined}
              >
                {phase2Loading ? 'Saving...' : 'Continue'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
