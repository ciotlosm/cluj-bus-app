import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { materialTheme } from '../../../../theme/materialTheme';
import { Card, CardLoadingStateComponent as LoadingState, CardErrorStateComponent as ErrorState, DataCard, VehicleCard, InfoCard } from './Card';
import { DirectionsBus } from '@mui/icons-material';

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={materialTheme}>
    {children}
  </ThemeProvider>
);

describe('Card Components', () => {
  describe('Base Card Component', () => {
    it('should render children correctly', () => {
      render(
        <TestWrapper>
          <Card>
            <div>Test content</div>
          </Card>
        </TestWrapper>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render isLoading state when isLoading prop is true', () => {
      render(
        <TestWrapper>
          <Card loading>
            <div>Test content</div>
          </Card>
        </TestWrapper>
      );
      
      // Should show skeleton isLoading instead of content
      expect(screen.queryByText('Test content')).not.toBeInTheDocument();
    });

    it('should render error state when error prop is true', () => {
      render(
        <TestWrapper>
          <Card error>
            <div>Test content</div>
          </Card>
        </TestWrapper>
      );
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('LoadingState Component', () => {
    it('should render spinner variant by default', () => {
      render(
        <TestWrapper>
          <LoadingState />
        </TestWrapper>
      );
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render skeleton variant', () => {
      const { container } = render(
        <TestWrapper>
          <LoadingState variant="skeleton" />
        </TestWrapper>
      );
      
      // Skeleton elements should be present
      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render text when provided', () => {
      render(
        <TestWrapper>
          <LoadingState text="Loading data..." />
        </TestWrapper>
      );
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  describe('ErrorState Component', () => {
    it('should render title and message', () => {
      render(
        <TestWrapper>
          <ErrorState title="Test Error" message="Test error message" />
        </TestWrapper>
      );
      
      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('DataCard Component', () => {
    it('should render title and children', () => {
      render(
        <TestWrapper>
          <DataCard title="Test Data Card">
            <div>Card content</div>
          </DataCard>
        </TestWrapper>
      );
      
      expect(screen.getByText('Test Data Card')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <TestWrapper>
          <DataCard title="Test Card" subtitle="Test subtitle">
            <div>Content</div>
          </DataCard>
        </TestWrapper>
      );
      
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should render status chip when status is provided', () => {
      render(
        <TestWrapper>
          <DataCard title="Test Card" status="success">
            <div>Content</div>
          </DataCard>
        </TestWrapper>
      );
      
      expect(screen.getByText('success')).toBeInTheDocument();
    });
  });

  describe('VehicleCard Component', () => {
    it('should render route ID and arrival time', () => {
      render(
        <TestWrapper>
          <VehicleCard routeId="24" arrivalTime="5 min" />
        </TestWrapper>
      );
      
      expect(screen.getByText('24')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
    });

    it('should render destination when provided', () => {
      render(
        <TestWrapper>
          <VehicleCard 
            routeId="24" 
            arrivalTime="5 min" 
            destination="Central Station"
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('Central Station')).toBeInTheDocument();
    });
  });

  describe('InfoCard Component', () => {
    it('should render title and children', () => {
      render(
        <TestWrapper>
          <InfoCard title="Information Card">
            <div>Info content</div>
          </InfoCard>
        </TestWrapper>
      );
      
      expect(screen.getByText('Information Card')).toBeInTheDocument();
      expect(screen.getByText('Info content')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      render(
        <TestWrapper>
          <InfoCard 
            title="Info Card" 
            icon={<DirectionsBus data-testid="bus-icon" />}
          >
            <div>Content</div>
          </InfoCard>
        </TestWrapper>
      );
      
      expect(screen.getByTestId('bus-icon')).toBeInTheDocument();
    });
  });
});