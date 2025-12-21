// StationEmptyState - Empty state messages for station filtering
// Handles different empty state scenarios

import type { FC } from 'react';
import { 
  Alert, 
  Button,
  Typography
} from '@mui/material';

interface StationEmptyStateProps {
  filteredCount: number;
  totalCount: number;
  isFiltering: boolean;
  onShowAll: () => void;
}

export const StationEmptyState: FC<StationEmptyStateProps> = ({
  filteredCount,
  totalCount,
  isFiltering,
  onShowAll
}) => {
  // No stations found with filtering active
  if (filteredCount === 0 && totalCount > 0 && isFiltering) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No stations found with active service in your area. 
        <Button 
          size="small" 
          onClick={onShowAll}
          sx={{ ml: 1 }}
        >
          Show all stations
        </Button>
      </Alert>
    );
  }
  
  // No stations at all
  if (filteredCount === 0 && totalCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No stations found
      </Typography>
    );
  }
  
  // Has stations - no empty state needed
  return null;
};