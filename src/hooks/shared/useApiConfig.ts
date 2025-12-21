import { useCallback } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { enhancedTranzyApi } from '../../services/api/tranzyApiService';
import { logger } from '../../utils/shared/logger';

/**
 * Centralized API configuration hook
 * Eliminates duplication of API setup patterns across the app
 */
export const useApiConfig = () => {
  const { config } = useConfigStore();

  // Check if API is properly configured
  const isConfigured = !!(config?.agencyId && config?.apiKey);

  // Setup API with current configuration
  const setupApi = useCallback((): number => {
    if (!config?.agencyId || !config?.apiKey) {
      const error = new Error('API configuration missing: agencyId and apiKey are required');
      logger.error('API setup failed - missing configuration', {
        hasAgencyId: !!config?.agencyId,
        hasApiKey: !!config?.apiKey
      }, 'API_CONFIG');
      throw error;
    }

    // Set API key for all subsequent requests
    enhancedTranzyApi.setApiKey(config.apiKey);
    
    // Parse and validate agency ID
    const agencyId = parseInt(config.agencyId);
    if (isNaN(agencyId)) {
      const error = new Error(`Invalid agency ID: ${config.agencyId}`);
      logger.error('API setup failed - invalid agency ID', { agencyId: config.agencyId }, 'API_CONFIG');
      throw error;
    }

    logger.debug('API configured successfully', { agencyId }, 'API_CONFIG');
    return agencyId;
  }, [config?.agencyId, config?.apiKey]);

  // Safe setup that returns null on failure instead of throwing
  const trySetupApi = useCallback((): number | null => {
    try {
      return setupApi();
    } catch (error) {
      logger.warn('API setup failed, returning null', { error }, 'API_CONFIG');
      return null;
    }
  }, [setupApi]);

  // Check if configuration is valid without setting up API
  const validateConfig = useCallback((): boolean => {
    if (!config?.agencyId || !config?.apiKey) {
      return false;
    }
    
    const agencyId = parseInt(config.agencyId);
    return !isNaN(agencyId);
  }, [config?.agencyId, config?.apiKey]);

  return {
    setupApi,
    trySetupApi,
    validateConfig,
    isConfigured,
    agencyId: config?.agencyId ? parseInt(config.agencyId) : null,
    hasApiKey: !!config?.apiKey,
  };
};