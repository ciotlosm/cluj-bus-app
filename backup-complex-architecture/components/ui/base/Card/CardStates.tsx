import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Skeleton,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Loading State Component Props
export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullHeight?: boolean;
}

// Error State Component Props
export interface ErrorStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'inline' | 'page' | 'card';
}

// Card Loading State Component
export const CardLoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'medium',
  text,
  fullHeight = false,
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };

  const heightStyles = fullHeight ? { minHeight: '200px' } : {};

  if (variant === 'skeleton') {
    return (
      <Box sx={{ p: 2, ...heightStyles }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        ...heightStyles,
      }}
    >
      <CircularProgress size={sizeMap[size]} />
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {text}
        </Typography>
      )}
    </Box>
  );
};

// Card Error State Component
export const CardErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  action,
  variant = 'card',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'page':
        return { minHeight: '400px', p: 4 };
      case 'inline':
        return { p: 1 };
      default:
        return { p: 2 };
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        ...getVariantStyles(),
      }}
    >
      <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
      <Typography variant="h6" color="error" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {message}
      </Typography>
      {action && (
        <IconButton
          onClick={action.onClick}
          color="primary"
          aria-label={action.label}
        >
          <RefreshIcon />
        </IconButton>
      )}
    </Box>
  );
};

// Export components with expected names for testing
export const CardLoadingStateComponent = CardLoadingState;
export const CardErrorStateComponent = CardErrorState;