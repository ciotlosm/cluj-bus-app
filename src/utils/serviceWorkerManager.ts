// Service Worker Manager for handling updates and cache busting
import { logger } from './shared/logger';

export interface ServiceWorkerManager {
  register: () => Promise<ServiceWorkerRegistration | null>;
  checkForUpdates: () => Promise<boolean>;
  forceUpdate: () => Promise<void>;
  getCurrentVersion: () => Promise<string | null>;
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported');
      return null;
    }

    try {
      // In development, force update checks more aggressively
      const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      logger.info('Service Worker registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          logger.info('New Service Worker found, installing...');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('New Service Worker installed, update available');
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, version } = event.data;
        
        if (type === 'SW_UPDATED') {
          logger.info(`Service Worker updated to version: ${version}`);
          this.notifyUpdateAvailable();
        }
      });

      // Check for updates immediately
      await this.checkForUpdates();

      // In development, check for updates more frequently
      if (isDevelopment) {
        setInterval(() => {
          this.checkForUpdates();
        }, 10 * 1000); // Check every 10 seconds in development
      }

      return this.registration;
    } catch (error) {
      logger.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      await this.registration.update();
      logger.info('Checked for Service Worker updates');
      return this.updateAvailable;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return false;
    }
  }

  async forceUpdate(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registration found');
    }

    // Clear all caches first
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logger.info('All caches cleared');
    }

    // If there's a waiting service worker, activate it
    if (this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        }, { once: true });
      });
    }

    // Force reload the page
    window.location.reload();
  }

  async getCurrentVersion(): Promise<string | null> {
    if (!this.registration || !this.registration.active) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        const { success, version } = event.data;
        resolve(success ? version : null);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }

  private notifyUpdateAvailable(): void {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('sw-update-available', {
      detail: { updateAvailable: true }
    }));
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManagerImpl();

// Auto-register service worker
export const initializeServiceWorker = async (): Promise<void> => {
  try {
    await serviceWorkerManager.register();
    
    // Check for updates every 5 minutes
    setInterval(() => {
      serviceWorkerManager.checkForUpdates();
    }, 5 * 60 * 1000);
    
  } catch (error) {
    logger.error('Failed to initialize service worker:', error);
  }
};