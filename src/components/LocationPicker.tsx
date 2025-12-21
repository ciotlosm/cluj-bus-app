// LocationPicker - Basic location selection component (< 70 lines)
// Simple location input without fancy UI

import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert 
} from '@mui/material';

interface LocationPickerProps {
  label: string;
  value: { lat: number; lon: number } | null;
  onChange: (location: { lat: number; lon: number }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
  label, 
  value, 
  onChange 
}) => {
  const [lat, setLat] = useState(value?.lat?.toString() || '');
  const [lon, setLon] = useState(value?.lon?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    if (isNaN(latNum) || isNaN(lonNum)) {
      setError('Please enter valid coordinates');
      return;
    }
    
    if (latNum < -90 || latNum > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }
    
    if (lonNum < -180 || lonNum > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }
    
    setError(null);
    onChange({ lat: latNum, lon: lonNum });
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLon = position.coords.longitude;
          setLat(newLat.toString());
          setLon(newLon.toString());
          onChange({ lat: newLat, lon: newLon });
        },
        () => setError('Unable to get current location')
      );
    } else {
      setError('Geolocation is not supported');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {label}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          type="number"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Longitude"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          type="number"
          inputProps={{ step: 'any' }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleSave}>
          Save Location
        </Button>
        <Button variant="outlined" onClick={handleCurrentLocation}>
          Use Current Location
        </Button>
      </Box>
    </Box>
  );
};