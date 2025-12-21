import React from 'react';
import {
  CardContent,
  CardActions,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import { Card } from './BaseCard';
import { useThemeUtils } from '../../../../hooks';

// Info Card Component Props (specialized variant)
export interface InfoCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  loading?: boolean;
  error?: boolean;
  isLoading?: boolean;
}

// Info Card Component - Specialized card for informational content
export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  actions,
  variant = 'elevated',
  padding = 'medium',
  isLoading = false,
  error = false,
}) => {
  const { alpha, theme } = useThemeUtils();
  
  return (
    <Card variant={variant} padding={padding} isLoading={isLoading} hasError={error} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && (
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                mr: 2,
                width: 40,
                height: 40,
              }}
            >
              {icon}
            </Avatar>
          )}
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
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

export default InfoCard;