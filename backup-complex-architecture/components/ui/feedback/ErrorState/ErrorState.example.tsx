import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ErrorState } from './ErrorState';

/**
 * Example usage of ErrorState component variants
 */
export const ErrorStateExample: React.FC = () => {
  const handleRetry = () => {
    // Retry action
  };

  const handleGoHome = () => {
    // Go home action
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        ErrorState Component Examples
      </Typography>
      
      <Stack spacing={4}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Inline Variant
          </Typography>
          <ErrorState
            variant="inline"
            title="Connection Failed"
            message="Unable to connect to the server. Please check your internet connection."
            action={{
              label: 'Retry',
              onClick: handleRetry,
            }}
          />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Card Variant (Default)
          </Typography>
          <ErrorState
            title="Data Loading Error"
            message="We encountered an error while isLoading your data. This might be due to a temporary server issue."
            action={{
              label: 'Try Again',
              onClick: handleRetry,
            }}
          />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Page Variant
          </Typography>
          <Box sx={{ height: 400, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <ErrorState
              variant="page"
              title="Page Not Found"
              message="The page you're looking for doesn't exist or has been moved."
              action={{
                label: 'Go Home',
                onClick: handleGoHome,
              }}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default ErrorStateExample;