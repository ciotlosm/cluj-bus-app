import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { renderHook, RenderHookOptions } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Custom render function for testing React components with providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  // For now, we'll use a simple wrapper. This can be extended later
  // to include providers like theme, router, etc.
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * Custom renderHook function for testing React hooks with providers
 */
export const renderHookWithProviders = <TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return renderHook(hook, { wrapper: AllTheProviders, ...options });
};

/**
 * Utility to wait for async operations in tests
 */
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock console methods for testing
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  return originalConsole;
};

/**
 * Create a mock function that tracks calls and arguments
 */
export const createMockFn = <T extends (...args: any[]) => any>(
  implementation?: T
) => {
  return vi.fn(implementation);
};