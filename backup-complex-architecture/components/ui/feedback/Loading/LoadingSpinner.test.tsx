import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { materialTheme } from '../../../../theme/materialTheme';
import { LoadingSpinner } from './LoadingSpinner';

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={materialTheme}>
    {children}
  </ThemeProvider>
);

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(
      <TestWrapper>
        <LoadingSpinner />
      </TestWrapper>
    );
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with text', () => {
    const testText = 'Loading data...';
    render(
      <TestWrapper>
        <LoadingSpinner text={testText} />
      </TestWrapper>
    );
    
    const spinner = screen.getByRole('progressbar');
    const text = screen.getByText(testText);
    
    expect(spinner).toBeInTheDocument();
    expect(text).toBeInTheDocument();
  });

  it('should render different sizes', () => {
    const { rerender } = render(
      <TestWrapper>
        <LoadingSpinner size="small" />
      </TestWrapper>
    );
    
    let spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    
    rerender(
      <TestWrapper>
        <LoadingSpinner size="large" />
      </TestWrapper>
    );
    
    spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('should render different colors', () => {
    const { rerender } = render(
      <TestWrapper>
        <LoadingSpinner color="secondary" />
      </TestWrapper>
    );
    
    let spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    
    rerender(
      <TestWrapper>
        <LoadingSpinner color="error" />
      </TestWrapper>
    );
    
    spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with fullHeight', () => {
    render(
      <TestWrapper>
        <LoadingSpinner fullHeight />
      </TestWrapper>
    );
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });
});