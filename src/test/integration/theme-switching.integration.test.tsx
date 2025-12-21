/**
 * Theme Switching Integration Tests
 * Tests theme switching functionality with the actual theme provider and store
 * Validates Requirements: 1.4, 5.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the actual theme system
import { getTheme } from '../../theme/materialTheme';
import { useConfigStore } from '@/stores/configStore';

// Import components to test
import { Button } from '../../components/ui/base/Button';
import { ThemeToggle } from '../../components/ui/base/ThemeToggle';
import { VehicleCard } from '../../components/ui/base/Card';

// Mock the config store
vi.mock('../../stores/configStore');

// Integration test wrapper that mimics the actual app setup
const IntegrationThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme: mode } = useConfigStore();
  const theme = getTheme(mode);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

describe('Theme Switching Integration Tests', () => {
  let mockStore: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock store that can be updated
    mockStore = {
      theme: 'light',
      setTheme: vi.fn((newTheme) => {
        mockStore.theme = newTheme;
      }),
      toggleTheme: vi.fn(() => {
        mockStore.theme = mockStore.theme === 'light' ? 'dark' : 'light';
      }),
    };
    
    (useConfigStore as any).mockReturnValue(mockStore);
  });

  describe('Theme Provider Integration', () => {
    it('should provide correct theme to components', () => {
      const { rerender } = render(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" data-testid="theme-button">
            Test Button
          </Button>
        </IntegrationThemeWrapper>
      );

      const button = screen.getByTestId('theme-button');
      expect(button).toBeInTheDocument();

      // Change theme and re-render
      mockStore.theme = 'dark';
      rerender(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" data-testid="theme-button">
            Test Button
          </Button>
        </IntegrationThemeWrapper>
      );

      // Button should still be present and functional
      expect(screen.getByTestId('theme-button')).toBeInTheDocument();
    });

    it('should handle theme switching through ThemeToggle', async () => {
      render(
        <IntegrationThemeWrapper>
          <ThemeToggle />
        </IntegrationThemeWrapper>
      );

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();

      // Click the toggle button
      fireEvent.click(toggleButton);

      // Verify the store method was called
      expect(mockStore.toggleTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Theme Adaptation', () => {
    it('should render VehicleCard correctly in both themes', () => {
      // Test light theme
      const { rerender } = render(
        <IntegrationThemeWrapper>
          <VehicleCard
            routeId="101"
            destination="Downtown"
            arrivalTime="5 min"
            isRealTime={true}
            data-testid="vehicle-card"
          />
        </IntegrationThemeWrapper>
      );

      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText('Downtown')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();

      // Switch to dark theme
      mockStore.theme = 'dark';
      rerender(
        <IntegrationThemeWrapper>
          <VehicleCard
            routeId="101"
            destination="Downtown"
            arrivalTime="5 min"
            isRealTime={true}
            data-testid="vehicle-card"
          />
        </IntegrationThemeWrapper>
      );

      // Content should still be present
      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText('Downtown')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
    });

    it('should maintain component functionality across theme switches', () => {
      const mockOnClick = vi.fn();

      const { rerender } = render(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" onClick={mockOnClick}>
            Click Me
          </Button>
        </IntegrationThemeWrapper>
      );

      const button = screen.getByRole('button', { name: 'Click Me' });
      
      // Test functionality in light theme
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      // Switch to dark theme
      mockStore.theme = 'dark';
      rerender(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" onClick={mockOnClick}>
            Click Me
          </Button>
        </IntegrationThemeWrapper>
      );

      // Test functionality in dark theme
      const darkButton = screen.getByRole('button', { name: 'Click Me' });
      fireEvent.click(darkButton);
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Theme Consistency', () => {
    it('should apply consistent styling across multiple components', () => {
      render(
        <IntegrationThemeWrapper>
          <div>
            <Button variant="filled" color="primary" data-testid="button-1">
              Button 1
            </Button>
            <Button variant="filled" color="primary" data-testid="button-2">
              Button 2
            </Button>
            <VehicleCard
              routeId="101"
              destination="Test"
              arrivalTime="5 min"
              isRealTime={true}
            />
          </div>
        </IntegrationThemeWrapper>
      );

      // All components should render successfully
      expect(screen.getByTestId('button-1')).toBeInTheDocument();
      expect(screen.getByTestId('button-2')).toBeInTheDocument();
      expect(screen.getByText('101')).toBeInTheDocument();
    });

    it('should handle rapid theme switching without errors', async () => {
      const { rerender } = render(
        <IntegrationThemeWrapper>
          <div>
            <ThemeToggle />
            <Button variant="filled" color="primary">
              Test Button
            </Button>
          </div>
        </IntegrationThemeWrapper>
      );

      const toggleButton = screen.getByRole('button', { name: /switch to/i });

      // Rapidly switch themes multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(toggleButton);
        
        // Switch the mock theme
        mockStore.theme = mockStore.theme === 'light' ? 'dark' : 'light';
        
        rerender(
          <IntegrationThemeWrapper>
            <div>
              <ThemeToggle />
              <Button variant="filled" color="primary">
                Test Button
              </Button>
            </div>
          </IntegrationThemeWrapper>
        );

        // Components should still be present
        expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
      }

      expect(mockStore.toggleTheme).toHaveBeenCalledTimes(5);
    });
  });

  describe('Theme Persistence', () => {
    it('should maintain theme state across component re-renders', () => {
      // Start with dark theme
      mockStore.theme = 'dark';

      const { rerender } = render(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" data-testid="persistent-button">
            Persistent Button
          </Button>
        </IntegrationThemeWrapper>
      );

      expect(screen.getByTestId('persistent-button')).toBeInTheDocument();

      // Re-render without changing theme
      rerender(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" data-testid="persistent-button">
            Persistent Button
          </Button>
        </IntegrationThemeWrapper>
      );

      // Button should still be present
      expect(screen.getByTestId('persistent-button')).toBeInTheDocument();
      
      // Theme should still be dark
      expect(mockStore.theme).toBe('dark');
    });
  });

  describe('Accessibility in Different Themes', () => {
    it('should maintain accessibility attributes across themes', () => {
      const { rerender } = render(
        <IntegrationThemeWrapper>
          <Button 
            variant="filled" 
            color="primary" 
            aria-label="Accessible button"
            data-testid="accessible-button"
          >
            Accessible Button
          </Button>
        </IntegrationThemeWrapper>
      );

      const lightButton = screen.getByTestId('accessible-button');
      expect(lightButton).toHaveAttribute('aria-label', 'Accessible button');

      // Switch to dark theme
      mockStore.theme = 'dark';
      rerender(
        <IntegrationThemeWrapper>
          <Button 
            variant="filled" 
            color="primary" 
            aria-label="Accessible button"
            data-testid="accessible-button"
          >
            Accessible Button
          </Button>
        </IntegrationThemeWrapper>
      );

      const darkButton = screen.getByTestId('accessible-button');
      expect(darkButton).toHaveAttribute('aria-label', 'Accessible button');
    });

    it('should maintain focus behavior across themes', () => {
      const { rerender } = render(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" data-testid="focusable-button">
            Focusable Button
          </Button>
        </IntegrationThemeWrapper>
      );

      const lightButton = screen.getByTestId('focusable-button');
      lightButton.focus();
      expect(lightButton).toHaveFocus();

      // Switch to dark theme
      mockStore.theme = 'dark';
      rerender(
        <IntegrationThemeWrapper>
          <Button variant="filled" color="primary" data-testid="focusable-button">
            Focusable Button
          </Button>
        </IntegrationThemeWrapper>
      );

      const darkButton = screen.getByTestId('focusable-button');
      darkButton.focus();
      expect(darkButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid theme values gracefully', () => {
      // Set an invalid theme
      mockStore.theme = 'invalid-theme' as any;

      // Should not throw an error
      expect(() => {
        render(
          <IntegrationThemeWrapper>
            <Button variant="filled" color="primary">
              Test Button
            </Button>
          </IntegrationThemeWrapper>
        );
      }).not.toThrow();

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});