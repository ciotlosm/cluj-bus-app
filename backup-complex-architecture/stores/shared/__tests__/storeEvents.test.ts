/**
 * Unit tests for StoreEventManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoreEventManager, StoreEvents } from '../storeEvents';

describe('StoreEventManager', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    StoreEventManager.removeAllListeners();
  });

  afterEach(() => {
    // Clean up after each test
    StoreEventManager.removeAllListeners();
  });

  describe('emit and subscribe', () => {
    it('should emit events to subscribers', () => {
      const mockHandler = vi.fn();
      
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, mockHandler);
      
      const testData = {
        config: { apiKey: 'test' },
        changes: { apiKey: 'test' }
      };
      
      StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, testData);
      
      expect(mockHandler).toHaveBeenCalledWith(testData);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, handler1);
      StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, handler2);
      
      const testData = {
        vehicles: [],
        timestamp: new Date(),
        source: 'api' as const
      };
      
      StoreEventManager.emit(StoreEvents.VEHICLES_UPDATED, testData);
      
      expect(handler1).toHaveBeenCalledWith(testData);
      expect(handler2).toHaveBeenCalledWith(testData);
    });

    it('should not call handlers for different events', () => {
      const configHandler = vi.fn();
      const vehicleHandler = vi.fn();
      
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, configHandler);
      StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, vehicleHandler);
      
      StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, {
        config: {},
        changes: {}
      });
      
      expect(configHandler).toHaveBeenCalledTimes(1);
      expect(vehicleHandler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should return unsubscribe function that removes the handler', () => {
      const handler = vi.fn();
      
      const unsubscribe = StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, handler);
      
      // Emit before unsubscribe
      StoreEventManager.emit(StoreEvents.THEME_CHANGED, {
        theme: 'dark',
        source: 'user'
      });
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Emit after unsubscribe
      StoreEventManager.emit(StoreEvents.THEME_CHANGED, {
        theme: 'light',
        source: 'user'
      });
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should only remove the specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      const unsubscribe1 = StoreEventManager.subscribe(StoreEvents.LOCATION_CHANGED, handler1);
      StoreEventManager.subscribe(StoreEvents.LOCATION_CHANGED, handler2);
      
      // Unsubscribe only handler1
      unsubscribe1();
      
      StoreEventManager.emit(StoreEvents.LOCATION_CHANGED, {
        location: { latitude: 0, longitude: 0 },
        source: 'gps'
      });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('once', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();
      
      StoreEventManager.once(StoreEvents.API_KEY_VALIDATED, handler);
      
      const testData = { isValid: true, agencies: [] };
      
      // Emit twice
      StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, testData);
      StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, testData);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(testData);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const otherHandler = vi.fn();
      
      StoreEventManager.subscribe(StoreEvents.CACHE_INVALIDATED, handler1);
      StoreEventManager.subscribe(StoreEvents.CACHE_INVALIDATED, handler2);
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, otherHandler);
      
      StoreEventManager.removeAllListeners(StoreEvents.CACHE_INVALIDATED);
      
      StoreEventManager.emit(StoreEvents.CACHE_INVALIDATED, {
        cacheKeys: ['test'],
        reason: 'test'
      });
      
      StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, {
        config: {},
        changes: {}
      });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(otherHandler).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners for all events when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, handler1);
      StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, handler2);
      
      StoreEventManager.removeAllListeners();
      
      StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, {
        config: {},
        changes: {}
      });
      
      StoreEventManager.emit(StoreEvents.VEHICLES_UPDATED, {
        vehicles: [],
        timestamp: new Date(),
        source: 'api'
      });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors in event handlers gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const goodHandler = vi.fn();
      const badHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, goodHandler);
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, badHandler);
      
      const testData = { config: {}, changes: {} };
      
      // Should not throw
      expect(() => {
        StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, testData);
      }).not.toThrow();
      
      expect(goodHandler).toHaveBeenCalledWith(testData);
      expect(badHandler).toHaveBeenCalledWith(testData);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event listener'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getDebugInfo', () => {
    it('should return listener counts for each event', () => {
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, vi.fn());
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, vi.fn());
      StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, vi.fn());
      
      const debugInfo = StoreEventManager.getDebugInfo();
      
      expect(debugInfo[StoreEvents.CONFIG_CHANGED]).toBe(2);
      expect(debugInfo[StoreEvents.VEHICLES_UPDATED]).toBe(1);
    });
  });
});