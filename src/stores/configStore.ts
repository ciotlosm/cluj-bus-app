import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ConfigStore, UserConfig } from '../types';
import { routeMappingService } from '../services/routeMappingService';
import { logger, LogLevel } from '../utils/logger';

// Simple encryption/decryption for sensitive data
const encryptData = (data: string): string => {
  // Simple base64 encoding for demo - in production use proper encryption
  return btoa(data);
};

const decryptData = (encryptedData: string): string => {
  try {
    return atob(encryptedData);
  } catch {
    return '';
  }
};

// Custom storage that encrypts sensitive fields
const createEncryptedStorage = () => ({
  getItem: (name: string): string | null => {
    const item = localStorage.getItem(name);
    if (!item) return null;
    
    try {
      const parsed = JSON.parse(item);
      if (parsed.state?.config?.apiKey) {
        parsed.state.config.apiKey = decryptData(parsed.state.config.apiKey);
      }
      return JSON.stringify(parsed);
    } catch {
      return item;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.config?.apiKey) {
        parsed.state.config.apiKey = encryptData(parsed.state.config.apiKey);
      }
      localStorage.setItem(name, JSON.stringify(parsed));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
});

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      config: null,
      isConfigured: false,
      isFullyConfigured: false,

      updateConfig: (newConfig: Partial<UserConfig>) => {
        const currentConfig = get().config;
        const updatedConfig = currentConfig 
          ? { ...currentConfig, ...newConfig }
          : newConfig as UserConfig;
        
        // Check if refresh rate changed
        const refreshRateChanged = currentConfig?.refreshRate !== updatedConfig.refreshRate;
        
        const isConfigured = !!(
          updatedConfig.apiKey &&
          updatedConfig.refreshRate
        );
        
        const isFullyConfigured = !!(
          updatedConfig.city &&
          updatedConfig.agencyId &&
          updatedConfig.apiKey &&
          updatedConfig.refreshRate
        );
        
        set({
          config: updatedConfig,
          isConfigured,
          isFullyConfigured,
        });

        // Update route mapping cache duration if refresh rate changed
        if (refreshRateChanged) {
          routeMappingService.updateCacheDuration();
        }

        // Note: Google Maps API key check reset is handled automatically by the service

        // Sync log level with logger only if it changed
        const logLevelChanged = currentConfig?.logLevel !== updatedConfig.logLevel;
        if (logLevelChanged && updatedConfig.logLevel !== undefined) {
          logger.setLogLevel(updatedConfig.logLevel as LogLevel);
        }
      },

      resetConfig: () => {
        set({
          config: null,
          isConfigured: false,
          isFullyConfigured: false,
        });
      },
    }),
    {
      name: 'config',
      storage: createJSONStorage(() => createEncryptedStorage()),
      version: 2, // Increment version for migration
      migrate: (persistedState: any, version: number) => {
        // Migration for version 1 -> 2: Add agencyId field
        if (version < 2 && persistedState?.config) {
          // If user has a city but no agencyId, they need to reconfigure
          if (persistedState.config.city && !persistedState.config.agencyId) {
            return {
              ...persistedState,
              config: {
                ...persistedState.config,
                agencyId: '', // Will trigger reconfiguration
              },
              isFullyConfigured: false, // Force reconfiguration
            };
          }
        }
        return persistedState;
      },
    }
  )
);

// Initialize log level from config when store is loaded
if (typeof window !== 'undefined') {
  // Set initial log level from config or default
  const initialState = useConfigStore.getState();
  if (initialState.config?.logLevel !== undefined) {
    logger.setLogLevel(initialState.config.logLevel as LogLevel);
  } else {
    // Set default log level based on environment
    const defaultLevel = (window.location.hostname === 'localhost' ? 1 : 2) as LogLevel; // INFO for dev, WARN for prod
    logger.setLogLevel(defaultLevel);
  }
}