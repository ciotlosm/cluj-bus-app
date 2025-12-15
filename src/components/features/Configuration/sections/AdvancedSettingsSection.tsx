import React from 'react';
import {
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
} from '@mui/material';
import { Timer as TimerIcon, BugReport as BugReportIcon, DirectionsBus as BusIcon, Settings as SettingsIcon } from '@mui/icons-material';

interface AdvancedSettingsSectionProps {
  refreshRate: number;
  onRefreshRateChange: (rate: number) => void;
  staleDataThreshold: number;
  onStaleDataThresholdChange: (threshold: number) => void;
  logLevel: number;
  onLogLevelChange: (level: number) => void;
  maxVehiclesPerStation: number;
  onMaxVehiclesPerStationChange: (max: number) => void;
  refreshRateError?: string;
  staleDataError?: string;
  maxVehiclesError?: string;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  refreshRate,
  onRefreshRateChange,
  staleDataThreshold,
  onStaleDataThresholdChange,
  logLevel,
  onLogLevelChange,
  maxVehiclesPerStation,
  onMaxVehiclesPerStationChange,
  refreshRateError,
  staleDataError,
  maxVehiclesError,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon sx={{ color: 'primary.main' }} />
        Display Settings
      </Typography>
      
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
          gap: 2,
          p: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          borderRadius: 2,
          border: 1,
          borderColor: 'divider'
        }}
      >
        <TextField
          label="Refresh Rate (seconds)"
          type="number"
          size="small"
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
        />

        <TextField
          label="Stale Data Threshold (minutes)"
          type="number"
          size="small"
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
        />

        <TextField
          label="Max Vehicles Per Station"
          type="number"
          size="small"
          value={maxVehiclesPerStation}
          onChange={(e) => {
            const max = parseInt(e.target.value) || 5;
            onMaxVehiclesPerStationChange(max);
          }}
          error={!!maxVehiclesError}
          helperText={maxVehiclesError || 'Maximum number of vehicles to show per station (1-20)'}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <BusIcon color="action" />
                </InputAdornment>
              ),
              inputProps: { min: 1, max: 20 }
            }
          }}
        />

        <FormControl size="small">
          <InputLabel id="log-level-label">Console Log Level</InputLabel>
          <Select
            labelId="log-level-label"
            value={logLevel}
            label="Console Log Level"
            onChange={(e) => onLogLevelChange(Number(e.target.value))}
            startAdornment={
              <InputAdornment position="start">
                <BugReportIcon color="action" />
              </InputAdornment>
            }
          >
            <MenuItem value={0}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  DEBUG
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Show all logs (very verbose)
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value={1}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  INFO
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Show info, warnings, and errors
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value={2}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  WARN
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Show only warnings and errors
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value={3}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ERROR
                </Typography>
                <Typography variant="caption" color="text.secondary">
                Show only errors
                </Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};