// AppLayout - Basic layout component (< 50 lines)
// Uses Material-UI directly without wrappers

import type { FC, ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bus Tracker
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container 
        component="main" 
        maxWidth="lg" 
        sx={{ 
          flexGrow: 1, 
          py: 2,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Container>
    </Box>
  );
};