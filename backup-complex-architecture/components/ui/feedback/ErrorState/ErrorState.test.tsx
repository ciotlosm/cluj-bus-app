import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { ErrorState } from './ErrorState';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ErrorState', () => {
  const defaultProps = {
    title: 'Test Error',
    message: 'This is a test error message',
  };

  it('renders error title and message', () => {
    renderWithTheme(<ErrorState {...defaultProps} />);
    
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const mockAction = {
      label: 'Retry',
      onClick: vi.fn(),
    };

    renderWithTheme(
      <ErrorState 
        {...defaultProps} 
        action={mockAction}
      />
    );
    
    const button = screen.getByText('Retry');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('renders inline variant correctly', () => {
    renderWithTheme(
      <ErrorState 
        {...defaultProps} 
        variant="inline"
      />
    );
    
    // Should render as an Alert component
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders page variant correctly', () => {
    renderWithTheme(
      <ErrorState 
        {...defaultProps} 
        variant="page"
      />
    );
    
    // Page variant should have full height styling
    const container = screen.getByText('Test Error').closest('div');
    expect(container).toHaveStyle({ textAlign: 'center' });
  });

  it('renders card variant by default', () => {
    renderWithTheme(<ErrorState {...defaultProps} />);
    
    // Should render within a card structure
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
  });
});