/**
 * Centralized tracker for location-related warnings to prevent spam
 * Only shows location warnings once per session
 */

class LocationWarningTracker {
  private hasWarnedAboutLocationAccess = false;
  private hasWarnedAboutLocationRefresh = false;

  /**
   * Log location access warning only once per session
   */
  warnLocationAccess(logger: any, message: string = 'Could not get current location, trying saved locations') {
    if (!this.hasWarnedAboutLocationAccess) {
      logger.warn(message);
      this.hasWarnedAboutLocationAccess = true;
    }
  }

  /**
   * Log location refresh warning only once per session
   */
  warnLocationRefresh(logger: any, error: any, context: string = 'LOCATION') {
    if (!this.hasWarnedAboutLocationRefresh) {
      logger.warn('Failed to refresh GPS location during auto refresh:', error, context);
      this.hasWarnedAboutLocationRefresh = true;
    }
  }

  /**
   * Reset warnings (useful for testing or manual reset)
   */
  reset() {
    this.hasWarnedAboutLocationAccess = false;
    this.hasWarnedAboutLocationRefresh = false;
  }

  /**
   * Check if we've already warned about location access
   */
  hasWarnedAccess(): boolean {
    return this.hasWarnedAboutLocationAccess;
  }

  /**
   * Check if we've already warned about location refresh
   */
  hasWarnedRefresh(): boolean {
    return this.hasWarnedAboutLocationRefresh;
  }
}

// Export singleton instance
export const locationWarningTracker = new LocationWarningTracker();