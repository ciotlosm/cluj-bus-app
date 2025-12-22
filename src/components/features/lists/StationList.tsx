// StationList - Enhanced display component with expandable vehicle sections
// Displays filtered stations with distance, trip information, and expandable vehicle lists
// Includes performance optimizations with memoization and optimized callbacks

import type { FC } from 'react';
import { useState, useCallback, useEffect, memo } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText,
  ListItemButton,
  Typography, 
  Chip, 
  Stack,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import type { FilteredStation, StationUtilities } from '../../../types/stationFilter';
import { StationVehicleList } from './StationVehicleList';

interface StationListProps {
  stations: FilteredStation[];
  utilities: StationUtilities;
  isFiltering: boolean;
}

export const StationList: FC<StationListProps> = memo(({ stations, utilities, isFiltering }) => {
  const { formatDistance, getStationTypeColor, getStationTypeLabel } = utilities;
  
  // Expansion state management per station
  const [expandedStations, setExpandedStations] = useState<Set<number>>(() => {
    // Auto-expand logic: when smart filtering is ON (nearby only), auto-expand all stations
    if (isFiltering) {
      return new Set(stations.map(fs => fs.station.stop_id));
    }
    return new Set(); // When filtering is OFF (show all), collapse all by default
  });

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

  if (stations.length === 0) {
    return null; // Empty state handled by parent component
  }

  return (
    <List>
      {stations.map((filteredStation) => {
        const { station, distance, stationType } = filteredStation;
        const isExpanded = expandedStations.has(station.stop_id);
        
        return (
          <div key={station.stop_id}>
            <ListItem divider disablePadding>
              <ListItemButton 
                onClick={() => toggleStationExpansion(station.stop_id)}
                sx={{ py: 1 }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="subtitle1" component="span">
                        {station.stop_name}
                      </Typography>
                      
                      {/* Primary/Secondary station indicator - only show if has label */}
                      {getStationTypeLabel(stationType) && (
                        <Chip
                          label={getStationTypeLabel(stationType)}
                          size="small"
                          color={getStationTypeColor(stationType)}
                          variant="filled"
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <>
                      {/* Distance information */}
                      <Typography variant="body2" color="text.secondary" component="span">
                        <LocationIcon fontSize="small" color="action" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formatDistance(distance)} away
                      </Typography>
                      <br />
                      
                      {/* Station details */}
                      <Typography variant="body2" color="text.secondary" component="span">
                        ID: {station.stop_id} | Lat: {station.stop_lat}, Lon: {station.stop_lon}
                      </Typography>
                    </>
                  }
                />
                
                {/* Expand/Collapse chevron icon */}
                <IconButton 
                  edge="end" 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStationExpansion(station.stop_id);
                  }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </ListItemButton>
            </ListItem>
            
            {/* Expandable vehicle list section */}
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <StationVehicleList 
                station={station} 
                expanded={isExpanded}
              />
            </Collapse>
          </div>
        );
      })}
    </List>
  );
});

// Display name for debugging
StationList.displayName = 'StationList';