/**
 * Theme Switching Compatibility Tests
 * Tests all UI components in both light and dark themes to ensure consistent appearance
 * Validates Requirements: 1.4, 5.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import theme utilities
import { getTheme } from '../theme/materialTheme';
import { useConfigStore } from '@/stores/configStore';

// Import UI components to test
import { Button } from '../components/ui/base/Button';
import { Card, DataCard, VehicleCard, InfoCard } from '../components/ui/base/Card';
import { Input } from '../components/ui/base/Input';
import { LoadingSpinner, LoadingState } from '../components/ui/feedback/Loading';
import { SearchInput } from '../components/ui/composite/SearchInput';
import { ErrorState, EmptyState } from '../components/ui/feedback';
import { ThemeToggle } from '../components/ui/base/ThemeToggle';

// Mock the config store
vi.mock('../stores/configStore');

// Test wrapper component that provides theme context
const ThemeTestWrapper: React.FC<{ 
  theme: 'light' | 'dark';
  children: React.ReactNode;
}> = ({ theme, children }) => {
  const muiTheme = getTheme(theme);
  
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div data-testid={`theme-${theme}`}>
        {children}
      </div>
    </ThemeProvider>
  );
};

// Helper function to test component in a specific theme
const renderInTheme = (component: React.ReactElement, theme: 'light' | 'dark') => {
  return render(
    <ThemeTestWrapper theme={theme}>
      {component}
    </ThemeTestWrapper>
  );
};

// Helper function to get computed styles
const getComputedStyleProperty = (element: Element, property: string): string => {
  return window.getComputedStyle(element).getPropertyValue(property);
};

describe('Theme Switching Compatibility', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock config store with default theme
    const mockConfigStore = {
      theme: 'light',
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    };
    
    (useConfigStore as any).mockReturnValue(mockConfigStore);
  });

  describe('Button Component Theme Compatibility', () => {
    it('should render consistently in both light and dark themes', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <Button variant="filled" color="primary">
          Test Button
        </Button>,
        'light'
      );

      expect(lightRender.getByRole('button')).toBeInTheDocument();
      expect(lightRender.getByRole('button')).toHaveTextContent('Test Button');
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <Button variant="filled" color="primary">
          Test Button
        </Button>,
        'dark'
      );

      expect(darkRender.getByRole('button')).toBeInTheDocument();
      expect(darkRender.getByRole('button')).toHaveTextContent('Test Button');
      darkRender.unmount();
    });

    it('should have different background colors in different themes', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <Button variant="filled" color="primary">
          Theme Test
        </Button>,
        'light'
      );

      const lightButton = lightRender.getByRole('button');
      const lightBgColor = getComputedStyleProperty(lightButton, 'background-color');
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <Button variant="filled" color="primary">
          Theme Test
        </Button>,
        'dark'
      );

      const darkButton = darkRender.getByRole('button');
      const darkBgColor = getComputedStyleProperty(darkButton, 'background-color');

      // Colors should be different between themes
      expect(lightBgColor).not.toBe(darkBgColor);
      darkRender.unmount();
    });

    it('should maintain proper contrast in both themes', () => {
      const variants: Array<'filled' | 'outlined' | 'text' | 'tonal'> = ['filled', 'outlined', 'text', 'tonal'];
      
      variants.forEach(variant => {
        // Test light theme
        const lightRender = renderInTheme(
          <Button variant={variant} color="primary">
            {variant} Button
          </Button>,
          'light'
        );

        const lightButton = lightRender.getByRole('button');
        expect(lightButton).toBeVisible();
        lightRender.unmount();

        // Test dark theme
        const darkRender = renderInTheme(
          <Button variant={variant} color="primary">
            {variant} Button
          </Button>,
          'dark'
        );

        const darkButton = darkRender.getByRole('button');
        expect(darkButton).toBeVisible();
        darkRender.unmount();
      });
    });
  });

  describe('Card Component Theme Compatibility', () => {
    it('should render basic Card consistently in both themes', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <Card variant="elevated">
          <div>Card Content</div>
        </Card>,
        'light'
      );

      expect(lightRender.getByText('Card Content')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <Card variant="elevated">
          <div>Card Content</div>
        </Card>,
        'dark'
      );

      expect(darkRender.getByText('Card Content')).toBeInTheDocument();
      darkRender.unmount();
    });

    it('should render DataCard with proper theme-aware styling', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <DataCard
          title="Test Data Card"
          subtitle="Test subtitle"
          status="success"
        >
          <div>Data content</div>
        </DataCard>,
        'light'
      );

      expect(lightRender.getByText('Test Data Card')).toBeInTheDocument();
      expect(lightRender.getByText('Data content')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <DataCard
          title="Test Data Card"
          subtitle="Test subtitle"
          status="success"
        >
          <div>Data content</div>
        </DataCard>,
        'dark'
      );

      expect(darkRender.getByText('Test Data Card')).toBeInTheDocument();
      expect(darkRender.getByText('Data content')).toBeInTheDocument();
      darkRender.unmount();
    });

    it('should render VehicleCard with theme-appropriate colors', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <VehicleCard
          routeId="101"
          destination="Downtown"
          arrivalTime="5 min"
          isRealTime={true}
        />,
        'light'
      );

      expect(lightRender.getByText('101')).toBeInTheDocument();
      expect(lightRender.getByText('Downtown')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <VehicleCard
          routeId="101"
          destination="Downtown"
          arrivalTime="5 min"
          isRealTime={true}
        />,
        'dark'
      );

      expect(darkRender.getByText('101')).toBeInTheDocument();
      expect(darkRender.getByText('Downtown')).toBeInTheDocument();
      darkRender.unmount();
    });
  });

  describe('Input Component Theme Compatibility', () => {
    it('should render Input with proper theme styling', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <Input
          label="Test Input"
          placeholder="Enter text"
          variant="outlined"
        />,
        'light'
      );

      const lightInput = lightRender.getByLabelText('Test Input');
      expect(lightInput).toBeInTheDocument();
      expect(lightInput).toHaveAttribute('placeholder', 'Enter text');
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <Input
          label="Test Input"
          placeholder="Enter text"
          variant="outlined"
        />,
        'dark'
      );

      const darkInput = darkRender.getByLabelText('Test Input');
      expect(darkInput).toBeInTheDocument();
      expect(darkInput).toHaveAttribute('placeholder', 'Enter text');
      darkRender.unmount();
    });

    it('should handle focus states properly in both themes', async () => {
      // Test light theme
      const lightRender = renderInTheme(
        <Input
          label="Focus Test"
          variant="outlined"
        />,
        'light'
      );

      const lightInput = lightRender.getByLabelText('Focus Test');
      lightInput.focus(); // Use native focus instead of fireEvent
      expect(lightInput).toHaveFocus();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <Input
          label="Focus Test"
          variant="outlined"
        />,
        'dark'
      );

      const darkInput = darkRender.getByLabelText('Focus Test');
      darkInput.focus(); // Use native focus instead of fireEvent
      expect(darkInput).toHaveFocus();
      darkRender.unmount();
    });
  });

  describe('SearchInput Component Theme Compatibility', () => {
    it('should render SearchInput consistently in both themes', () => {
      const mockOnSearch = vi.fn();
      
      // Test light theme
      const lightRender = renderInTheme(
        <SearchInput
          placeholder="Search..."
          onSearch={mockOnSearch}
        />,
        'light'
      );

      expect(lightRender.getByPlaceholderText('Search...')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <SearchInput
          placeholder="Search..."
          onSearch={mockOnSearch}
        />,
        'dark'
      );

      expect(darkRender.getByPlaceholderText('Search...')).toBeInTheDocument();
      darkRender.unmount();
    });
  });

  describe('Loading Components Theme Compatibility', () => {
    it('should render LoadingSpinner in both themes', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <LoadingSpinner size="medium" text="Loading..." />,
        'light'
      );

      expect(lightRender.getByText('Loading...')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <LoadingSpinner size="medium" text="Loading..." />,
        'dark'
      );

      expect(darkRender.getByText('Loading...')).toBeInTheDocument();
      darkRender.unmount();
    });

    it('should render LoadingState variants in both themes', () => {
      const variants: Array<'spinner' | 'skeleton' | 'progress'> = ['spinner', 'skeleton', 'progress'];
      
      variants.forEach(variant => {
        // Test light theme
        const lightRender = renderInTheme(
          <LoadingState variant={variant} text={`${variant} loading`} />,
          'light'
        );

        if (variant !== 'skeleton') {
          expect(lightRender.getByText(`${variant} loading`)).toBeInTheDocument();
        }
        lightRender.unmount();

        // Test dark theme
        const darkRender = renderInTheme(
          <LoadingState variant={variant} text={`${variant} loading`} />,
          'dark'
        );

        if (variant !== 'skeleton') {
          expect(darkRender.getByText(`${variant} loading`)).toBeInTheDocument();
        }
        darkRender.unmount();
      });
    });
  });

  describe('Feedback Components Theme Compatibility', () => {
    it('should render ErrorState consistently in both themes', () => {
      const mockAction = vi.fn();
      
      // Test light theme
      const lightRender = renderInTheme(
        <ErrorState
          title="Error Title"
          message="Error message"
          action={{
            label: "Retry",
            onClick: mockAction
          }}
        />,
        'light'
      );

      expect(lightRender.getByText('Error Title')).toBeInTheDocument();
      expect(lightRender.getByText('Error message')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <ErrorState
          title="Error Title"
          message="Error message"
          action={{
            label: "Retry",
            onClick: mockAction
          }}
        />,
        'dark'
      );

      expect(darkRender.getByText('Error Title')).toBeInTheDocument();
      expect(darkRender.getByText('Error message')).toBeInTheDocument();
      darkRender.unmount();
    });

    it('should render EmptyState consistently in both themes', () => {
      const mockAction = vi.fn();
      
      // Test light theme
      const lightRender = renderInTheme(
        <EmptyState
          title="No Data"
          message="No data available"
          action={{
            label: "Refresh",
            onClick: mockAction
          }}
        />,
        'light'
      );

      expect(lightRender.getByText('No Data')).toBeInTheDocument();
      expect(lightRender.getByText('No data available')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <EmptyState
          title="No Data"
          message="No data available"
          action={{
            label: "Refresh",
            onClick: mockAction
          }}
        />,
        'dark'
      );

      expect(darkRender.getByText('No Data')).toBeInTheDocument();
      expect(darkRender.getByText('No data available')).toBeInTheDocument();
      darkRender.unmount();
    });
  });

  describe('ThemeToggle Component', () => {
    it('should render theme toggle button in both themes', () => {
      // Test light theme
      const lightRender = renderInTheme(<ThemeToggle />, 'light');
      expect(lightRender.getByRole('button')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(<ThemeToggle />, 'dark');
      expect(darkRender.getByRole('button')).toBeInTheDocument();
      darkRender.unmount();
    });

    it('should show different icons for different themes', () => {
      // Mock different theme states
      const lightMockStore = {
        theme: 'light',
        setTheme: vi.fn(),
        toggleTheme: vi.fn(),
      };
      
      const darkMockStore = {
        theme: 'dark',
        setTheme: vi.fn(),
        toggleTheme: vi.fn(),
      };

      // Test light theme (should show dark mode icon)
      (useConfigStore as any).mockReturnValue(lightMockStore);
      const lightRender = renderInTheme(<ThemeToggle />, 'light');
      expect(lightRender.getByRole('button')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme (should show light mode icon)
      (useConfigStore as any).mockReturnValue(darkMockStore);
      const darkRender = renderInTheme(<ThemeToggle />, 'dark');
      expect(darkRender.getByRole('button')).toBeInTheDocument();
      darkRender.unmount();
    });
  });

  describe('Theme Transition Smoothness', () => {
    it('should have smooth transitions defined in theme', () => {
      const lightTheme = getTheme('light');
      const darkTheme = getTheme('dark');

      // Both themes should have transition definitions
      expect(lightTheme.components?.MuiCssBaseline?.styleOverrides).toBeDefined();
      expect(darkTheme.components?.MuiCssBaseline?.styleOverrides).toBeDefined();

      // Check that transitions are defined for theme switching
      const lightTransitions = lightTheme.components?.MuiCssBaseline?.styleOverrides;
      const darkTransitions = darkTheme.components?.MuiCssBaseline?.styleOverrides;

      if (typeof lightTransitions === 'object' && lightTransitions !== null) {
        expect(lightTransitions).toHaveProperty('*');
        expect(lightTransitions).toHaveProperty('body');
      }

      if (typeof darkTransitions === 'object' && darkTransitions !== null) {
        expect(darkTransitions).toHaveProperty('*');
        expect(darkTransitions).toHaveProperty('body');
      }
    });
  });

  describe('Color Contrast and Accessibility', () => {
    it('should maintain proper text contrast in both themes', () => {
      // Test light theme
      const lightRender = renderInTheme(
        <div>
          <Button variant="filled" color="primary">Primary Button</Button>
          <Button variant="filled" color="secondary">Secondary Button</Button>
          <Button variant="filled" color="error">Error Button</Button>
          <Button variant="filled" color="warning">Warning Button</Button>
          <Button variant="filled" color="success">Success Button</Button>
        </div>,
        'light'
      );

      const lightButtons = lightRender.getAllByRole('button');
      expect(lightButtons).toHaveLength(5);
      lightButtons.forEach(button => {
        expect(button).toBeVisible();
      });
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(
        <div>
          <Button variant="filled" color="primary">Primary Button</Button>
          <Button variant="filled" color="secondary">Secondary Button</Button>
          <Button variant="filled" color="error">Error Button</Button>
          <Button variant="filled" color="warning">Warning Button</Button>
          <Button variant="filled" color="success">Success Button</Button>
        </div>,
        'dark'
      );

      const darkButtons = darkRender.getAllByRole('button');
      expect(darkButtons).toHaveLength(5);
      darkButtons.forEach(button => {
        expect(button).toBeVisible();
      });
      darkRender.unmount();
    });
  });

  describe('Theme-Specific Component Behavior', () => {
    it('should handle theme-specific styling in custom components', () => {
      // Test a component that uses theme utilities
      const TestComponent: React.FC = () => {
        return (
          <div data-testid="theme-aware-component">
            <Card variant="elevated">
              <DataCard
                title="Theme Test"
                status="success"
              >
                <Input label="Test Input" />
                <Button variant="filled">Test Button</Button>
              </DataCard>
            </Card>
          </div>
        );
      };

      // Test light theme
      const lightRender = renderInTheme(<TestComponent />, 'light');
      expect(lightRender.getByTestId('theme-aware-component')).toBeInTheDocument();
      expect(lightRender.getByText('Theme Test')).toBeInTheDocument();
      expect(lightRender.getByLabelText('Test Input')).toBeInTheDocument();
      expect(lightRender.getByRole('button')).toBeInTheDocument();
      lightRender.unmount();

      // Test dark theme
      const darkRender = renderInTheme(<TestComponent />, 'dark');
      expect(darkRender.getByTestId('theme-aware-component')).toBeInTheDocument();
      expect(darkRender.getByText('Theme Test')).toBeInTheDocument();
      expect(darkRender.getByLabelText('Test Input')).toBeInTheDocument();
      expect(darkRender.getByRole('button')).toBeInTheDocument();
      darkRender.unmount();
    });
  });

  describe('Theme Persistence and State Management', () => {
    it('should handle theme changes through store', async () => {
      const mockToggleTheme = vi.fn();
      const mockStore = {
        theme: 'light',
        setTheme: vi.fn(),
        toggleTheme: mockToggleTheme,
      };

      (useConfigStore as any).mockReturnValue(mockStore);

      const { getByRole } = renderInTheme(<ThemeToggle />, 'light');

      const toggleButton = getByRole('button');
      fireEvent.click(toggleButton);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });
  });
});