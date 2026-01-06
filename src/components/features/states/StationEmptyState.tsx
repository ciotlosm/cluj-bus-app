// StationEmptyState - Empty state messages for station filtering
// Handles empty state when no nearby stations found

import type { FC } from 'react';
import { 
  Typography
} from '@mui/material';

interface StationEmptyStateProps {
  filteredCount: number;
}

export const StationEmptyState: FC<StationEmptyStateProps> = ({
  filteredCount
}) => {
  // No nearby stations found
  if (filteredCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
        No nearby stations with active service found
      </Typography>
    );
  }
  
  // Has stations - no empty state needed
  return null;
};