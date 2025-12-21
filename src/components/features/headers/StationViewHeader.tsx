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

interface StationViewHeaderProps {
  isFiltering: boolean;
  toggleFiltering: () => void;
  filteredCount: number;
  totalCount: number;
}

export const StationViewHeader: FC<StationViewHeaderProps> = ({
  isFiltering,
  toggleFiltering,
  filteredCount,
  totalCount
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
        <Chip
          label={`${filteredCount} of ${totalCount} stations`}
          size="small"
          variant="outlined"
        />
      </Stack>
    </Box>
  );
};