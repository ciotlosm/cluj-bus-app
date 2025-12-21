// StationViewHeader - Header with filtering controls and status indicators
// Displays filtering toggle and status chips

import type { FC } from 'react';
import { 
  Box, 
  Typography, 
  Switch,
  FormControlLabel,
  Chip,
  Stack
} from '@mui/material';
import { 
  DirectionsBus as BusIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

interface StationViewHeaderProps {
  isFiltering: boolean;
  toggleFiltering: () => void;
  filteredCount: number;
  totalCount: number;
  hasActiveTrips: boolean;
}

export const StationViewHeader: FC<StationViewHeaderProps> = ({
  isFiltering,
  toggleFiltering,
  filteredCount,
  totalCount,
  hasActiveTrips
}) => {
  return (
    <Box sx={{ p: 2, pb: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">
          Stations
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={isFiltering}
              onChange={toggleFiltering}
              size="small"
            />
          }
          label="Smart Filter"
          sx={{ ml: 1 }}
        />
      </Stack>

      {/* Filtering status indicators */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {isFiltering && (
          <Chip
            icon={<FilterIcon />}
            label="Smart filtering enabled"
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        
        <Chip
          label={`${filteredCount} of ${totalCount} stations`}
          size="small"
          variant="outlined"
        />
        
        {hasActiveTrips && (
          <Chip
            icon={<BusIcon />}
            label="Service verified"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Stack>
    </Box>
  );
};