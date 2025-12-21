import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  AlertTitle,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { Button } from '../../base/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import type { CentralizedErrorState, ErrorRecoveryAction } from '../../../../hooks/shared/useCentralizedErrorHandler';

/**
 * Centralized error display component props
 */
export interface CentralizedErrorDisplayProps {
  /** Error state from centralized error handler */
  errorState: CentralizedErrorState;
  /** Display variant */
  variant?: 'inline' | 'card' | 'page';
  /** Show severity indicator */
  showSeverity?: boolean;
  /** Show timestamp */
  showTimestamp?: boolean;
  /** Maximum number of recovery actions to show */
  maxRecoveryActions?: number;
  /** Custom styling */
  sx?: SxProps<Theme>;
  /** Custom error title override */
  title?: string;
  /** Hide recovery actions */
  hideRecoveryActions?: boolean;
}

/**
 * Get severity color and icon
 */
const getSeverityConfig = (severity: CentralizedErrorState['severity']) => {
  switch (severity) {
    case 'critical':
      return {
        color: 'error' as const,
        icon: <ErrorIcon />,
        chipColor: 'error' as const,
      };
    case 'high':
      return {
        color: 'warning' as const,
        icon: <WarningIcon />,
        chipColor: 'warning' as const,
      };
    case 'medium':
      return {
        color: 'info' as const,
        icon: <InfoIcon />,
        chipColor: 'info' as const,
      };
    case 'low':
      return {
        color: 'success' as const,
        icon: <SuccessIcon />,
        chipColor: 'success' as const,
      };
    default:
      return {
        color: 'error' as const,
        icon: <ErrorIcon />,
        chipColor: 'error' as const,
      };
  }
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else {
    return timestamp.toLocaleTimeString();
  }
};

/**
 * Recovery actions component
 */
const RecoveryActions: React.FC<{
  actions: ErrorRecoveryAction[];
  maxActions?: number;
  variant: 'inline' | 'card' | 'page';
}> = ({ actions, maxActions = 3, variant }) => {
  const displayActions = actions.slice(0, maxActions);
  
  if (displayActions.length === 0) return null;

  const buttonSize = variant === 'inline' ? 'small' : 'medium';
  const spacing = variant === 'inline' ? 1 : 2;

  return (
    <Stack direction="row" spacing={spacing} flexWrap="wrap">
      {displayActions.map((action, index) => (
        <Button
          key={`${action.label}-${index}`}
          variant={action.variant === 'secondary' ? 'outlined' : 'filled'}
          size={buttonSize}
          onClick={action.action}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {action.label}
        </Button>
      ))}
    </Stack>
  );
};

/**
 * Centralized error display component
 * Provides consistent error display patterns with recovery actions
 * Integrates with centralized error handling system
 * 
 * Validates Requirements: 7.2, 7.4, 7.5
 */
export const CentralizedErrorDisplay: React.FC<CentralizedErrorDisplayProps> = ({
  errorState,
  variant = 'card',
  showSeverity = true,
  showTimestamp = false,
  maxRecoveryActions = 3,
  sx,
  title,
  hideRecoveryActions = false,
}) => {
  const severityConfig = getSeverityConfig(errorState.severity);
  const displayTitle = title || getDefaultTitle(errorState.severity);

  // Inline variant - compact error display using Alert
  if (variant === 'inline') {
    return (
      <Alert
        severity={severityConfig.color}
        icon={severityConfig.icon}
        action={
          !hideRecoveryActions && errorState.recoveryActions.length > 0 ? (
            <RecoveryActions
              actions={errorState.recoveryActions}
              maxActions={maxRecoveryActions}
              variant="inline"
            />
          ) : undefined
        }
        sx={{
          borderRadius: 1,
          ...sx,
        }}
      >
        <AlertTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          {displayTitle}
          {showSeverity && (
            <Chip
              label={errorState.severity.toUpperCase()}
              size="small"
              color={severityConfig.chipColor}
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </AlertTitle>
        <Box>
          {errorState.displayMessage}
          {showTimestamp && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
              {formatTimestamp(errorState.timestamp)}
            </Typography>
          )}
        </Box>
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
              bgcolor: `${severityConfig.color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(severityConfig.icon, {
              sx: { fontSize: 40, color: `${severityConfig.color}.main` }
            })}
          </Box>
          
          <Stack spacing={1} alignItems="center">
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {displayTitle}
            </Typography>
            {showSeverity && (
              <Chip
                label={`${errorState.severity.toUpperCase()} ERROR`}
                color={severityConfig.chipColor}
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>
          
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {errorState.displayMessage}
          </Typography>
          
          {showTimestamp && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Occurred {formatTimestamp(errorState.timestamp)}
            </Typography>
          )}
          
          {!hideRecoveryActions && errorState.recoveryActions.length > 0 && (
            <RecoveryActions
              actions={errorState.recoveryActions}
              maxActions={maxRecoveryActions}
              variant="page"
            />
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
          borderColor: `${severityConfig.color}.light`,
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
                bgcolor: `${severityConfig.color}.light`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {React.cloneElement(severityConfig.icon, {
                sx: { fontSize: 32, color: `${severityConfig.color}.main` }
              })}
            </Box>
            
            <Stack spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {displayTitle}
              </Typography>
              {showSeverity && (
                <Chip
                  label={errorState.severity.toUpperCase()}
                  size="small"
                  color={severityConfig.chipColor}
                />
              )}
            </Stack>
            
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                maxWidth: 400,
              }}
            >
              {errorState.displayMessage}
            </Typography>
            
            {showTimestamp && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {formatTimestamp(errorState.timestamp)}
              </Typography>
            )}
            
            {!hideRecoveryActions && errorState.recoveryActions.length > 0 && (
              <RecoveryActions
                actions={errorState.recoveryActions}
                maxActions={maxRecoveryActions}
                variant="card"
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Get default title based on severity
 */
function getDefaultTitle(severity: CentralizedErrorState['severity']): string {
  switch (severity) {
    case 'critical':
      return 'Critical Error';
    case 'high':
      return 'Error';
    case 'medium':
      return 'Warning';
    case 'low':
      return 'Notice';
    default:
      return 'Error';
  }
}

export default CentralizedErrorDisplay;