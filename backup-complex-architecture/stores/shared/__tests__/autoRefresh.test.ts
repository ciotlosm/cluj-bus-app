/**
 * Unit tests for AutoRefreshManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoRefreshManager } from '../autoRefresh';

// Mock timers
vi.useFakeTimers();

describe('AutoRefreshManager', () => {
  let manager: AutoRefreshManager;
  let mockCallback: any;

  beforeEach(() => {
    manager = new AutoRefreshManager();
    mockCallback = vi.fn().mockResolvedValue(undefined);
    vi.clearAllTimers();
  });

  afterEach(() => {
    manager.clear();
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should start auto-refresh with correct interval', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      const status = manager.getStatus('test');
      expect(status?.isRunning).toBe(true);

      // Fast-forward time
      vi.advanceTimersByTime(1000);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should run immediately when immediate option is true', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
        immediate: true,
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not start when enabled is false', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
        enabled: false,
      });

      const status = manager.getStatus('test');
      expect(status?.isRunning).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should stop existing refresh before starting new one', () => {
      const callback1 = vi.fn().mockResolvedValue(undefined);
      const callback2 = vi.fn().mockResolvedValue(undefined);

      manager.start({
        key: 'test',
        callback: callback1,
        intervalMs: 1000,
      });

      manager.start({
        key: 'test',
        callback: callback2,
        intervalMs: 500,
      });

      vi.advanceTimersByTime(500);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should stop auto-refresh', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      manager.stop('test');

      const status = manager.getStatus('test');
      expect(status?.isRunning).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle stopping non-existent refresh gracefully', () => {
      expect(() => manager.stop('nonexistent')).not.toThrow();
    });
  });

  describe('restart', () => {
    it('should restart with existing config', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      manager.restart('test');

      vi.advanceTimersByTime(1000);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should restart with new config', () => {
      const newCallback = vi.fn().mockResolvedValue(undefined);

      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      manager.restart('test', {
        callback: newCallback,
        intervalMs: 500,
      });

      vi.advanceTimersByTime(500);
      expect(mockCallback).not.toHaveBeenCalled();
      expect(newCallback).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent config', () => {
      expect(() => manager.restart('nonexistent')).toThrow();
    });
  });

  describe('updateInterval', () => {
    it('should update interval for running refresh', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      manager.updateInterval('test', 500);

      vi.advanceTimersByTime(500);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should update config for stopped refresh', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      manager.stop('test');
      manager.updateInterval('test', 500);
      manager.restart('test');

      vi.advanceTimersByTime(500);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('setEnabled', () => {
    it('should enable isDisabled refresh', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
        enabled: false,
      });

      manager.setEnabled('test', true);

      vi.advanceTimersByTime(1000);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should disable enabled refresh', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      manager.setEnabled('test', false);

      vi.advanceTimersByTime(1000);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('pauseAll and resumeAll', () => {
    it('should pause and resume all refreshes', () => {
      const callback1 = vi.fn().mockResolvedValue(undefined);
      const callback2 = vi.fn().mockResolvedValue(undefined);

      manager.start({
        key: 'test1',
        callback: callback1,
        intervalMs: 1000,
      });

      manager.start({
        key: 'test2',
        callback: callback2,
        intervalMs: 1000,
      });

      manager.pauseAll();

      vi.advanceTimersByTime(1000);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();

      manager.resumeAll();

      vi.advanceTimersByTime(1000);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle callback errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorCallback = vi.fn().mockRejectedValue(new Error('Test error'));

      manager.start({
        key: 'test',
        callback: errorCallback,
        intervalMs: 1000,
      });

      // Manually trigger the refresh to test error handling
      await manager.triggerRefresh('test');

      const status = manager.getStatus('test');
      expect(status?.lastError).toBeInstanceOf(Error);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should call onError handler when provided', async () => {
      const onError = vi.fn();
      const errorCallback = vi.fn().mockRejectedValue(new Error('Test error'));

      manager.start({
        key: 'test',
        callback: errorCallback,
        intervalMs: 1000,
        onError,
      });

      // Manually trigger the refresh to test error handling
      await manager.triggerRefresh('test');

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('status tracking', () => {
    it('should track run count and timestamps', () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      vi.advanceTimersByTime(1000);

      const status = manager.getStatus('test');
      expect(status?.runCount).toBe(1);
      expect(status?.lastRun).toBeInstanceOf(Date);
      expect(status?.nextRun).toBeInstanceOf(Date);
    });

    it('should return all statuses', () => {
      manager.start({
        key: 'test1',
        callback: vi.fn().mockResolvedValue(undefined),
        intervalMs: 1000,
      });

      manager.start({
        key: 'test2',
        callback: vi.fn().mockResolvedValue(undefined),
        intervalMs: 2000,
      });

      const allStatus = manager.getAllStatus();
      expect(Object.keys(allStatus)).toEqual(['test1', 'test2']);
      expect(allStatus.test1.isRunning).toBe(true);
      expect(allStatus.test2.isRunning).toBe(true);
    });
  });

  describe('triggerRefresh', () => {
    it('should manually trigger refresh', async () => {
      manager.start({
        key: 'test',
        callback: mockCallback,
        intervalMs: 1000,
      });

      await manager.triggerRefresh('test');

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should clear all configs and intervals', () => {
      manager.start({
        key: 'test1',
        callback: vi.fn().mockResolvedValue(undefined),
        intervalMs: 1000,
      });

      manager.start({
        key: 'test2',
        callback: vi.fn().mockResolvedValue(undefined),
        intervalMs: 1000,
      });

      manager.clear();

      expect(manager.getStatus('test1')).toBeUndefined();
      expect(manager.getStatus('test2')).toBeUndefined();
      expect(Object.keys(manager.getAllStatus())).toHaveLength(0);
    });
  });
});