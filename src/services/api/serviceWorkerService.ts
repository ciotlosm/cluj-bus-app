// Service Worker registration and management
import { logger } from '../utils/shared/logger';

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface CacheInfo {
  [cacheName: string]: {
    size: number;
    urls: string[];
  };
}

export class ServiceWorkerService {
  private registration: ServiceWorkerRegistration | null = null;
  private statusCallbacks: ((status: ServiceWorkerStatus) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (!this.isSupported()) {
      logger.warn('Service Workers are not supported in this browser', {}, 'SERVICE_WORKER');
      this.notifyStatusChange();
      return;
    }

    try {
      await this.register();
    } catch (error) {
      logger.error('Failed to register service worker', { error }, 'SERVICE_WORKER');
    }
  }

  public isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      return null;
    }

    // Skip service worker registration in development mode
    if (import.meta.env.DEV) {
      logger.info('Service Worker registration skipped in development mode');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.info('Service Worker registered successfully', { registration: !!this.registration });

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        logger.info('Service Worker update found');
        this.notifyStatusChange();
      });

      // Listen for state changes
      if (this.registration.active) {
        this.registration.active.addEventListener('statechange', () => {
          this.notifyStatusChange();
        });
      }

      this.notifyStatusChange();
      return this.registration;
    } catch (error) {
      logger.error('Service Worker registration failed', { error }, 'SERVICE_WORKER');
      throw error;
    }
  }

  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      if (result) {
        this.registration = null;
        logger.info('Service Worker unregistered successfully');
        this.notifyStatusChange();
      }
      return result;
    } catch (error) {
      logger.error('Failed to unregister service worker', { error }, 'SERVICE_WORKER');
      return false;
    }
  }

  public getStatus(): ServiceWorkerStatus {
    return {
      isSupported: this.isSupported(),
      isRegistered: !!this.registration,
      isActive: !!(this.registration?.active),
      registration: this.registration,
    };
  }

  public onStatusChange(callback: (status: ServiceWorkerStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // Cache management methods
  public async clearCache(cacheType?: 'api' | 'static'): Promise<void> {
    if (!this.registration?.active) {
      throw new Error('Service Worker is not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve();
        } else {
          reject(new Error(event.data.error));
        }
      };

      this.registration!.active!.postMessage(
        {
          type: 'CLEAR_CACHE',
          payload: { cacheType },
        },
        [messageChannel.port2]
      );
    });
  }

  public async getCacheInfo(): Promise<CacheInfo> {
    if (!this.registration?.active) {
      throw new Error('Service Worker is not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error));
        }
      };

      this.registration!.active!.postMessage(
        {
          type: 'GET_CACHE_INFO',
        },
        [messageChannel.port2]
      );
    });
  }

  // Check if the app is currently offline
  public isOffline(): boolean {
    return !navigator.onLine;
  }

  // Listen for online/offline events
  public onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

// Singleton instance
let serviceWorkerService: ServiceWorkerService | null = null;

export const getServiceWorkerService = (): ServiceWorkerService => {
  if (!serviceWorkerService) {
    serviceWorkerService = new ServiceWorkerService();
  }
  return serviceWorkerService;
};