import { logger } from '../utils/shared/logger';

export interface VersionInfo {
  current: string;
  serviceWorker: string;
  isUpdateAvailable: boolean;
  lastChecked: Date;
}

export interface AppUpdateService {
  checkForUpdates(): Promise<VersionInfo>;
  refreshApp(): Promise<void>;
  clearAllCaches(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}

class AppVersionServiceImpl implements AppUpdateService {
  private getCurrentVersionFromHTML(): string {
    // Get version from HTML meta tag (updated by version script)
    const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
    if (metaVersion) {
      return metaVersion;
    }
    
    // Fallback to package.json version or default
    return '1.3.4'; // This should match package.json
  }
  
  async checkForUpdates(): Promise<VersionInfo> {
    logger.info('Checking for app updates...', {}, 'VERSION_CHECK');
    
    try {
      // Get service worker version
      const swVersion = await this.getServiceWorkerVersion();
      
      // In a real app, you might check against a remote version endpoint
      // For now, we'll compare with the service worker version
      const isUpdateAvailable = await this.isUpdateAvailable();
      
      const versionInfo: VersionInfo = {
        current: this.getCurrentVersionFromHTML(),
        serviceWorker: swVersion || 'unknown',
        isUpdateAvailable,
        lastChecked: new Date()
      };
      
      logger.info('Version check completed', { versionInfo }, 'VERSION_CHECK');
      return versionInfo;
    } catch (error) {
      logger.error('Failed to check for updates', { error }, 'VERSION_CHECK');
      throw new Error('Failed to check for updates');
    }
  }
  
  async refreshApp(): Promise<void> {
    logger.info('Refreshing app...', {}, 'APP_REFRESH');
    
    try {
      // Clear all caches first
      await this.clearAllCaches();
      
      // Force service worker update
      await this.updateServiceWorker();
      
      // Reload the page to get fresh content
      window.location.reload();
    } catch (error) {
      logger.error('Failed to refresh app', { error }, 'APP_REFRESH');
      throw new Error('Failed to refresh app');
    }
  }
  
  async clearAllCaches(): Promise<void> {
    logger.info('🧹 Starting aggressive cache clear...', {}, 'CACHE_CLEAR');
    
    try {
      // Step 1: Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        logger.info(`Found ${cacheNames.length} caches to clear`, { cacheNames }, 'CACHE_CLEAR');
        
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            logger.info(`🗑️ Deleting cache: ${cacheName}`, {}, 'CACHE_CLEAR');
            const deleted = await caches.delete(cacheName);
            if (!deleted) {
              logger.warn(`Failed to delete cache: ${cacheName}`, {}, 'CACHE_CLEAR');
            }
            return deleted;
          })
        );
      }
      
      // Step 2: Clear service worker caches via message (if available)
      try {
        logger.info('📨 Requesting service worker cache clear...', {}, 'CACHE_CLEAR');
        await this.sendServiceWorkerMessage('CLEAR_CACHE');
        logger.info('✅ Service worker cache clear completed', {}, 'CACHE_CLEAR');
      } catch (error) {
        // Service worker not available, continue anyway
        logger.warn('⚠️ Could not clear service worker caches (this is OK)', { error }, 'CACHE_CLEAR');
      }
      
      // Step 3: Preserve critical user data before clearing storage
      const preserveKeys = [
        'unified-config-store',      // Current unified configuration (includes theme, favorites, API keys)
        'vehicle-store'              // Current vehicle data store
      ];
      
      const backupData: Record<string, string | null> = {};
      preserveKeys.forEach(key => {
        backupData[key] = localStorage.getItem(key);
      });
      
      // Step 4: Clear localStorage and restore critical data
      logger.info('🧽 Clearing localStorage (preserving user config)...', {}, 'CACHE_CLEAR');
      localStorage.clear();
      
      Object.entries(backupData).forEach(([key, value]) => {
        if (value !== null) {
          localStorage.setItem(key, value);
          logger.info(`💾 Restored: ${key}`, {}, 'CACHE_CLEAR');
        }
      });
      
      // Step 5: Clear sessionStorage
      logger.info('🧽 Clearing sessionStorage...', {}, 'CACHE_CLEAR');
      sessionStorage.clear();
      
      // Step 6: Force service worker to skip waiting if there's an update
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          logger.info('🔄 Activating waiting service worker...', {}, 'CACHE_CLEAR');
          await this.sendServiceWorkerMessage('SKIP_WAITING');
        }
      } catch (error) {
        logger.warn('Could not activate waiting service worker', { error }, 'CACHE_CLEAR');
      }
      
      logger.info('✨ All caches cleared successfully! App will reload with fresh content.', {}, 'CACHE_CLEAR');
    } catch (error) {
      logger.error('❌ Failed to clear caches', { error }, 'CACHE_CLEAR');
      throw new Error('Failed to clear caches');
    }
  }
  
  async getVersionInfo(): Promise<VersionInfo> {
    const swVersion = await this.getServiceWorkerVersion();
    const isUpdateAvailable = await this.isUpdateAvailable();
    
    return {
      current: this.getCurrentVersionFromHTML(),
      serviceWorker: swVersion || 'unknown',
      isUpdateAvailable,
      lastChecked: new Date()
    };
  }
  
  private async getServiceWorkerVersion(): Promise<string | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }
    
    try {
      const response = await this.sendServiceWorkerMessage('GET_VERSION') as { version?: string };
      return response.version || null;
    } catch (error) {
      logger.warn('Could not get service worker version', { error }, 'VERSION_CHECK');
      return null;
    }
  }
  
  private async isUpdateAvailable(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    try {
      // Check if there's a waiting service worker (indicates update available)
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        return true;
      }
      
      // Force check for updates
      await registration?.update();
      
      // Check again after update check
      return !!registration?.waiting;
    } catch (error) {
      logger.warn('Could not check for service worker updates', { error }, 'VERSION_CHECK');
      return false;
    }
  }
  
  private async updateServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration?.waiting) {
        // There's a waiting service worker, activate it
        await this.sendServiceWorkerMessage('SKIP_WAITING');
        
        // Wait for the new service worker to take control
        await new Promise<void>((resolve) => {
          const handleControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        });
      } else {
        // Force check for updates
        await registration?.update();
      }
    } catch (error) {
      logger.error('Failed to update service worker', { error }, 'APP_REFRESH');
      throw error;
    }
  }
  
  private async sendServiceWorkerMessage(type: string, payload?: unknown): Promise<unknown> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      throw new Error('Service worker not available');
    }
    
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data);
        } else {
          reject(new Error(event.data.error || 'Service worker message failed'));
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type, payload },
        [messageChannel.port2]
      );
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 5000);
    });
  }
}

// Export singleton instance
export const appVersionService: AppUpdateService = new AppVersionServiceImpl();