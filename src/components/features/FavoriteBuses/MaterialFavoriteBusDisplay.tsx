import React from 'react';
import {
  Box,
  Stack,
} from '@mui/material';
import { formatTime24, formatRefreshTime } from '../../../utils/timeFormat';
import { RadioButtonChecked as LiveIcon } from '@mui/icons-material';

import { useFavoriteBusDisplay } from '../../../hooks/useFavoriteBusDisplay';
import { InfoCard } from '../../ui/Card';
import { FavoriteBusCard } from './components/FavoriteBusCard';
import { EmptyStates } from './components/EmptyStates';

interface MaterialFavoriteBusDisplayProps {
  className?: string;
}

export const MaterialFavoriteBusDisplay: React.FC<MaterialFavoriteBusDisplayProps> = ({ className }) => {
  const {
    // Data
    favoriteBusResult,
    isLoading,
    error,
    lastUpdate,
    config,
    
    // Computed
    hasFavoriteRoutes,
    hasFavoriteBusData,
    
    // Utilities
    getRouteLabel,
    getRouteTypeInfo,
  } = useFavoriteBusDisplay();

  if (error) {
    return <EmptyStates type="error" error={error} />;
  }

  if (!hasFavoriteRoutes) {
    return <EmptyStates type="no-favorites" />;
  }

  // If we have favorite routes configured but no bus data yet (still loading)
  if (hasFavoriteRoutes && !favoriteBusResult && isLoading) {
    return <EmptyStates type="loading" />;
  }

  // If we have favorite routes configured but no bus data available (finished loading but no data)
  if (hasFavoriteRoutes && favoriteBusResult && !hasFavoriteBusData && !isLoading) {
    return (
      <EmptyStates 
        type="no-data" 
        config={config}
        getRouteLabel={getRouteLabel}
        getRouteTypeInfo={getRouteTypeInfo}
      />
    );
  }

  return (
    <Box className={className}>
      <InfoCard
        title="Favorite Buses"
        subtitle={lastUpdate && lastUpdate instanceof Date ? `Last cache update ${formatRefreshTime(lastUpdate)}` : 'Real-time updates'}
        icon={<LiveIcon sx={{ color: 'success.main' }} />}
      >
        <Stack spacing={2}>
          {(favoriteBusResult?.favoriteBuses || []).map((bus: any, index: number) => (
            <FavoriteBusCard
              key={`${bus.routeShortName}-${bus.vehicleId}-${bus.lastUpdate?.getTime() || Date.now()}-${index}`}
              bus={bus}
              index={index}
            />
          ))}
        </Stack>
      </InfoCard>
    </Box>
  );
};

export default MaterialFavoriteBusDisplay;