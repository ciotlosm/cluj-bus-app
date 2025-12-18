/**
 * Tests for Nearby View Error Handler
 * 
 * Basic tests to verify error classification and recovery strategies
 * work correctly for the enhanced error handling system.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyNearbyViewError,
  createErrorContext,
  createErrorContextWithOfflineState,
  shouldTriggerOfflineMode,
  getUserFriendlyErrorMessage,
  getActionableInstructions,
  RecoveryStrategy,
  NearbyViewErrorSeverity
} from './nearbyViewErrorHandler';
import { NearbyViewErrorType } from '../controllers/nearbyViewController';
import type { NearbyViewError } from '../controllers/nearbyViewController';

describe('Nearby View Error Handler', () => {
  describe('Error Classification', () => {
    it('should classify GPS location errors correctly', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.NO_GPS_LOCATION,
        message: 'GPS location not available',
        fallbackAction: 'show_message'
      };

      const context = createErrorContext({
        userLocation: null,
        isConfigured: true,
        stationsCount: 5,
        routesCount: 3
      });

      const plan = classifyNearbyViewError(error, context);

      expect(plan.strategy).toBe(RecoveryStrategy.FALLBACK_DATA);
      expect(plan.severity).toBe(NearbyViewErrorSeverity.MEDIUM);
      expect(plan.userMessage).toContain('default location');
      expect(plan.retryable).toBe(true);
    });

    it('should classify no stations errors correctly', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.NO_STATIONS_IN_RANGE,
        message: 'No stations found',
        fallbackAction: 'show_message'
      };

      const context = createErrorContext({
        userLocation: { latitude: 46.77, longitude: 23.58, accuracy: null },
        stationsCount: 0,
        routesCount: 3
      });

      const plan = classifyNearbyViewError(error, context);

      expect(plan.strategy).toBe(RecoveryStrategy.SHOW_MESSAGE);
      expect(plan.severity).toBe(NearbyViewErrorSeverity.MEDIUM);
      expect(plan.userMessage).toContain('No bus stations found');
    });

    it('should classify data loading errors with cached data', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.DATA_LOADING_ERROR,
        message: 'Failed to load data',
        fallbackAction: 'retry'
      };

      const context = createErrorContext({
        userLocation: { latitude: 46.77, longitude: 23.58, accuracy: null },
        stationsCount: 5,
        routesCount: 3,
        hasGTFSData: true,
        retryCount: 0
      });

      const plan = classifyNearbyViewError(error, context);

      expect(plan.strategy).toBe(RecoveryStrategy.FALLBACK_DATA);
      expect(plan.severity).toBe(NearbyViewErrorSeverity.LOW);
      expect(plan.userMessage).toContain('cached data');
      expect(plan.retryable).toBe(true);
    });

    it('should classify offline mode errors correctly', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.OFFLINE_MODE,
        message: 'Operating offline',
        fallbackAction: 'use_cached_data'
      };

      const context = createErrorContext({
        userLocation: { latitude: 46.77, longitude: 23.58, accuracy: null },
        stationsCount: 5,
        hasGTFSData: true
      });

      const plan = classifyNearbyViewError(error, context);

      expect(plan.strategy).toBe(RecoveryStrategy.FALLBACK_DATA);
      expect(plan.severity).toBe(NearbyViewErrorSeverity.LOW);
      expect(plan.userMessage).toContain('offline');
      expect(plan.userMessage).toContain('cached');
    });
  });

  describe('Error Context Creation', () => {
    it('should create basic error context', () => {
      const context = createErrorContext({
        userLocation: { latitude: 46.77, longitude: 23.58, accuracy: null },
        stationsCount: 10,
        routesCount: 5,
        vehiclesCount: 20,
        hasGTFSData: true,
        isConfigured: true,
        retryCount: 1
      });

      expect(context.userLocation).toEqual({ latitude: 46.77, longitude: 23.58, accuracy: null });
      expect(context.stationsAvailable).toBe(10);
      expect(context.routesAvailable).toBe(5);
      expect(context.vehiclesAvailable).toBe(20);
      expect(context.hasGTFSData).toBe(true);
      expect(context.isConfigured).toBe(true);
      expect(context.retryCount).toBe(1);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should create enhanced error context with offline state', () => {
      const context = createErrorContextWithOfflineState(
        {
          userLocation: { latitude: 46.77, longitude: 23.58, accuracy: null },
          stationsCount: 5,
          isConfigured: true
        },
        {
          isOnline: false,
          isApiOnline: false,
          isUsingCachedData: true,
          lastApiSuccess: new Date(Date.now() - 60000), // 1 minute ago
          lastCacheUpdate: new Date(Date.now() - 30000)  // 30 seconds ago
        }
      );

      expect(context.isOnline).toBe(false);
      expect(context.isApiOnline).toBe(false);
      expect(context.isUsingCachedData).toBe(true);
      expect(context.cacheAge).toBeGreaterThan(25000); // Around 30 seconds
    });
  });

  describe('Offline Mode Detection', () => {
    it('should trigger offline mode for network errors when offline', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.DATA_LOADING_ERROR,
        message: 'Network error',
        fallbackAction: 'retry'
      };

      const context = createErrorContextWithOfflineState(
        { userLocation: { latitude: 46.77, longitude: 23.58, accuracy: null } },
        {
          isOnline: false,
          isApiOnline: false,
          lastCacheUpdate: new Date(Date.now() - 60000) // Recent cache
        }
      );

      const shouldTrigger = shouldTriggerOfflineMode(error, context);
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger offline mode when already in offline mode', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.OFFLINE_MODE,
        message: 'Already offline',
        fallbackAction: 'use_cached_data'
      };

      const context = createErrorContext({});

      const shouldTrigger = shouldTriggerOfflineMode(error, context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger offline mode for non-network errors', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.CONFIGURATION_ERROR,
        message: 'Config error',
        fallbackAction: 'show_message'
      };

      const context = createErrorContextWithOfflineState(
        {},
        { isOnline: false, isApiOnline: false }
      );

      const shouldTrigger = shouldTriggerOfflineMode(error, context);
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide user-friendly error messages', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.NO_GPS_LOCATION,
        message: 'GPS error',
        fallbackAction: 'show_message'
      };

      const context = createErrorContext({
        userLocation: null,
        isConfigured: false
      });

      const message = getUserFriendlyErrorMessage(error, context);
      expect(message).toContain('location');
      expect(message.length).toBeGreaterThan(10); // Should have a meaningful message
    });

    it('should provide actionable instructions', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.DATA_LOADING_ERROR,
        message: 'Loading failed',
        fallbackAction: 'retry'
      };

      const context = createErrorContext({
        retryCount: 0,
        hasGTFSData: false
      });

      const instructions = getActionableInstructions(error, context);
      expect(instructions).toContain('Check your internet connection');
      expect(instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error types gracefully', () => {
      const error: NearbyViewError = {
        type: 'unknown_error' as NearbyViewErrorType,
        message: 'Unknown error',
        fallbackAction: 'retry'
      };

      const context = createErrorContext({});

      const plan = classifyNearbyViewError(error, context);
      expect(plan.strategy).toBe(RecoveryStrategy.RETRY);
      expect(plan.userMessage).toContain('Something went wrong');
    });

    it('should handle missing context gracefully', () => {
      const error: NearbyViewError = {
        type: NearbyViewErrorType.NO_GPS_LOCATION,
        message: 'GPS error',
        fallbackAction: 'show_message'
      };

      const context = createErrorContext({});

      const plan = classifyNearbyViewError(error, context);
      expect(plan).toBeDefined();
      expect(plan.userMessage).toBeDefined();
      expect(plan.strategy).toBeDefined();
    });
  });
});