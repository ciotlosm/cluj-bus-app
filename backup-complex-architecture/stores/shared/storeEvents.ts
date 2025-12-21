/**
 * Type-safe event system for store communication
 * Enables decoupled communication between stores without direct dependencies
 */

export enum StoreEvents {
  CONFIG_CHANGED = 'store:config:changed',
  VEHICLES_UPDATED = 'store:vehicles:updated',
  LOCATION_CHANGED = 'store:location:changed',
  THEME_CHANGED = 'store:theme:changed',
  API_KEY_VALIDATED = 'store:api:validated',
  CACHE_INVALIDATED = 'store:cache:invalidated',
  FAVORITES_UPDATED = 'store:favorites:updated',
}

export interface StoreEventData {
  [StoreEvents.CONFIG_CHANGED]: { 
    config: any; // UserConfig type - using any to avoid circular imports
    changes: Record<string, any>;
  };
  [StoreEvents.VEHICLES_UPDATED]: { 
    vehicles: any[]; // CoreVehicle[] - using any to avoid circular imports
    timestamp: Date;
    source: 'api' | 'cache';
  };
  [StoreEvents.LOCATION_CHANGED]: { 
    location: { latitude: number; longitude: number; accuracy?: number };
    source: 'gps' | 'manual';
  };
  [StoreEvents.THEME_CHANGED]: { 
    theme: 'light' | 'dark' | 'auto';
    source: 'user' | 'system';
  };
  [StoreEvents.API_KEY_VALIDATED]: { 
    isValid: boolean;
    agencies?: any[];
  };
  [StoreEvents.CACHE_INVALIDATED]: { 
    cacheKeys: string[];
    reason: string;
  };
  [StoreEvents.FAVORITES_UPDATED]: {
    favoriteRoutes: any[];
    favoriteStations: string[];
  };
}

/**
 * Event manager for type-safe store communication
 */
export class StoreEventManager {
  private static listeners = new Map<string, Set<Function>>();

  /**
   * Emit a typed event to all subscribers
   */
  static emit<T extends StoreEvents>(event: T, data: StoreEventData[T]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to a typed event
   * Returns unsubscribe function
   */
  static subscribe<T extends StoreEvents>(
    event: T,
    handler: (data: StoreEventData[T]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(handler);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(handler);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event that fires only once
   */
  static once<T extends StoreEvents>(
    event: T,
    handler: (data: StoreEventData[T]) => void
  ): void {
    const unsubscribe = this.subscribe(event, (data) => {
      handler(data);
      unsubscribe();
    });
  }

  /**
   * Remove all listeners for an event or all events
   */
  static removeAllListeners(event?: StoreEvents): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get debug information about current listeners
   */
  static getDebugInfo(): Record<string, number> {
    const info: Record<string, number> = {};
    this.listeners.forEach((listeners, event) => {
      info[event] = listeners.size;
    });
    return info;
  }
}

// React import for the hook
import React from 'react';

/**
 * Hook for React components to subscribe to store events
 */
export function useStoreEvent<T extends StoreEvents>(
  event: T,
  handler: (data: StoreEventData[T]) => void,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const unsubscribe = StoreEventManager.subscribe(event, handler);
    return unsubscribe;
  }, deps);
}

/**
 * Hook for React components to subscribe to multiple store events
 */
export function useStoreEvents<T extends StoreEvents>(
  subscriptions: Array<{
    event: T;
    handler: (data: StoreEventData[T]) => void;
  }>,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const unsubscribes = subscriptions.map(({ event, handler }) =>
      StoreEventManager.subscribe(event, handler)
    );
    
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, deps);
}

/**
 * Hook to get the current state of store events (for debugging)
 */
export function useStoreEventDebug(): Record<string, number> {
  const [debugInfo, setDebugInfo] = React.useState<Record<string, number>>({});
  
  React.useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo(StoreEventManager.getDebugInfo());
    };
    
    // Update immediately
    updateDebugInfo();
    
    // Update periodically
    const interval = setInterval(updateDebugInfo, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return debugInfo;
}