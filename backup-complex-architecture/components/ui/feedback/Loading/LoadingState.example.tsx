import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { LoadingState } from './LoadingSpinner';

/**
 * Example usage of LoadingState component variants
 */
export const LoadingStateExample: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        LoadingState Component Examples
      </Typography>
      
      <Stack spacing={4}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Spinner Variant (Default)
          </Typography>
          <Stack spacing={2}>
            <LoadingState size="small" text="Loading..." />
            <LoadingState size="medium" text="Loading data..." />
            <LoadingState size="large" text="Processing request..." />
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Skeleton Variant
          </Typography>
          <Stack spacing={2}>
            <LoadingState variant="skeleton" size="small" />
            <LoadingState variant="skeleton" size="medium" text="Loading content..." />
            <LoadingState variant="skeleton" size="large" />
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Progress Variant
          </Typography>
          <Stack spacing={2}>
            <LoadingState variant="progress" size="small" text="Uploading..." />
            <LoadingState variant="progress" size="medium" text="Processing..." />
            <LoadingState variant="progress" size="large" text="Downloading..." />
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Full Height Example
          </Typography>
          <Box sx={{ height: 200, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <LoadingState fullHeight text="Loading page..." />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default LoadingStateExample;