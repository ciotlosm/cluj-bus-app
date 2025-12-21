import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect } from 'vitest';
import { materialTheme } from '../../../../theme/materialTheme';
import { Input } from './Input';

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={materialTheme}>
    {children}
  </ThemeProvider>
);

describe('Input Component', () => {
  it('should render with Material-UI TextField', () => {
    render(
      <TestWrapper>
        <Input label="Test Input" />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
  });

  it('should render with outlined variant by default', () => {
    render(
      <TestWrapper>
        <Input label="Test Input" />
      </TestWrapper>
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toBeInTheDocument();
  });

  it('should render with filled variant when specified', () => {
    render(
      <TestWrapper>
        <Input label="Test Input" variant="filled" />
      </TestWrapper>
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toBeInTheDocument();
  });

  it('should render with left icon', () => {
    render(
      <TestWrapper>
        <Input 
          label="Test Input" 
          leftIcon={<span data-testid="left-icon">🔍</span>} 
        />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should render with right icon', () => {
    render(
      <TestWrapper>
        <Input 
          label="Test Input" 
          rightIcon={<span data-testid="right-icon">✓</span>} 
        />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <TestWrapper>
        <Input 
          label="Test Input" 
          error 
          helpText="This field is required" 
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should render helper text', () => {
    render(
      <TestWrapper>
        <Input 
          label="Test Input" 
          helpText="Enter your name" 
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });
});