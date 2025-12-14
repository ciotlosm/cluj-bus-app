import React from 'react';
import {
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';

interface AdvancedSettingsSectionProps {
  refreshRate: number;
  onRefreshRateChange: (rate: number) => void;
  staleDataThreshold: number;
  onStaleDataThresholdChange: (threshold: number) => void;
  refreshRateError?: string;
  staleDataError?: string;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  refreshRate,
  onRefreshRateChange,
  staleDataThreshold,
  onStaleDataThresholdChange,
  refreshRateError,
  staleDataError,
}) => {
  const theme = useTheme();

  return (
    <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.02) }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Advanced Settings
            </Typography>
          </Box>
          
          <TextField
            label="Refresh Rate (seconds)"
            type="number"
            value={refreshRate / 1000}
            onChange={(e) => {
              const seconds = parseInt(e.target.value) || 30;
              onRefreshRateChange(seconds * 1000);
            }}
            error={!!refreshRateError}
            helperText={refreshRateError || 'How often to refresh bus data (5-300 seconds)'}
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
            sx={{ maxWidth: 300 }}
          />

          <TextField
            label="Stale Data Threshold (minutes)"
            type="number"
            value={staleDataThreshold}
            onChange={(e) => {
              const minutes = parseInt(e.target.value) || 4;
              onStaleDataThresholdChange(minutes);
            }}
            error={!!staleDataError}
            helperText={staleDataError || 'When to consider vehicle data as outdated (1-30 minutes)'}
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
            sx={{ maxWidth: 300 }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};