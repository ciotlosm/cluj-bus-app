import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useConfigStore } from '../../../stores/configStore';
import { logger } from '../../../utils/shared/logger';

interface CitySelectionProps {
  onCitySelected: (city: string, agencyId: string) => void;
  onBack?: () => void;
}

export const CitySelection: React.FC<CitySelectionProps> = ({ onCitySelected, onBack }) => {
  const [selectedAgency, setSelectedAgency] = useState<{city: string, agencyId: string} | null>(null);
  const { agencies } = useConfigStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAgency) {
      return;
    }

    logger.info('City selected in setup wizard', { 
      city: selectedAgency.city, 
      agencyId: selectedAgency.agencyId 
    }, 'UI');
    onCitySelected(selectedAgency.city, selectedAgency.agencyId);
  };

  // Get agencies as city options
  const cityOptions = agencies.map(agency => ({
    city: agency.name,
    agencyId: agency.id,
  })).sort((a, b) => a.city.localeCompare(b.city));

  const theme = useTheme();

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={4}
        sx={{
          p: 4,
          borderRadius: theme.custom.borderRadius.xl,
          background: theme.palette.background.paper,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              mx: 'auto',
              mb: 2,
              fontSize: '2rem',
            }}
          >
            🏙️
          </Avatar>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 1,
            }}
          >
            Select Your City
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
          >
            Choose the city where you'll be using the bus tracker
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="city-select-label">City</InputLabel>
            <Select
              labelId="city-select-label"
              id="city"
              value={selectedAgency ? `${selectedAgency.city}|${selectedAgency.agencyId}` : ''}
              label="City"
              onChange={(e) => {
                if (e.target.value) {
                  const [city, agencyId] = e.target.value.split('|');
                  setSelectedAgency({ city, agencyId });
                } else {
                  setSelectedAgency(null);
                }
              }}
              sx={{
                borderRadius: theme.custom.borderRadius.md,
              }}
            >
              <MenuItem value="">
                <em>Select a city...</em>
              </MenuItem>
              {cityOptions.map((option) => (
                <MenuItem key={option.agencyId} value={`${option.city}|${option.agencyId}`}>
                  {option.city}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2}>
            {onBack && (
              <Button
                variant="outlined"
                size="large"
                onClick={onBack}
                fullWidth
                sx={{
                  borderRadius: theme.custom.borderRadius.md,
                  fontWeight: 600,
                }}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!selectedAgency}
              fullWidth
              sx={{
                borderRadius: theme.custom.borderRadius.md,
                fontWeight: 600,
              }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default CitySelection;