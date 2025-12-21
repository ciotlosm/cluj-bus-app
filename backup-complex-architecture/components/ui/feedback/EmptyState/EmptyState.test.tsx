import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { EmptyState } from './EmptyState';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EmptyState', () => {
  const defaultProps = {
    title: 'No Data',
    message: 'No data available at this time',
  };

  it('renders default variant correctly', () => {
    renderWithTheme(
      <EmptyState
        {...defaultProps}
        variant="default"
      />
    );

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('No data available at this time')).toBeInTheDocument();
  });

  it('renders minimal variant correctly', () => {
    renderWithTheme(
      <EmptyState
        {...defaultProps}
        variant="minimal"
      />
    );

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('No data available at this time')).toBeInTheDocument();
  });

  it('renders favorites variant correctly', () => {
    renderWithTheme(
      <EmptyState
        title="No nearby stations"
        message="No stations found that serve your favorite routes"
        variant="favorites"
      />
    );

    expect(screen.getByText('No nearby stations')).toBeInTheDocument();
    expect(screen.getByText('No stations found that serve your favorite routes')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const customIcon = <div data-testid="custom-icon">Custom Icon</div>;
    
    renderWithTheme(
      <EmptyState
        {...defaultProps}
        icon={customIcon}
        variant="default"
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const mockAction = {
      label: 'Add Data',
      onClick: vi.fn(),
    };

    renderWithTheme(
      <EmptyState 
        {...defaultProps}
        action={mockAction}
      />
    );
    
    const button = screen.getByText('Add Data');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('renders action button in minimal variant', () => {
    const mockAction = {
      label: 'Try Again',
      onClick: vi.fn(),
    };

    renderWithTheme(
      <EmptyState 
        {...defaultProps}
        variant="minimal"
        action={mockAction}
      />
    );
    
    const button = screen.getByText('Try Again');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockAction.onClick).toHaveBeenCalledTimes(1);
  });
});