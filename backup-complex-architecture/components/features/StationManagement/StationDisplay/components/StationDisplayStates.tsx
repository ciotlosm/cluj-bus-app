import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { MapPinIcon } from '../../../../ui/base/Icons/Icons';
import { EmptyState } from '../../../../ui';

interface LoadingStateProps {}

export const LoadingState: React.FC<LoadingStateProps> = () => {
  return (
    <Box sx={{ px: 3, pb: 3, pt: 1 }}>
      <Card sx={{ 
        bgcolor: 'rgba(30, 41, 59, 0.3)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(100, 116, 139, 0.2)'
      }}>
        <CardContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 8 }}>
            <CircularProgress size={48} sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              Loading Station Data
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
              Finding buses that serve nearby stations...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

interface ErrorStateProps {
  title: string;
  message: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message }) => {
  return (
    <Box sx={{ px: 3, pb: 3, pt: 1 }}>
      <Card sx={{ 
        bgcolor: 'rgba(30, 41, 59, 0.3)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(100, 116, 139, 0.2)'
      }}>
        <CardContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 8 }}>
            <Box sx={{ 
              width: 64, 
              height: 64, 
              borderRadius: 3,
              bgcolor: 'rgba(71, 85, 105, 0.5)',
              border: '1px solid rgba(100, 116, 139, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ color: '#9e9e9e' }}>
                <MapPinIcon size={28} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
              {message}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

interface EmptyVehiclesStateProps {
  emptyMessage: string;
}

export const EmptyVehiclesState: React.FC<EmptyVehiclesStateProps> = ({ emptyMessage }) => {
  return (
    <EmptyState
      title="No Vehicles Found"
      message={emptyMessage}
      variant="default"
    />
  );
};