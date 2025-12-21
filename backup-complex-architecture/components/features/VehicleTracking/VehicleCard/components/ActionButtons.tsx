import React from 'react';
import { Box, Typography } from '@mui/material';
import { ExpandMore, ExpandLess, Map as MapIcon } from '@mui/icons-material';
import { useThemeUtils } from '../../../../../hooks';

interface ActionButtonsProps {
  stopSequence: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
  showFullStopsButton: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onShowMap: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  stopSequence,
  showFullStopsButton,
  isExpanded,
  onToggleExpanded,
  onShowMap
}) => {
  const { alpha, theme } = useThemeUtils();

  if (!stopSequence || stopSequence.length === 0) return null;

  return (
    <Box sx={{ 
      mt: 1, 
      display: 'flex', 
      gap: 1,
      width: '100%',
      alignItems: 'stretch', // Make buttons same height
      mx: 0, // Ensure no horizontal margin
      px: 0  // Ensure no horizontal padding
    }}>
      {/* Stops toggle button (only show if showFullStopsButton is true) */}
      {showFullStopsButton && (
        <Box
          onClick={onToggleExpanded}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            py: 0.5,
            px: 1,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.action.hover, 0.5),
            flex: 1, // Take up all available space on the left
            minWidth: 0, // Allow shrinking
            maxWidth: 'calc(100% - 52px)', // Reserve space for map button (44px + 8px gap)
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.7),
            },
            '&:active': {
              bgcolor: alpha(theme.palette.action.hover, 0.9),
            }
          }}
        >
          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {isExpanded ? (
              <ExpandLess fontSize="small" />
            ) : (
              <ExpandMore fontSize="small" />
            )}
          </Box>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.65rem', sm: '0.7rem' }, // Smaller font for mobile
              flexGrow: 1,
              whiteSpace: 'nowrap', // Prevent text wrapping
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Stops ({stopSequence.length})
          </Typography>
        </Box>
      )}
      
      {/* Map button */}
      <Box
        onClick={onShowMap}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          py: 0.5,
          px: { xs: 1.5, sm: 1 },
          borderRadius: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          flexShrink: 0, // Don't shrink the map button
          minWidth: { xs: 44, sm: 36 },
          ...(showFullStopsButton ? {} : { 
            flex: 1, 
            justifyContent: 'center',
            minWidth: 'auto'
          }),
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.2),
          },
          '&:active': {
            bgcolor: alpha(theme.palette.primary.main, 0.3),
          }
        }}
      >
        <MapIcon 
          fontSize="small" 
          sx={{ 
            color: theme.palette.primary.main,
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }} 
        />
        {!showFullStopsButton && (
          <Typography 
            variant="caption" 
            sx={{ 
              ml: 1, 
              color: theme.palette.primary.main,
              fontSize: { xs: '0.7rem', sm: '0.75rem' }
            }}
          >
            View on map
          </Typography>
        )}
      </Box>
    </Box>
  );
};