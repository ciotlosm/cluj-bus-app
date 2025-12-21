import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
} from '@mui/material';
import { DirectionsBus as BusIcon } from '@mui/icons-material';
import { Button } from '../../base/Button';
import type { SxProps, Theme } from '@mui/material/styles';

import type { StandardEmptyStateProps } from '../../../../types/componentProps';

/**
 * EmptyState component props with Material-UI integration
 * Implements consistent empty state display with optional actions
 * Follows standardized prop patterns for consistency
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1
 */
interface EmptyStateProps extends Omit<StandardEmptyStateProps, 'action'> {
  /** Empty state title */
  title: string;
  /** Empty state message */
  message: string;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Display variant */
  variant?: 'default' | 'minimal';
  /** Additional sx props for custom styling */
  sx?: SxProps<Theme>;
}

/**
 * EmptyState component using Material-UI components exclusively
 * Implements consistent empty state display with optional actions
 * Validates Requirements: 5.1, 7.1
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  variant = 'default',
  sx,
}) => {
  const defaultIcon = <BusIcon sx={{ fontSize: 28, color: 'text.secondary' }} />;
  
  // Minimal variant - simple text-based empty state
  if (variant === 'minimal') {
    return (
      <Box sx={{ 
        padding: 3, 
        textAlign: 'center',
        ...sx,
      }}>
        <Stack spacing={2} alignItems="center">
          {icon && (
            <Box sx={{ color: 'text.secondary' }}>
              {icon}
            </Box>
          )}
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
            {message}
          </Typography>
          {action && (
            <Button
              variant="text"
              onClick={action.onClick}
              sx={{ marginTop: 1 }}
            >
              {action.label}
            </Button>
          )}
        </Stack>
      </Box>
    );
  }
  


  // Default variant - standard empty state with card
  return (
    <Box sx={{ padding: 3, ...sx }}>
      <Card sx={{
        padding: 2,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Stack spacing={3} alignItems="center" sx={{ padding: 2 }}>
          <Box sx={{ 
            width: 64, 
            height: 64, 
            borderRadius: 3,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon || defaultIcon}
          </Box>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 400 }}>
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
      </Card>
    </Box>
  );
};

export default EmptyState;