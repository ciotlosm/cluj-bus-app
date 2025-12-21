import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LoadingState } from './LoadingSpinner';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingState', () => {
  it('renders spinner variant by default', () => {
    renderWithTheme(<LoadingState />);
    
    // Should render CircularProgress
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders with text when provided', () => {
    renderWithTheme(<LoadingState text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders skeleton variant correctly', () => {
    renderWithTheme(<LoadingState variant="skeleton" />);
    
    // Should render Skeleton components
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('renders progress variant correctly', () => {
    renderWithTheme(<LoadingState variant="progress" />);
    
    // Should render LinearProgress
    expect(document.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = renderWithTheme(<LoadingState size="small" />);
    
    let progress = document.querySelector('.MuiCircularProgress-root') as HTMLElement;
    expect(progress).toHaveAttribute('style', expect.stringContaining('width: 16px'));
    
    rerender(
      <ThemeProvider theme={theme}>
        <LoadingState size="large" />
      </ThemeProvider>
    );
    
    progress = document.querySelector('.MuiCircularProgress-root') as HTMLElement;
    expect(progress).toHaveAttribute('style', expect.stringContaining('width: 32px'));
  });

  it('applies fullHeight styling when specified', () => {
    renderWithTheme(<LoadingState fullHeight />);
    
    const container = document.querySelector('.MuiCircularProgress-root')?.parentElement;
    expect(container).toHaveStyle({ minHeight: '100%' });
  });
});