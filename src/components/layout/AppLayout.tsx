// AppLayout - Basic layout component with integrated Header
// Uses Material-UI directly without wrappers

import type { FC, ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  const handleSettingsClick = () => {
    // TODO: Implement settings navigation
    console.log('Settings clicked');
  };

  const handleGpsStatusClick = () => {
    // TODO: Implement GPS status details
    console.log('GPS status clicked');
  };

  const handleApiStatusClick = () => {
    // TODO: Implement API status details
    console.log('API status clicked');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header 
        onSettingsClick={handleSettingsClick}
        onGpsStatusClick={handleGpsStatusClick}
        onApiStatusClick={handleApiStatusClick}
      />
      
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