import React from 'react';
import {
  Alert,
  Typography,
} from '@mui/material';

interface StatusMessagesProps {
  isLoading: boolean;
  hasRoutes: boolean;
  hasFilteredRoutes: boolean;
  hasFavorites: boolean;
  searchTerm: string;
  selectedTypes: string[];
  cityName?: string;
  selectedCount: number;
  hasChanges: boolean;
}

export const StatusMessages: React.FC<StatusMessagesProps> = ({
  isLoading,
  hasRoutes,
  hasFilteredRoutes,
  hasFavorites,
  searchTerm,
  selectedTypes,
  cityName,
  selectedCount,
  hasChanges,
}) => {
  // No Routes Found (with search/filter)
  if (!isLoading && !hasFilteredRoutes && !hasFavorites && hasRoutes) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <Typography variant="body2">
          No routes found matching "{searchTerm}". Try a different search term.
        </Typography>
      </Alert>
    );
  }

  // No Available Routes (all are favorites)
  if (!isLoading && !hasFilteredRoutes && hasFavorites && searchTerm === '' && selectedTypes.length === 0) {
    return (
      <Alert severity="success" sx={{ borderRadius: 2 }}>
        <Typography variant="body2">
          All available routes are already in your favorites! You can remove routes from favorites by unchecking them above.
        </Typography>
      </Alert>
    );
  }

  // No Routes Available
  if (!isLoading && !hasRoutes) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          ❌ API Key Invalid or Expired
        </Typography>
        <Typography variant="body2">
          Your Tranzy API key is no longer valid. Please:
        </Typography>
        <Typography variant="body2" component="ol" sx={{ mt: 1, pl: 2 }}>
          <li>Visit <strong>tranzy.ai</strong> to get a new API key</li>
          <li>Go to <strong>Settings</strong> in this app</li>
          <li>Update your API key with the new one</li>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontSize: '0.875rem', opacity: 0.8 }}>
          Current key ending in: ...{cityName ? 'gtxqgAJTej' : 'expired'}
        </Typography>
      </Alert>
    );
  }



  return null;
};