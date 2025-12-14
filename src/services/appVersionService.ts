import { logger } from '../utils/loggerFixed';

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
  private currentVersion = '1.0.0'; // This should match package.json or be dynamically loaded
  
  async checkForUpdates(): Promise<VersionInfo> {
    logger.info('Checking for app updates...', {}, 'VERSION_CHECK');
    
    try {
      // Get service worker version
      const swVersion = await this.getServiceWorkerVersion();
      
      // In a real app, you might check against a remote version endpoint
      // For now, we'll compare with the service worker version
      const isUpdateAvailable = await this.isUpdateAvailable();
      
      const versionInfo: VersionInfo = {
        current: this.currentVersion,
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
    logger.info('Clearing all caches...', {}, 'CACHE_CLEAR');
    
    try {
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            logger.info(`Deleting cache: ${cacheName}`, {}, 'CACHE_CLEAR');
            return caches.delete(cacheName);
          })
        );
      }
      
      // Clear service worker caches via message (if available)
      try {
        await this.sendServiceWorkerMessage('CLEAR_CACHE');
      } catch (error) {
        // Service worker not available, continue anyway
        logger.warn('Could not clear service worker caches', { error }, 'CACHE_CLEAR');
      }
      
      // Clear localStorage (but preserve user config)
      const configBackup = localStorage.getItem('config-store');
      localStorage.clear();
      if (configBackup) {
        localStorage.setItem('config-store', configBackup);
      }
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      logger.info('All caches cleared successfully', {}, 'CACHE_CLEAR');
    } catch (error) {
      logger.error('Failed to clear caches', { error }, 'CACHE_CLEAR');
      throw new Error('Failed to clear caches');
    }
  }
  
  async getVersionInfo(): Promise<VersionInfo> {
    const swVersion = await this.getServiceWorkerVersion();
    const isUpdateAvailable = await this.isUpdateAvailable();
    
    return {
      current: this.currentVersion,
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