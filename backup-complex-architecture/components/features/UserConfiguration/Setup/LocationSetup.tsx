import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Stack,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import LocationPicker from '../LocationServices/LocationPicker/LocationPicker';
import { logger } from '../../../../utils/shared/logger';
import type { Coordinates } from '../../../types';

interface LocationSetupProps {
  onLocationsSet: (homeLocation: Coordinates, workLocation: Coordinates) => void;
  onBack?: () => void;
}

export const LocationSetup: React.FC<LocationSetupProps> = ({ onLocationsSet, onBack }) => {
  const [homeLocation, setHomeLocation] = useState<Coordinates | null>(null);
  const [workLocation, setWorkLocation] = useState<Coordinates | null>(null);
  const [currentStep, setCurrentStep] = useState<'home' | 'work'>('home');

  const handleLocationSelected = (location: Coordinates) => {
    if (currentStep === 'home') {
      setHomeLocation(location);
      setCurrentStep('work');
      logger.info('Home location set in setup wizard', { location }, 'UI');
    } else {
      setWorkLocation(location);
      logger.info('Work location set in setup wizard', { location }, 'UI');
      
      if (homeLocation) {
        onLocationsSet(homeLocation, location);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'work' && homeLocation) {
      setCurrentStep('home');
      setHomeLocation(null);
    } else if (onBack) {
      onBack();
    }
  };

  const theme = useTheme();

  return (
    <Container maxWidth="md">
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
            {currentStep === 'home' ? '🏠' : '🏢'}
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
            Set Your {currentStep === 'home' ? 'Home' : 'Work'} Location
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
          >
            {currentStep === 'home' 
              ? 'Choose your home location for personalized route suggestions'
              : 'Choose your work location to complete the setup'
            }
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <LocationPicker
            open={true}
            onClose={() => {}}
            title="Select Location"
            type="home"
            onLocationSelected={handleLocationSelected}
          />
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            size="large"
            onClick={handleBack}
            fullWidth
            sx={{
              borderRadius: theme.custom.borderRadius.md,
              fontWeight: 600,
            }}
          >
            Back
          </Button>
          {homeLocation && workLocation && (
            <Button
              variant="contained"
              size="large"
              onClick={() => onLocationsSet(homeLocation, workLocation)}
              fullWidth
              sx={{
                borderRadius: theme.custom.borderRadius.md,
                fontWeight: 600,
              }}
            >
              Complete Setup
            </Button>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default LocationSetup;