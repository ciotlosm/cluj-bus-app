import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { materialTheme } from '../../../../theme/materialTheme';
import { Button } from './Button';

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={materialTheme}>
    {children}
  </ThemeProvider>
);

describe('Button Component', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <Button>Click me</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  it('renders with filled variant', () => {
    render(
      <TestWrapper>
        <Button variant="filled">Filled Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Filled Button' });
    expect(button).toBeInTheDocument();
  });

  it('renders with outlined variant', () => {
    render(
      <TestWrapper>
        <Button variant="outlined">Outlined Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Outlined Button' });
    expect(button).toBeInTheDocument();
  });

  it('renders with text variant', () => {
    render(
      <TestWrapper>
        <Button variant="text">Text Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Text Button' });
    expect(button).toBeInTheDocument();
  });

  it('renders with tonal variant', () => {
    render(
      <TestWrapper>
        <Button variant="tonal">Tonal Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Tonal Button' });
    expect(button).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    render(
      <TestWrapper>
        <Button size="small">Small</Button>
        <Button size="medium">Medium</Button>
        <Button size="large">Large</Button>
      </TestWrapper>
    );
    
    expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument();
  });

  it('renders with different colors', () => {
    render(
      <TestWrapper>
        <Button color="primary">Primary</Button>
        <Button color="secondary">Secondary</Button>
        <Button color="success">Success</Button>
        <Button color="warning">Warning</Button>
        <Button color="error">Error</Button>
      </TestWrapper>
    );
    
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Success' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Warning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Error' })).toBeInTheDocument();
  });

  it('shows isLoading state', () => {
    render(
      <TestWrapper>
        <Button loading>Loading Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Loading Button' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    // Check for isLoading spinner
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with icon', () => {
    const TestIcon = () => <span data-testid="test-icon">🚀</span>;
    
    render(
      <TestWrapper>
        <Button icon={<TestIcon />}>With Icon</Button>
      </TestWrapper>
    );
    
    expect(screen.getByRole('button', { name: '🚀 With Icon' })).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders full width', () => {
    render(
      <TestWrapper>
        <Button fullWidth>Full Width Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Full Width Button' });
    expect(button).toBeInTheDocument();
  });

  it('handles isDisabled state', () => {
    render(
      <TestWrapper>
        <Button disabled>Disabled Button</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
  });
});