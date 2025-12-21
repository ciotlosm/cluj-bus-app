import React from 'react';
import {
  Box,
  Chip,
} from '@mui/material';
import { LocationOn as LocationOnIcon } from '@mui/icons-material';
import { useThemeUtils } from '../../../hooks';

interface StationHeaderProps {
  stationName: string;
  distance: number;
  isClosest?: boolean;
  onClick?: () => void;
}

export const StationHeader: React.FC<StationHeaderProps> = ({
  stationName,
  distance,
  isClosest = false,
  onClick
}) => {
  const { alpha, theme } = useThemeUtils();
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
      <Chip
        icon={<LocationOnIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />}
        label={stationName}
        onClick={onClick}
        sx={{
          bgcolor: alpha(theme.palette.info.main, 0.1),
          color: theme.palette.info.light,
          border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
          fontWeight: 600,
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? {
            bgcolor: alpha(theme.palette.info.main, 0.2),
            border: `1px solid ${alpha(theme.palette.info.main, 0.5)}`,
            transform: 'scale(1.02)',
          } : {},
          '&:active': onClick ? {
            transform: 'scale(0.98)',
          } : {},
          transition: 'all 0.2s ease-in-out',
        }}
      />
      <Chip
        label={`${Math.round(distance)}m`}
        sx={{
          bgcolor: isClosest 
            ? alpha(theme.palette.success.main, 0.1) 
            : alpha(theme.palette.secondary.main, 0.1),
          color: isClosest 
            ? theme.palette.success.light 
            : theme.palette.secondary.light,
          border: isClosest 
            ? `1px solid ${alpha(theme.palette.success.main, 0.3)}` 
            : `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
          fontWeight: 600,
        }}
      />
    </Box>
  );
};