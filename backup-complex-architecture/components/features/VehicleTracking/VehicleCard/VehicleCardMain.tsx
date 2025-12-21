import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { formatRefreshTime } from '../../../../utils/formatting/timeFormat';
import { useThemeUtils, useMuiUtils } from '../../../../hooks';
import { useVehicleCardState } from './hooks/useVehicleCardState';
import { RouteBadge } from './components/RouteBadge';
import { VehicleInfo } from './components/VehicleInfo';
import { ShortStopsList } from './components/ShortStopsList';
import { ActionButtons } from './components/ActionButtons';
import { ExpandableStopsList } from './components/ExpandableStopsList';
import type { CoreVehicle } from '../../../../types/coreVehicle';

interface VehicleCardMainProps {
  /** Core vehicle data */
  vehicle: CoreVehicle;
  /** Station ID for highlighting current station */
  stationId?: string;
  /** Whether the stops list is expanded */
  isExpanded: boolean;
  /** Callback when stops list is toggled */
  onToggleExpanded: () => void;
  /** Callback when map button is clicked */
  onShowMap: () => void;
  /** Callback when route is clicked */
  onRouteClick?: () => void;
  /** Show short stop list always visible in card */
  showShortStopList?: boolean;
  /** Show "Show stops" button for full expandable list */
  showFullStopsButton?: boolean;
  /** Stop sequence data for displaying route stops */
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
  /** Optional arrival time override (e.g., "5 min", "Now") */
  arrivalText?: string;
  /** Optional destination override */
  destination?: string;
}

export const VehicleCardMain: React.FC<VehicleCardMainProps> = ({
  vehicle,
  stationId,
  isExpanded,
  onToggleExpanded,
  onShowMap,
  onRouteClick,
  showShortStopList = false,
  showFullStopsButton = true,
  stopSequence = [],
  arrivalText,
  destination
}) => {
  const { getBackgroundColors, getBorderColors, alpha, theme } = useThemeUtils();
  const { getCardStyles } = useMuiUtils();
  
  const {
    isDeparted,
    statusDotColor,
    timestampColor,
    stopsToShow
  } = useVehicleCardState(vehicle, stopSequence, showShortStopList);

  const backgrounds = getBackgroundColors();
  const borders = getBorderColors();

  return (
    <Card
      sx={{
        ...getCardStyles('glass'),
        opacity: isDeparted ? 0.7 : 1,
        bgcolor: isDeparted 
          ? alpha(backgrounds.paper, 0.3)
          : backgrounds.paper,
        border: `1px solid ${alpha(borders.divider, isDeparted ? 0.3 : 0.5)}`,
        '&:hover': {
          bgcolor: isDeparted 
            ? alpha(backgrounds.paper, 0.5)
            : backgrounds.paperHover,
          border: `1px solid ${alpha(borders.divider, isDeparted ? 0.5 : 0.7)}`,
        },
        // Add overlay for departed vehicles
        '&::before': isDeparted ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: alpha(theme.palette.action.disabled, 0.2),
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 1,
        } : {},
      }}
    >
      <CardContent sx={{ 
        py: { xs: 1.5, sm: 2 }, 
        px: { xs: 1.5, sm: 2 },
        position: 'relative', 
        zIndex: 2,
        '&:last-child': {
          pb: { xs: 1.5, sm: 2 }
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
          <RouteBadge
            routeId={vehicle.routeId}
            isDeparted={isDeparted}
            onRouteClick={onRouteClick}
          />
          
          <VehicleInfo
            vehicle={vehicle}
            destination={destination}
            arrivalText={arrivalText}
            isDeparted={isDeparted}
          />

          <Box sx={{ 
            textAlign: 'right',
            flexShrink: 0,
            minWidth: { xs: 40, sm: 60 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.5
          }}>
            {/* Status dot */}
            <Box
              sx={{
                width: { xs: 8, sm: 10 },
                height: { xs: 8, sm: 10 },
                borderRadius: '50%',
                bgcolor: isDeparted 
                  ? alpha(statusDotColor, 0.5) 
                  : statusDotColor,
                border: `1px solid ${alpha(statusDotColor, 0.3)}`,
                boxShadow: `0 0 4px ${alpha(statusDotColor, 0.4)}`,
                flexShrink: 0,
              }}
            />
          </Box>
        </Box>
        
        {/* Short stop list (always visible for favorite routes) */}
        <ShortStopsList
          stopsToShow={stopsToShow}
          stationId={stationId}
          vehicleId={vehicle.id}
        />

        {/* Expandable stops toggle and map button */}
        <ActionButtons
          stopSequence={stopSequence}
          showFullStopsButton={showFullStopsButton}
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded}
          onShowMap={onShowMap}
        />
        
        {/* Last update timestamp - positioned at bottom right */}
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute',
            bottom: 8,
            right: 12,
            color: timestampColor, // Color based on data freshness and stale threshold
            fontSize: { xs: '0.65rem', sm: '0.7rem' },
            lineHeight: 1,
            whiteSpace: 'nowrap',
            zIndex: 3, // Above the card content
            pointerEvents: 'none', // Don't interfere with card interactions
          }}
        >
          {formatRefreshTime(
            vehicle.timestamp instanceof Date 
              ? vehicle.timestamp 
              : vehicle.timestamp 
                ? new Date(vehicle.timestamp)
                : new Date()
          )}
        </Typography>
      </CardContent>
      
      {/* Collapsible stops list (always shows full route) */}
      <ExpandableStopsList
        isExpanded={isExpanded}
        stopSequence={stopSequence}
        stationId={stationId}
        vehicleId={vehicle.id}
      />
    </Card>
  );
};