import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon } from '@mui/icons-material';
import { Button } from '../../base/Button';
import type { SxProps, Theme } from '@mui/material/styles';

import type { StandardErrorProps } from '../../../../types/componentProps';

/**
 * ErrorState component props with Material-UI integration
 * Implements consistent error display patterns with actionable messages
 * Follows standardized prop patterns for consistency
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1
 */
interface ErrorStateProps extends StandardErrorProps {
  /** Error title */
  title: string;
  /** Error message */
  message: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Display variant */
  variant?: 'inline' | 'page' | 'card';
  /** Additional sx props for custom styling */
  sx?: SxProps<Theme>;
}

/**
 * ErrorState component using Material-UI components exclusively
 * Implements consistent error display patterns with actionable messages
 * Validates Requirements: 5.1, 7.2, 7.4
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  action,
  variant = 'card',
  sx,
}) => {
  // Inline variant - compact error display using Alert
  if (variant === 'inline') {
    return (
      <Alert 
        severity="error"
        icon={<ErrorIcon />}
        action={
          action && (
            <Button
              variant="text"
              size="small"
              onClick={action.onClick}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {action.label}
            </Button>
          )
        }
        sx={{
          borderRadius: 1,
          ...sx,
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
        {message}
      </Alert>
    );
  }

  // Page variant - full-page error display
  if (variant === 'page') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 3,
          backgroundColor: 'background.default',
          ...sx,
        }}
      >
        <Stack spacing={3} alignItems="center" sx={{ maxWidth: 480, textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 4,
              bgcolor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {message}
          </Typography>
          {action && (
            <Button
              variant="filled"
              onClick={action.onClick}
              sx={{ minWidth: 160 }}
            >
              {action.label}
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  // Card variant (default) - error display in a card
  return (
    <Box sx={{ padding: 3, ...sx }}>
      <Card
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'error.light',
          backgroundColor: 'background.paper',
        }}
      >
        <CardContent>
          <Stack spacing={2.5} alignItems="center" sx={{ padding: 2 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WarningIcon sx={{ fontSize: 32, color: 'error.main' }} />
            </Box>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary', 
                textAlign: 'center',
                maxWidth: 400,
              }}
            >
              {message}
            </Typography>
            {action && (
              <Button
                variant="filled"
                onClick={action.onClick}
                sx={{ marginTop: 1 }}
              >
                {action.label}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ErrorState;
