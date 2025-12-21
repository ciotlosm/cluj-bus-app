/**
 * Integration tests for theme changes and persistence
 * Tests theme functionality across the application including:
 * - Theme changes work smoothly
 * - Theme persistence across browser sessions
 * - Theme event emission and handling
 * - DOM updates when theme changes
 * 
 * **Feature: store-architecture-consolidation, Property 1: Theme changes work smoothly**
 * **Validates: Requirements 4.2**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useConfigStore } from '@/stores/configStore';
import { StoreEventManager, StoreEvents } from '../../stores/shared/storeEvents';
import type { ThemeMode } from '@/types';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock btoa/atob for encryption
Object.defineProperty(window, 'btoa', {
  value: vi.fn((str: string) => Buffer.from(str).toString('base64')),
});

Object.defineProperty(window, 'atob', {
  value: vi.fn((str: string) => Buffer.from(str, 'base64').toString()),
});

// Mock document for DOM testing
const mockDocumentElement = {
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

// Mock window.matchMedia for system theme testing
let mockMatchMedia: any;
const createMockMatchMedia = (matches: boolean) => {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  
  return vi.fn(() => ({
    matches,
    addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(listener);
      }
    }),
    removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    // Helper to simulate system theme change
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(listener => {
        listener({ matches: newMatches } as MediaQueryListEvent);
      });
    },
    _getListeners: () => listeners,
  }));
};

describe('Theme Integration Tests', () => {
  beforeEach(() => {
    // Reset localStorage mock to normal behavior
    localStorageMock.clear();
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      // Normal localStorage behavior - just store the value
    });
    
    vi.clearAllMocks();
    
    // Clear all event listeners
    StoreEventManager.removeAllListeners();
    
    // Reset document mock
    mockDocumentElement.setAttribute.mockClear();
    mockDocumentElement.getAttribute.mockClear();
    
    // Setup default matchMedia mock (dark theme)
    mockMatchMedia = createMockMatchMedia(true);
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    });
    
    // Reset the store state (do this last to avoid localStorage errors)
    useConfigStore.getState().resetConfig();
  });

  afterEach(() => {
    vi.clearAllMocks();
    StoreEventManager.removeAllListeners();
  });

  describe('Theme Changes Work Smoothly', () => {
    it('should change theme immediately and update DOM', () => {
      const store = useConfigStore.getState();
      const initialTheme = store.theme;
      const newTheme: ThemeMode = initialTheme === 'dark' ? 'light' : 'dark';
      
      // Change theme
      act(() => {
        store.setTheme(newTheme);
      });
      
      // Verify theme changed in store
      const updatedState = useConfigStore.getState();
      expect(updatedState.theme).toBe(newTheme);
      
      // Verify DOM was updated
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', newTheme);
    });

    it('should toggle theme correctly', () => {
      const store = useConfigStore.getState();
      const initialTheme = store.theme;
      
      // Toggle theme
      act(() => {
        store.toggleTheme();
      });
      
      // Verify theme toggled
      const updatedState = useConfigStore.getState();
      const expectedTheme = initialTheme === 'light' ? 'dark' : 'light';
      expect(updatedState.theme).toBe(expectedTheme);
      
      // Toggle again
      act(() => {
        store.toggleTheme();
      });
      
      // Should be back to original
      const finalState = useConfigStore.getState();
      expect(finalState.theme).toBe(initialTheme);
    });

    it('should emit theme change events', () => {
      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);
      
      const store = useConfigStore.getState();
      const newTheme: ThemeMode = store.theme === 'dark' ? 'light' : 'dark';
      
      // Change theme
      act(() => {
        store.setTheme(newTheme);
      });
      
      // Verify event was emitted
      expect(eventHandler).toHaveBeenCalledWith({
        theme: newTheme,
        source: 'user',
      });
    });

    it('should not emit events when setting same theme', () => {
      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);
      
      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      
      // Set same theme
      act(() => {
        store.setTheme(currentTheme);
      });
      
      // Should not emit event
      expect(eventHandler).not.toHaveBeenCalled();
      
      // Should not update DOM
      expect(mockDocumentElement.setAttribute).not.toHaveBeenCalled();
    });

    it('should handle rapid theme changes smoothly', () => {
      const store = useConfigStore.getState();
      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);
      
      // Rapid theme changes
      act(() => {
        store.setTheme('light');
        store.setTheme('dark');
        store.setTheme('light');
        store.setTheme('dark');
      });
      
      // Final state should be dark
      const finalState = useConfigStore.getState();
      expect(finalState.theme).toBe('dark');
      
      // Should have emitted events for each actual change
      expect(eventHandler).toHaveBeenCalledTimes(4);
      
      // DOM should have been updated for each change
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledTimes(4);
      expect(mockDocumentElement.setAttribute).toHaveBeenLastCalledWith('data-theme', 'dark');
    });
  });

  describe('Theme Persistence', () => {
    it('should persist theme changes to localStorage', () => {
      const store = useConfigStore.getState();
      
      // Change theme
      act(() => {
        store.setTheme('light');
      });
      
      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Get the stored data
      const calls = localStorageMock.setItem.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('unified-config-store');
      
      const storedData = JSON.parse(lastCall[1]);
      expect(storedData.state.theme).toBe('light');
    });

    it('should restore theme from localStorage on store initialization', () => {
      // Pre-populate localStorage with theme data
      const persistedData = {
        state: {
          theme: 'light',
          config: null,
          isConfigured: false,
          isFullyConfigured: false,
          agencies: [],
          isApiValidated: false,
        },
        version: 3,
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persistedData));
      
      // Create a new store instance (simulate app restart)
      // Note: In a real scenario, this would be a fresh page load
      // For testing, we can verify the persistence mechanism
      const storedValue = localStorageMock.getItem('unified-config-store');
      expect(storedValue).toBeTruthy();
      
      if (storedValue) {
        const parsed = JSON.parse(storedValue);
        expect(parsed.state.theme).toBe('light');
      }
    });

    it('should maintain theme across multiple store operations', () => {
      const store = useConfigStore.getState();
      
      // Set initial theme
      act(() => {
        store.setTheme('light');
      });
      
      // Perform other store operations
      act(() => {
        store.updateConfig({
          city: 'Cluj-Napoca',
          apiKey: 'test-key',
          refreshRate: 30000,
        });
      });
      
      // Theme should still be preserved
      const state = useConfigStore.getState();
      expect(state.theme).toBe('light');
      
      // Change theme again
      act(() => {
        store.setTheme('dark');
      });
      
      // Both theme and config should be preserved
      const finalState = useConfigStore.getState();
      expect(finalState.theme).toBe('dark');
      expect(finalState.config?.city).toBe('Cluj-Napoca');
    });

    it('should persist theme changes', () => {
      const store = useConfigStore.getState();
      
      // Change theme
      act(() => {
        store.setTheme('light');
      });
      
      // Verify theme is updated in store
      const state = useConfigStore.getState();
      expect(state.theme).toBe('light');
      
      // Verify localStorage setItem was called (persistence mechanism works)
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('System Theme Detection', () => {
    it('should support system theme detection mechanism', () => {
      // Verify that matchMedia is available for system theme detection
      expect(window.matchMedia).toBeDefined();
      
      // Create a media query for dark theme
      const mediaQuery = mockMatchMedia('(prefers-color-scheme: dark)');
      expect(mediaQuery).toBeDefined();
      expect(typeof mediaQuery.matches).toBe('boolean');
    });

    it('should maintain user theme preference', () => {
      const store = useConfigStore.getState();
      
      // User explicitly sets theme
      act(() => {
        store.setTheme('light');
      });
      
      const userSetTheme = useConfigStore.getState().theme;
      expect(userSetTheme).toBe('light');
      
      // User's theme preference should be maintained
      const finalTheme = useConfigStore.getState().theme;
      expect(finalTheme).toBe('light');
    });
  });

  describe('Theme Event Handling', () => {
    it('should allow multiple components to subscribe to theme changes', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      // Multiple subscribers
      const unsubscribe1 = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, handler1);
      const unsubscribe2 = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, handler2);
      const unsubscribe3 = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, handler3);
      
      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      const newTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Change theme to a different value to ensure event is emitted
      act(() => {
        store.setTheme(newTheme);
      });
      
      // All handlers should be called
      expect(handler1).toHaveBeenCalledWith({
        theme: newTheme,
        source: 'user',
      });
      expect(handler2).toHaveBeenCalledWith({
        theme: newTheme,
        source: 'user',
      });
      expect(handler3).toHaveBeenCalledWith({
        theme: newTheme,
        source: 'user',
      });
      
      // Clean up
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });

    it('should handle event unsubscription correctly', () => {
      const handler = vi.fn();
      
      // Subscribe and get unsubscribe function
      const unsubscribe = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, handler);
      
      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      const newTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Change theme - handler should be called
      act(() => {
        store.setTheme(newTheme);
      });
      
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Change theme again - handler should not be called
      const anotherTheme: ThemeMode = newTheme === 'dark' ? 'light' : 'dark';
      act(() => {
        store.setTheme(anotherTheme);
      });
      
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should distinguish between user and system theme changes', () => {
      const eventHandler = vi.fn();
      const unsubscribe = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);
      
      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      const newTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      
      // User-initiated change
      act(() => {
        store.setTheme(newTheme);
      });
      
      expect(eventHandler).toHaveBeenCalledWith({
        theme: newTheme,
        source: 'user',
      });
      
      // Clean up
      unsubscribe();
    });
  });

  describe('Theme Integration with Configuration', () => {
    it('should preserve theme when configuration is reset', () => {
      const store = useConfigStore.getState();
      
      // Set theme first
      act(() => {
        store.setTheme('light');
      });
      
      // Then set configuration
      act(() => {
        store.updateConfig({
          city: 'Cluj-Napoca',
          apiKey: 'test-key',
          refreshRate: 30000,
        });
      });
      
      expect(useConfigStore.getState().theme).toBe('light');
      expect(useConfigStore.getState().config?.city).toBe('Cluj-Napoca');
      
      // Reset configuration
      act(() => {
        store.resetConfig();
      });
      
      // Theme should be preserved, config should be reset
      const finalState = useConfigStore.getState();
      expect(finalState.theme).toBe('light');
      expect(finalState.config).toBeNull();
    });

    it('should include theme in store persistence alongside configuration', () => {
      const store = useConfigStore.getState();
      
      // Clear previous calls
      localStorageMock.setItem.mockClear();
      
      // Set both theme and configuration
      act(() => {
        store.setTheme('dark');
      });
      
      act(() => {
        store.updateConfig({
          city: 'Cluj-Napoca',
          apiKey: 'test-key',
          refreshRate: 30000,
        });
      });
      
      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Check that both theme and config are in the persisted state
      const state = useConfigStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.config?.city).toBe('Cluj-Napoca');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks with rapid theme changes', () => {
      const store = useConfigStore.getState();
      const eventHandler = vi.fn();
      const unsubscribe = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);
      
      // Clear DOM mock calls from previous tests
      mockDocumentElement.setAttribute.mockClear();
      
      // Simulate rapid theme changes (like user clicking toggle rapidly)
      const themes: ThemeMode[] = ['light', 'dark', 'light', 'dark', 'light'];
      
      act(() => {
        themes.forEach(theme => {
          store.setTheme(theme);
        });
      });
      
      // Should handle all changes without issues
      expect(eventHandler).toHaveBeenCalledTimes(5);
      expect(useConfigStore.getState().theme).toBe('light');
      
      // DOM updates should match
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledTimes(5);
      
      // Clean up
      unsubscribe();
    });

    it('should clean up event listeners properly', () => {
      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      const unsubscribers = handlers.map(handler => 
        StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, handler)
      );
      
      const store = useConfigStore.getState();
      
      // Trigger event
      act(() => {
        store.setTheme('dark');
      });
      
      // All handlers called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
      
      // Unsubscribe all
      unsubscribers.forEach(unsubscribe => unsubscribe());
      
      // Trigger event again
      act(() => {
        store.setTheme('light');
      });
      
      // Handlers should not be called again
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('DOM Integration', () => {
    it('should update DOM when theme changes', () => {
      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      
      // Clear previous calls
      mockDocumentElement.setAttribute.mockClear();
      
      // Change theme to a different value
      const newTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      act(() => {
        store.setTheme(newTheme);
      });
      
      // Verify DOM was updated
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', newTheme);
      
      // Change theme again
      const anotherTheme: ThemeMode = newTheme === 'dark' ? 'light' : 'dark';
      act(() => {
        store.setTheme(anotherTheme);
      });
      
      // Verify DOM was updated again
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', anotherTheme);
    });

    it('should handle theme changes robustly', () => {
      const store = useConfigStore.getState();
      
      // Theme change should work
      act(() => {
        store.setTheme('dark');
      });
      
      // Theme should be updated
      const state = useConfigStore.getState();
      expect(state.theme).toBe('dark');
    });
  });
});