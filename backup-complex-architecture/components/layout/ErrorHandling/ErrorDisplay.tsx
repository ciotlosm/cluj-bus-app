import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import type { ErrorState } from '../../../types';
import { formatTime24 } from '../../../utils/formatting/timeFormat';

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
}

const getErrorSeverity = (type: ErrorState['type']): 'error' | 'warning' | 'info' => {
  switch (type) {
    case 'network':
    case 'authentication':
      return 'error';
    case 'parsing':
      return 'warning';
    case 'partial':
    case 'noData':
      return 'info';
    default:
      return 'error';
  }
};

const getErrorIcon = (type: ErrorState['type']): string => {
  switch (type) {
    case 'network':
      return '🌐';
    case 'authentication':
      return '🔐';
    case 'parsing':
      return '⚠️';
    case 'partial':
      return '📊';
    case 'noData':
      return '📭';
    default:
      return '❌';
  }
};

const getErrorTitle = (type: ErrorState['type']): string => {
  switch (type) {
    case 'network':
      return 'Network Error';
    case 'authentication':
      return 'Authentication Error';
    case 'parsing':
      return 'Data Format Error';
    case 'partial':
      return 'Incomplete Data';
    case 'noData':
      return 'No Data Available';
    default:
      return 'Error';
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  const theme = useTheme();
  const severity = getErrorSeverity(error.type);
  const icon = getErrorIcon(error.type);
  const title = getErrorTitle(error.type);

  return (
    <Alert
      severity={severity}
      data-error-type={error.type}
      sx={{
        borderRadius: 2,
        mb: 2,
        '& .MuiAlert-icon': {
          fontSize: '1.25rem',
        },
      }}
      action={
        error.retryable && onRetry ? (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Retry
          </Button>
        ) : undefined
      }
    >
      <AlertTitle sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
        {icon} {title}
      </AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {error.message}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          opacity: 0.75,
          fontSize: '0.75rem',
        }}
      >
        {formatTime24(error.timestamp)}
      </Typography>
    </Alert>
  );
};