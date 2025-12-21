import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useThemeUtils } from '../../../../../hooks';
import type { CoreVehicle } from '../../../../../types/coreVehicle';

interface VehicleInfoProps {
  vehicle: CoreVehicle;
  destination?: string;
  arrivalText?: string;
  isDeparted: boolean;
}

export const VehicleInfo: React.FC<VehicleInfoProps> = ({
  vehicle,
  destination,
  arrivalText,
  isDeparted
}) => {
  const { alpha, theme } = useThemeUtils();

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minWidth: 0, // Allow shrinking below content size
      overflow: 'hidden' // Prevent overflow
    }}>
      <Typography variant="body1" sx={{ 
        color: isDeparted 
          ? alpha(theme.palette.text.primary, 0.6) 
          : theme.palette.text.primary, 
        fontWeight: 600,
        fontSize: { xs: '0.9rem', sm: '1rem' },
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {destination || vehicle.routeName || `Route ${vehicle.routeId}`}
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        gap: { xs: 0.5, sm: 1 }, 
        mt: 0.5,
        width: '100%'
      }}>
        <Typography variant="body2" sx={{ 
          color: isDeparted 
            ? alpha(theme.palette.text.secondary, 0.6) 
            : theme.palette.text.secondary,
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 1
        }}>
          Vehicle: {vehicle.label || vehicle.id}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 0.5, sm: 1 },
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap'
        }}>
          {arrivalText && (
            <Chip
              label={arrivalText}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: isDeparted 
                  ? alpha(theme.palette.success.main, 0.6)
                  : theme.palette.success.main,
                border: `1px solid ${alpha(theme.palette.success.main, isDeparted ? 0.2 : 0.3)}`,
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                height: { xs: 18, sm: 20 },
                opacity: isDeparted ? 0.7 : 1,
                flexShrink: 0,
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};