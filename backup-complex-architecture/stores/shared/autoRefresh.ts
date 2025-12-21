/**
 * Unified auto-refresh manager for coordinating automatic data updates
 * Prevents conflicts and memory leaks from multiple refresh intervals
 */

export interface RefreshConfig {
  key: string;
  callback: () => Promise<void>;
  intervalMs: number;
  immediate?: boolean;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export interface RefreshStatus {
  isRunning: boolean;
  nextRun?: Date;
  lastRun?: Date;
  lastError?: Error;
  runCount: number;
}

/**
 * Centralized auto-refresh manager
 */
export class AutoRefreshManager {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private configs = new Map<string, RefreshConfig>();
  private status = new Map<string, RefreshStatus>();
  private isPaused = false;

  /**
   * Start auto-refresh for a specific key
   */
  start(config: RefreshConfig): void {
    // Stop existing refresh if running
    this.stop(config.key);

    // Store config
    this.configs.set(config.key, config);
    
    // Initialize status
    this.status.set(config.key, {
      isRunning: false,
      runCount: 0,
    });

    // Run immediately if requested
    if (config.immediate && !this.isPaused) {
      this.executeRefresh(config.key);
    }

    // Start interval if enabled and not paused
    if ((config.enabled !== false) && !this.isPaused) {
      this.startInterval(config.key);
    }
  }

  /**
   * Stop auto-refresh for a specific key
   */
  stop(key: string): void {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
    }

    // Update status
    const status = this.status.get(key);
    if (status) {
      status.isRunning = false;
      status.nextRun = undefined;
    }
  }

  /**
   * Restart auto-refresh with potentially new config
   */
  restart(key: string, newConfig?: Partial<RefreshConfig>): void {
    const existingConfig = this.configs.get(key);
    if (!existingConfig) {
      throw new Error(`No refresh config found for key: ${key}`);
    }

    const config = newConfig 
      ? { ...existingConfig, ...newConfig }
      : existingConfig;

    this.start(config);
  }

  /**
   * Update interval for existing refresh
   */
  updateInterval(key: string, intervalMs: number): void {
    const config = this.configs.get(key);
    if (config) {
      config.intervalMs = intervalMs;
      if (this.intervals.has(key)) {
        this.restart(key);
      }
    }
  }

  /**
   * Enable/disable a specific refresh
   */
  setEnabled(key: string, enabled: boolean): void {
    const config = this.configs.get(key);
    if (config) {
      config.enabled = enabled;
      if (enabled && !this.intervals.has(key) && !this.isPaused) {
        this.startInterval(key);
      } else if (!enabled) {
        this.stop(key);
      }
    }
  }

  /**
   * Stop all auto-refresh intervals
   */
  stopAll(): void {
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.intervals.clear();

    // Update all status
    this.status.forEach((status) => {
      status.isRunning = false;
      status.nextRun = undefined;
    });
  }

  /**
   * Get status for a specific refresh
   */
  getStatus(key: string): RefreshStatus | undefined {
    return this.status.get(key);
  }

  /**
   * Get all refresh statuses
   */
  getAllStatus(): Record<string, RefreshStatus> {
    const result: Record<string, RefreshStatus> = {};
    this.status.forEach((status, key) => {
      result[key] = { ...status };
    });
    return result;
  }

  /**
   * Pause all auto-refresh (for app lifecycle management)
   */
  pauseAll(): void {
    this.isPaused = true;
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.intervals.clear();

    // Update status
    this.status.forEach((status) => {
      status.isRunning = false;
      status.nextRun = undefined;
    });
  }

  /**
   * Resume all auto-refresh
   */
  resumeAll(): void {
    this.isPaused = false;
    
    // Restart all enabled configs
    this.configs.forEach((config, key) => {
      if (config.enabled !== false) {
        this.startInterval(key);
      }
    });
  }

  /**
   * Manually trigger a refresh
   */
  async triggerRefresh(key: string): Promise<void> {
    await this.executeRefresh(key);
  }

  /**
   * Clear all configs and intervals
   */
  clear(): void {
    this.stopAll();
    this.configs.clear();
    this.status.clear();
  }

  /**
   * Private: Start interval for a key
   */
  private startInterval(key: string): void {
    const config = this.configs.get(key);
    if (!config) return;

    const intervalId = setInterval(() => {
      this.executeRefresh(key);
    }, config.intervalMs);

    this.intervals.set(key, intervalId);

    // Update status
    const status = this.status.get(key);
    if (status) {
      status.isRunning = true;
      status.nextRun = new Date(Date.now() + config.intervalMs);
    }
  }

  /**
   * Private: Execute refresh callback
   */
  private async executeRefresh(key: string): Promise<void> {
    const config = this.configs.get(key);
    const status = this.status.get(key);
    
    if (!config || !status) return;

    try {
      status.lastRun = new Date();
      status.runCount++;
      status.lastError = undefined;

      await config.callback();

      // Update next run time
      if (this.intervals.has(key)) {
        status.nextRun = new Date(Date.now() + config.intervalMs);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      status.lastError = err;

      if (config.onError) {
        try {
          config.onError(err);
        } catch (handlerError) {
          console.error(`Error in refresh error handler for ${key}:`, handlerError);
        }
      } else {
        console.error(`Auto-refresh error for ${key}:`, err);
      }
    }
  }
}

// Global instance
export const autoRefreshManager = new AutoRefreshManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    autoRefreshManager.clear();
  });

  // Pause/resume on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      autoRefreshManager.pauseAll();
    } else {
      autoRefreshManager.resumeAll();
    }
  });
}