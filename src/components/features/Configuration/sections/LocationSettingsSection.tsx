import React from 'react';
import {
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as WorkIcon,
  LocationOn as LocationOnIcon,
  LocationDisabled as LocationDisabledIcon,
} from '@mui/icons-material';
import { Button } from '../../../ui/Button';
import { useLocationStore } from '../../../../stores/locationStore';
type Coordinates = { latitude: number; longitude: number; };

interface LocationSettingsSectionProps {
  homeLocation?: Coordinates;
  workLocation?: Coordinates;
  defaultLocation?: Coordinates;
  onLocationPicker: (type: 'home' | 'work' | 'offline') => void;
  formatLocationDisplay: (location: Coordinates | undefined) => string | null;
}

export const LocationSettingsSection: React.FC<LocationSettingsSectionProps> = ({
  homeLocation,
  workLocation,
  defaultLocation,
  onLocationPicker,
  formatLocationDisplay,
}) => {
  const theme = useTheme();
  const { locationPermission, currentLocation } = useLocationStore();



  // Determine if GPS is available (less prominent fallback when GPS works)
  const isGpsAvailable = locationPermission === 'granted' && currentLocation;

  return (
    <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.info.main, 0.02) }}>
      <CardContent>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnIcon sx={{ color: 'info.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Location Settings
            </Typography>
            {locationPermission === 'denied' && (
              <Chip
                icon={<LocationDisabledIcon sx={{ fontSize: 14 }} />}
                label="GPS Disabled"
                size="small"
                color="error"
                sx={{ ml: 'auto' }}
              />
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Configure locations for intelligent route suggestions (all optional)
          </Typography>
          
          {/* Location Grid - Dynamic layout based on GPS availability */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: isGpsAvailable 
              ? { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 0.8fr' } // Smaller fallback column when GPS available
              : { xs: '1fr', sm: '1fr 1fr 1fr' }, // Equal columns when GPS unavailable
            gap: 2 
          }}>
            {/* Home Location */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                <HomeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Home
                </Typography>
                {homeLocation && (
                  <Chip
                    label="Set"
                    size="small"
                    color="success"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
                {homeLocation && (
                  <Chip
                    label={formatLocationDisplay(homeLocation)}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.6rem', 
                      height: 18,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    }}
                  />
                )}
              </Stack>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => onLocationPicker('home')}
                disabled={locationPermission === 'denied'}
              >
                {homeLocation ? 'Change' : 'Set Home'}
              </Button>
            </Box>
            
            {/* Work Location */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Work
                </Typography>
                {workLocation && (
                  <Chip
                    label="Set"
                    size="small"
                    color="success"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
                {workLocation && (
                  <Chip
                    label={formatLocationDisplay(workLocation)}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.6rem', 
                      height: 18,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    }}
                  />
                )}
              </Stack>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => onLocationPicker('work')}
                disabled={locationPermission === 'denied'}
              >
                {workLocation ? 'Change' : 'Set Work'}
              </Button>
            </Box>

            {/* Offline Location - Less prominent when GPS available */}
            <Box sx={{ 
              opacity: isGpsAvailable ? 0.7 : 1,
              transform: isGpsAvailable ? 'scale(0.95)' : 'scale(1)',
              transition: 'all 0.2s ease-in-out'
            }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                <LocationOnIcon sx={{ 
                  fontSize: 16, 
                  color: isGpsAvailable ? 'text.disabled' : 'text.secondary' 
                }} />
                <Typography variant="body2" sx={{ 
                  fontWeight: 600,
                  color: isGpsAvailable ? 'text.disabled' : 'text.primary'
                }}>
                  Offline
                </Typography>
                {defaultLocation && (
                  <Chip
                    label="Set"
                    size="small"
                    color={isGpsAvailable ? "default" : "warning"}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
                {defaultLocation && (
                  <Chip
                    label={formatLocationDisplay(defaultLocation)}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.6rem', 
                      height: 18,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    }}
                  />
                )}
              </Stack>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => onLocationPicker('offline')}
                sx={{
                  color: isGpsAvailable ? 'text.disabled' : 'primary.main',
                  borderColor: isGpsAvailable ? 'divider' : 'primary.main',
                }}
              >
                {defaultLocation ? 'Change' : 'Set Offline'}
              </Button>
              {!isGpsAvailable && (
                <Typography variant="caption" color="warning.main" sx={{ 
                  fontSize: '0.65rem', 
                  display: 'block', 
                  mt: 0.5,
                  fontStyle: 'italic' 
                }}>
                  Used when GPS unavailable
                </Typography>
              )}
            </Box>
          </Box>

          {/* GPS Disabled Warning */}
          {locationPermission === 'denied' && (
            <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
              ⚠️ GPS disabled - "Use Current Location" features unavailable in location picker
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};