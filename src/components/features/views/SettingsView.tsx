// SettingsView - Core view component for settings (< 60 lines)
// Simple configuration form

import { useState } from 'react';
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
  Divider
} from '@mui/material';
import { useConfigStore } from '../../../stores/configStore';
import { ThemeToggle } from '../../theme/ThemeToggle';

export const SettingsView: FC = () => {
  const { 
    apiKey, 
    agency_id, 
    theme, 
    setApiKey, 
    setAgency, 
    validateAndSave,
    error, 
    success,
    loading, 
    clearError,
    clearSuccess
  } = useConfigStore();
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [localAgencyId, setLocalAgencyId] = useState(agency_id?.toString() || '');

  const handleSave = async () => {
    const trimmedApiKey = localApiKey.trim();
    const agencyIdNum = parseInt(localAgencyId);
    
    if (trimmedApiKey && !isNaN(agencyIdNum) && agencyIdNum > 0) {
      await validateAndSave(trimmedApiKey, agencyIdNum);
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
      
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="API Key"
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          fullWidth
          disabled={loading}
          error={!localApiKey.trim()}
          helperText={!localApiKey.trim() ? 'API key is required' : ''}
        />
        
        <TextField
          label="Agency ID"
          type="number"
          value={localAgencyId}
          onChange={(e) => setLocalAgencyId(e.target.value)}
          fullWidth
          disabled={loading}
          error={isNaN(parseInt(localAgencyId)) || parseInt(localAgencyId) <= 0}
          helperText={
            isNaN(parseInt(localAgencyId)) || parseInt(localAgencyId) <= 0 
              ? 'Valid agency ID is required' 
              : ''
          }
        />
        
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={
            loading || 
            !localApiKey.trim() || 
            isNaN(parseInt(localAgencyId)) || 
            parseInt(localAgencyId) <= 0
          }
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Validating...' : 'Validate & Save Configuration'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined">
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
    </Box>
  );
};