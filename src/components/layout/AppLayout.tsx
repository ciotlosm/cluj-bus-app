// AppLayout - Basic layout component with integrated Header
// Uses Material-UI directly without wrappers

import type { FC, ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
  onNavigateToSettings?: () => void;
}

export const AppLayout: FC<AppLayoutProps> = ({ children, onNavigateToSettings }) => {
  const handleSettingsClick = () => {
    onNavigateToSettings?.();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header 
        onSettingsClick={handleSettingsClick}
      />
      
      <Container 
        component="main" 
        maxWidth="lg" 
        sx={{ 
          flexGrow: 1, 
          py: 2,
          pb: 8, // Add bottom padding for fixed bottom navigation (56px + 8px margin)
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Container>
    </Box>
  );
};