// StationList - Enhanced display component with card-based design matching vehicle cards
// Displays filtered stations with distance, trip information, and expandable vehicle lists
// Includes performance optimizations with memoization and optimized callbacks

import type { FC } from 'react';
import { useState, useCallback, useEffect, memo } from 'react';
import { 
  Stack, 
  Typography, 
  Chip, 
  IconButton,
  Collapse,
  Card,
  CardContent,
  Box,
  Avatar,
  Tooltip
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  ExpandMore as ExpandMoreIcon,
  FavoriteBorder as FavoriteOutlineIcon,
  DirectionsBus as BusStopIcon
} from '@mui/icons-material';
import type { FilteredStation, StationUtilities } from '../../../types/stationFilter';
import { StationVehicleList } from './StationVehicleList';
import { useRouteStore } from '../../../stores/routeStore';

interface StationListProps {
  stations: FilteredStation[];
  utilities: StationUtilities;
  isFiltering: boolean;
}

export const StationList: FC<StationListProps> = memo(({ stations, utilities, isFiltering }) => {
  const { formatDistance, getStationTypeColor, getStationTypeLabel } = utilities;
  const { routes } = useRouteStore();
  
  // Expansion state management per station
  const [expandedStations, setExpandedStations] = useState<Set<number>>(() => {
    // Auto-expand logic: when smart filtering is ON (nearby only), auto-expand all stations
    if (isFiltering) {
      return new Set(stations.map(fs => fs.station.stop_id));
    }
    return new Set(); // When filtering is OFF (show all), collapse all by default
  });

  // Route filter state management per station - Map<stationId, selectedRouteId | null>
  const [routeFilters, setRouteFilters] = useState<Map<number, number | null>>(new Map());

  // Update expansion state when filtering mode changes
  const handleFilteringChange = useCallback(() => {
    if (isFiltering) {
      // Smart filtering ON -> Auto-expand all stations
      setExpandedStations(new Set(stations.map(fs => fs.station.stop_id)));
    } else {
      // Smart filtering OFF -> Collapse all stations
      setExpandedStations(new Set());
    }
  }, [isFiltering, stations]);

  // Update expansion when filtering mode or stations change
  useEffect(() => {
    handleFilteringChange();
  }, [handleFilteringChange]);

  // Toggle expansion for individual station - memoized to prevent unnecessary re-renders
  const toggleStationExpansion = useCallback((stationId: number) => {
    setExpandedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationId)) {
        newSet.delete(stationId);
      } else {
        newSet.add(stationId);
      }
      return newSet;
    });
  }, []);

  // Route filter handler - memoized to prevent unnecessary re-renders
  const handleRouteFilter = useCallback((stationId: number, routeId: number) => {
    setRouteFilters(prev => {
      const newFilters = new Map(prev);
      const currentFilter = newFilters.get(stationId);
      
      // Toggle logic: if same route clicked, clear filter; otherwise set new filter
      if (currentFilter === routeId) {
        newFilters.set(stationId, null);
      } else {
        newFilters.set(stationId, routeId);
        
        // Expand the station if it's currently collapsed when applying a route filter
        setExpandedStations(prevExpanded => {
          if (!prevExpanded.has(stationId)) {
            const newExpanded = new Set(prevExpanded);
            newExpanded.add(stationId);
            return newExpanded;
          }
          return prevExpanded;
        });
      }
      
      return newFilters;
    });
  }, []);

  if (stations.length === 0) {
    return null; // Empty state handled by parent component
  }

  return (
    <Stack spacing={1.5} sx={{ p: { xs: 1, sm: 2 } }}>
      {stations.map((filteredStation) => {
        const { station, distance, stationType, matchesFavorites, vehicles, routeIds } = filteredStation;
        const isExpanded = expandedStations.has(station.stop_id);
        const selectedRouteId = routeFilters.get(station.stop_id);
        
        // Get route data for the bubbles
        const stationRoutes = routes.filter(route => routeIds.includes(route.route_id));
        
        return (
          <Card key={station.stop_id} sx={{ 
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1
          }}>
            <CardContent sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              '&:last-child': { pb: { xs: 1.5, sm: 2 } } 
            }}>
              {/* Header with station avatar, name, and station ID */}
              <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                {/* Station avatar - smaller on mobile */}
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: { xs: 40, sm: 48 }, 
                  height: { xs: 40, sm: 48 },
                  fontSize: { xs: '1rem', sm: '1.2rem' },
                  flexShrink: 0,
                  borderRadius: 1
                }} variant="square">
                  <BusStopIcon />
                </Avatar>
                
                {/* Station name and details */}
                <Box sx={{ flex: 1, minWidth: 0 }}> {/* minWidth: 0 allows text truncation */}
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      mb: 0.5,
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {station.stop_name}
                  </Typography>
                  
                  {/* Distance and station type chips */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Tooltip 
                      title={`Station ID: ${station.stop_id} | GPS: ${station.stop_lat}, ${station.stop_lon}`}
                      placement="top"
                    >
                      <Chip
                        icon={<LocationIcon />}
                        label={`${formatDistance(distance)}`}
                        color="default"
                        variant="filled"
                        size="small"
                        sx={{ 
                          bgcolor: 'grey.200',
                          color: 'grey.800',
                          '& .MuiChip-icon': { color: 'grey.800' },
                          cursor: 'help'
                        }}
                      />
                    </Tooltip>
                    
                    {/* Station type indicator - blue circle for closest */}
                    {stationType === 'primary' && (
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          flexShrink: 0
                        }}
                      />
                    )}
                    
                    {/* Favorite indicator - inline with distance */}
                    {matchesFavorites && (
                      <FavoriteOutlineIcon 
                        fontSize="small" 
                        sx={{ 
                          color: 'error.main',
                          width: 16,
                          height: 16
                        }} 
                      />
                    )}
                    
                    {/* Station type chip for secondary stations */}
                    {stationType === 'secondary' && (
                      <Chip
                        label={getStationTypeLabel(stationType)}
                        size="small"
                        color={getStationTypeColor(stationType)}
                        variant="filled"
                      />
                    )}
                  </Stack>
                  
                  {/* Route bubbles - mobile optimized */}
                  {stationRoutes.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Stack 
                        direction="row" 
                        spacing={0.5} 
                        alignItems="center" 
                        flexWrap="wrap"
                        sx={{ 
                          gap: 0.5,
                          maxWidth: '100%'
                        }}
                      >
                        {stationRoutes.slice(0, 8).map((route) => (
                          <Avatar
                            key={route.route_id}
                            onClick={() => handleRouteFilter(station.stop_id, route.route_id)}
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              bgcolor: selectedRouteId === route.route_id 
                                ? 'primary.main' 
                                : (route.route_color ? `#${route.route_color}` : 'grey.400'),
                              color: 'white',
                              minWidth: 32,
                              flexShrink: 0,
                              cursor: 'pointer',
                              opacity: selectedRouteId === null || selectedRouteId === route.route_id ? 1 : 0.6,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.1)',
                                opacity: 1,
                                boxShadow: 2
                              },
                              border: selectedRouteId === route.route_id ? '2px solid' : '1px solid transparent',
                              borderColor: selectedRouteId === route.route_id ? 'primary.dark' : 'transparent',
                              boxShadow: selectedRouteId === route.route_id ? 2 : 0
                            }}
                          >
                            {route.route_short_name}
                          </Avatar>
                        ))}
                        {stationRoutes.length > 8 && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ ml: 0.5, fontSize: '0.65rem' }}
                          >
                            +{stationRoutes.length - 8} more
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Box>
                
                {/* Expand button only */}
                <Box display="flex" alignItems="center">
                  <IconButton 
                    size="small"
                    onClick={() => toggleStationExpansion(station.stop_id)}
                    sx={{ 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Box>
              </Stack>
              {/* Expandable vehicle list section */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <StationVehicleList 
                  vehicles={vehicles}
                  expanded={isExpanded}
                  station={station}
                  stationRouteCount={routeIds.length}
                  selectedRouteId={selectedRouteId}
                />
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
});

// Display name for debugging
StationList.displayName = 'StationList';