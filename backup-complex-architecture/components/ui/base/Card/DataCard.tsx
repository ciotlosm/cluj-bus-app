import React from 'react';
import {
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Avatar,
} from '@mui/material';
import { Card } from './BaseCard';
import { useThemeUtils, useMuiUtils } from '../../../../hooks';

// Data Card Component Props
export interface DataCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  error?: boolean;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
  isLoading?: boolean;
}

// Data Card Component - Enhanced card with header, status, and actions
export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  icon,
  actions,
  status,
  isLoading = false,
  error = false,
  variant = 'elevated',
  padding = 'medium',
  children,
}) => {
  const { getStatusColors, alpha, theme } = useThemeUtils();
  const { getAvatarStyles } = useMuiUtils();

  const statusColors = getStatusColors();
  const statusColor = status ? statusColors[status] : null;

  return (
    <Card variant={variant} padding={padding} isLoading={isLoading} hasError={error}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && (
            <Avatar
              sx={{
                ...getAvatarStyles('primary', 40),
                bgcolor: statusColor ? statusColor.light : alpha(theme.palette.primary.main, 0.1),
                color: statusColor ? statusColor.main : theme.palette.primary.main,
                mr: 2,
              }}
            >
              {icon}
            </Avatar>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {status && (
            <Chip
              label={status}
              size="small"
              sx={{
                bgcolor: statusColor?.light,
                color: statusColor?.main,
                border: `1px solid ${statusColor?.border}`,
                textTransform: 'capitalize',
              }}
            />
          )}
        </Box>
        {children}
      </CardContent>
      {actions && (
        <CardActions sx={{ pt: 0 }}>
          {actions}
        </CardActions>
      )}
    </Card>
  );
};

export default DataCard;