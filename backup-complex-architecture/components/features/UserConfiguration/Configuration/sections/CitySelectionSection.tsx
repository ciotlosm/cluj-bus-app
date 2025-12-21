import React from 'react';
import {
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  Autocomplete,
  TextField,
} from '@mui/material';
import { useThemeUtils } from '../../../../hooks';
import { LocationOn as LocationIcon } from '@mui/icons-material';

interface CityOption {
  label: string;
  value: string;
  agencyId: string;
}

interface CitySelectionSectionProps {
  city: string;
  onCityChange: (city: string, agencyId: string) => void;
  cityOptions: CityOption[];
  error?: string;
}

export const CitySelectionSection: React.FC<CitySelectionSectionProps> = ({
  city,
  onCityChange,
  cityOptions,
  error,
}) => {
  const { alpha } = useThemeUtils();

  return (
    <Card variant="outlined" sx={{ bgcolor: alpha('#9c27b0', 0.02) }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              City Selection
            </Typography>
          </Box>
          
          <Autocomplete
            options={cityOptions}
            value={cityOptions.find(option => option.value === city) || null}
            onChange={(_, newValue) => {
              onCityChange(newValue?.value || '', newValue?.agencyId || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select your city"
                error={!!error}
                helperText={error || 'Choose the city for bus tracking'}
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
          />
        </Stack>
      </CardContent>
    </Card>
  );
};