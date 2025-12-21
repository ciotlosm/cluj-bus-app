// SettingsView - Core view component for settings (< 60 lines)
// Simple configuration form

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert 
} from '@mui/material';
import { useConfigStore } from '../stores/configStore';

export const SettingsView: React.FC = () => {
  const { apiKey, agency_id, setApiKey, setAgency, error } = useConfigStore();
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [localAgencyId, setLocalAgencyId] = useState(agency_id?.toString() || '');

  const handleSave = () => {
    if (localApiKey.trim()) {
      setApiKey(localApiKey.trim());
    }
    
    const agencyIdNum = parseInt(localAgencyId);
    if (!isNaN(agencyIdNum)) {
      setAgency(agencyIdNum);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="API Key"
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          fullWidth
        />
        
        <TextField
          label="Agency ID"
          type="number"
          value={localAgencyId}
          onChange={(e) => setLocalAgencyId(e.target.value)}
          fullWidth
        />
        
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={!localApiKey.trim()}
        >
          Save Configuration
        </Button>
      </Box>
    </Box>
  );
};