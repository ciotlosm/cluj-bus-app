import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { FavoriteBusCard } from './FavoriteBusCard';
import { getRouteTypeInfo } from '../../../../utils/busDisplayUtils';
import type { FavoriteBusInfo } from '../../../../services/favoriteBusService';

interface GroupedFavoriteBusDisplayProps {
  buses: FavoriteBusInfo[];
}

interface BusWithStatus extends FavoriteBusInfo {
  arrivalStatus: {
    status: 'at-stop' | 'arriving' | 'missed' | 'unknown';
    estimatedMinutes?: number;
  };
}

export const GroupedFavoriteBusDisplay: React.FC<GroupedFavoriteBusDisplayProps> = ({ buses }) => {
  const theme = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Calculate arrival status for each bus
  const busesWithStatus = useMemo(() => {
    return buses.map((bus): BusWithStatus => {
      const arrivalStatus = calculateArrivalStatus(bus);
      return {
        ...bus,
        arrivalStatus,
      };
    });
  }, [buses]);

  // Group buses by routeShortName
  const groupedBuses = useMemo(() => {
    const groups = new Map<string, BusWithStatus[]>();
    
    busesWithStatus.forEach((bus) => {
      const key = bus.routeShortName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(bus);
    });

    // Sort buses within each group
    groups.forEach((busGroup) => {
      busGroup.sort((a, b) => {
        // Priority order: at-stop > arriving > missed > unknown
        const statusPriority = {
          'at-stop': 0,
          'arriving': 1,
          'missed': 2,
          'unknown': 3,
        };

        const aPriority = statusPriority[a.arrivalStatus.status];
        const bPriority = statusPriority[b.arrivalStatus.status];

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Within same status, sort arriving buses by estimated minutes
        if (a.arrivalStatus.status === 'arriving' && b.arrivalStatus.status === 'arriving') {
          const aMinutes = a.arrivalStatus.estimatedMinutes || 999;
          const bMinutes = b.arrivalStatus.estimatedMinutes || 999;
          return aMinutes - bMinutes;
        }

        // For other statuses, sort by last update (most recent first)
        return (b.lastUpdate?.getTime() || 0) - (a.lastUpdate?.getTime() || 0);
      });
    });

    // Convert to array and sort groups by route name
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        // Try to sort numerically if possible, otherwise alphabetically
        const aNum = parseInt(a, 10);
        const bNum = parseInt(b, 10);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        return a.localeCompare(b);
      });
  }, [busesWithStatus]);

  const handleGroupToggle = (routeShortName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(routeShortName)) {
      newExpanded.delete(routeShortName);
    } else {
      newExpanded.add(routeShortName);
    }
    setExpandedGroups(newExpanded);
  };

  // Auto-expand groups with buses at stop or arriving soon
  React.useEffect(() => {
    const autoExpand = new Set<string>();
    
    groupedBuses.forEach(([routeShortName, busGroup]) => {
      const hasUrgentBuses = busGroup.some(bus => 
        bus.arrivalStatus.status === 'at-stop' || 
        (bus.arrivalStatus.status === 'arriving' && (bus.arrivalStatus.estimatedMinutes || 999) <= 5)
      );
      
      if (hasUrgentBuses) {
        autoExpand.add(routeShortName);
      }
    });

    setExpandedGroups(autoExpand);
  }, [groupedBuses]);

  if (groupedBuses.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1}>
      {groupedBuses.map(([routeShortName, busGroup]) => {
        const isExpanded = expandedGroups.has(routeShortName);
        const routeTypeInfo = getRouteTypeInfo(String(busGroup[0]?.routeType || 'bus'), theme);
        
        // Count buses by status
        const statusCounts = busGroup.reduce((acc, bus) => {
          acc[bus.arrivalStatus.status] = (acc[bus.arrivalStatus.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Get the most urgent status for the group
        const mostUrgentStatus = busGroup[0]?.arrivalStatus.status || 'unknown';
        const urgentColor = mostUrgentStatus === 'at-stop' 
          ? theme.palette.warning.main
          : mostUrgentStatus === 'arriving'
          ? theme.palette.success.main
          : theme.palette.text.secondary;

        return (
          <Accordion
            key={routeShortName}
            expanded={isExpanded}
            onChange={() => handleGroupToggle(routeShortName)}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              '&:before': { display: 'none' },
              '&.Mui-expanded': {
                margin: 0,
                borderColor: alpha(urgentColor, 0.3),
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{
                bgcolor: alpha(routeTypeInfo.color, 0.05),
                borderRadius: isExpanded ? '8px 8px 0 0' : 2,
                '&.Mui-expanded': {
                  minHeight: 48,
                },
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center',
                  '&.Mui-expanded': {
                    margin: '12px 0',
                  },
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
                {/* Route Avatar */}
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: routeTypeInfo.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                  }}
                >
                  {routeShortName}
                </Box>

                {/* Route Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Route {routeShortName}
                    </Typography>
                    {/* Bus/Trolleybus Type Chip */}
                    <Chip
                      label={routeTypeInfo.label}
                      size="small"
                      sx={{
                        bgcolor: alpha(routeTypeInfo.color, 0.1),
                        color: routeTypeInfo.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {busGroup.length} bus{busGroup.length !== 1 ? 'es' : ''} tracked
                  </Typography>
                </Box>

                {/* Status Chips */}
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {statusCounts['at-stop'] && (
                    <Chip
                      label={`${statusCounts['at-stop']} at stop`}
                      size="small"
                      color="warning"
                      variant="filled"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                  {statusCounts['arriving'] && (
                    <Chip
                      label={`${statusCounts['arriving']} arriving`}
                      size="small"
                      color="success"
                      variant="filled"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                  {statusCounts['missed'] && (
                    <Chip
                      label={`${statusCounts['missed']} missed`}
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                </Stack>
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={2}>
                {busGroup.map((bus, index) => (
                  <FavoriteBusCard
                    key={`${bus.routeShortName}-${bus.vehicleId}-${bus.lastUpdate?.getTime() || Date.now()}-${index}`}
                    bus={bus}
                    index={index}
                  />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
};

// Helper function to calculate arrival status
function calculateArrivalStatus(bus: FavoriteBusInfo): {
  status: 'at-stop' | 'arriving' | 'missed' | 'unknown';
  estimatedMinutes?: number;
} {
  if (!bus?.stopSequence || bus.stopSequence.length === 0) {
    return { status: 'unknown' };
  }

  const userStop = bus.stopSequence.find(stop => stop.isClosestToUser);
  const currentStop = bus.stopSequence.find(stop => stop.isCurrent);
  
  if (!userStop || !currentStop) {
    return { status: 'unknown' };
  }

  const userStopIndex = bus.stopSequence.findIndex(stop => stop.isClosestToUser);
  const currentStopIndex = bus.stopSequence.findIndex(stop => stop.isCurrent);

  if (currentStopIndex > userStopIndex) {
    return { status: 'missed' };
  } else if (currentStopIndex < userStopIndex) {
    // Simple estimation: 1 minute per stop
    const estimatedMinutes = Math.max(1, (userStopIndex - currentStopIndex) * 1);
    return { 
      status: 'arriving',
      estimatedMinutes,
    };
  } else {
    return { status: 'at-stop' };
  }
}