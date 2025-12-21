import React from 'react';
import {
  Box,
  Container,
  Typography,
  Avatar,
  Paper,
  Stack,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Button } from '../../../ui';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const theme = useTheme();

  const features = [
    {
      icon: '🏠',
      title: 'Smart Directions',
      description: 'Automatically detects work and home routes',
      color: theme.palette.success.main,
    },
    {
      icon: '🔴',
      title: 'Live Updates',
      description: 'Real-time bus arrivals and delays',
      color: theme.palette.info.main,
    },
    {
      icon: '⭐',
      title: 'Favorites',
      description: 'Save your most used routes and stops',
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 50%, ${theme.palette.secondary.dark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          {/* Logo/Icon */}
          <Box sx={{ mb: 4 }}>
            <Avatar
              sx={{
                width: 96,
                height: 96,
                bgcolor: alpha('#ffffff', 0.2),
                backdropFilter: 'blur(10px)',
                mx: 'auto',
                mb: 3,
                fontSize: '2.5rem',
              }}
            >
              🚌
            </Avatar>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: 1,
              }}
            >
              Bus Tracker
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: alpha('#ffffff', 0.8),
                fontWeight: 400,
              }}
            >
              Your smart commute companion
            </Typography>
          </Box>

          {/* Features */}
          <Stack spacing={2} sx={{ mb: 4 }}>
            {features.map((feature, index) => (
              <Paper
                key={index}
                sx={{
                  bgcolor: alpha('#ffffff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#ffffff', 0.2)}`,
                  borderRadius: theme.custom.borderRadius.xl,
                  p: 2,
                  textAlign: 'left',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: feature.color,
                      fontSize: '0.875rem',
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: alpha('#ffffff', 0.8),
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>

          {/* Get Started Button */}
          <Button
            onClick={onGetStarted}
            variant="filled"
            size="large"
            isFullWidth
            sx={{
              bgcolor: 'white',
              color: theme.palette.primary.main,
              fontWeight: 600,
              py: 1.5,
              borderRadius: theme.custom.borderRadius.lg,
              boxShadow: `0 8px 24px ${alpha('#000000', 0.2)}`,
              '&:hover': {
                bgcolor: alpha('#ffffff', 0.9),
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 32px ${alpha('#000000', 0.3)}`,
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Get Started
          </Button>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: alpha('#ffffff', 0.7),
              mt: 2,
            }}
          >
            Powered by Tranzy.ai • Made with ❤️
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default WelcomeScreen;