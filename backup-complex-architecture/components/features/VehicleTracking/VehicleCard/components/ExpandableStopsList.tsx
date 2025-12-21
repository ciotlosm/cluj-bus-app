import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Typography,
} from '@mui/material';
import { 
  DirectionsBus, 
  FlagOutlined,
  PersonPin,
} from '@mui/icons-material';
import { useThemeUtils } from '../../../../../hooks';

interface ExpandableStopsListProps {
  isExpanded: boolean;
  stopSequence: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
  stationId?: string;
  vehicleId: string;
}

export const ExpandableStopsList: React.FC<ExpandableStopsListProps> = ({
  isExpanded,
  stopSequence,
  stationId,
  vehicleId
}) => {
  const { alpha, theme } = useThemeUtils();

  return (
    <Collapse in={isExpanded}>
      <Box sx={{ px: 2, pb: 2 }}>
        <List dense sx={{ py: 0 }}>
          {(stopSequence || []).map((stop) => (
            <ListItem
              key={`${vehicleId}-stop-${stop.stopId}-${stop.sequence}`}
              sx={{
                py: 0.5,
                px: 1,
                borderRadius: 1,
                bgcolor: stop.isCurrent
                  ? alpha(theme.palette.primary.main, 0.1)
                  : stop.stopId === stationId
                  ? alpha(theme.palette.info.main, 0.1)
                  : 'transparent',
                border: stop.isCurrent
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : stop.stopId === stationId
                  ? `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                  : '1px solid transparent',
                mb: 0.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {stop.isCurrent ? (
                    <DirectionsBus 
                      sx={{ 
                        fontSize: 14, 
                        color: theme.palette.primary.main
                      }} 
                    />
                  ) : stop.stopId === stationId ? (
                    <PersonPin 
                      sx={{ 
                        fontSize: 14, 
                        color: theme.palette.info.main
                      }} 
                    />
                  ) : stop.isDestination ? (
                    <FlagOutlined 
                      sx={{ 
                        fontSize: 14, 
                        color: theme.palette.success.main
                      }} 
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: theme.palette.text.disabled,
                      }}
                    />
                  )}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography 
                    variant="body2" 
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: stop.isCurrent || stop.stopId === stationId ? 600 : 400,
                      color: stop.isCurrent 
                        ? theme.palette.primary.main 
                        : stop.stopId === stationId
                        ? theme.palette.info.main
                        : theme.palette.text.primary,
                      lineHeight: 1.2,
                    }}
                  >
                    {stop.stopName}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                    {stop.isCurrent && 'Bus is currently closest to this stop'}
                    {stop.stopId === stationId && 'Your closest station'}
                    {stop.isDestination && 'Final destination'}
                    {!stop.isCurrent && !stop.isDestination && stop.stopId !== stationId && `Stop ${stop.sequence}`}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Collapse>
  );
};