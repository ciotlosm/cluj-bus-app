import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfigStore } from '../../stores/configStore';

import { logger, LogLevel } from '../../utils/shared/logger';
import type { UserConfig, Coordinates } from '../../types';

interface ValidationErrors {
  city?: string;
  homeLocation?: string;
  workLocation?: string;
  apiKey?: string;
  refreshRate?: string;
  staleDataThreshold?: string;
  maxVehiclesPerStation?: string;
}

export interface UseConfigurationManagerReturn {
  // Form state
  formData: Partial<UserConfig>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<UserConfig>>>;
  errors: ValidationErrors;
  
  // API key validation
  isValidatingApiKey: boolean;
  apiKeyValid: boolean | null;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  
  // Location picker
  locationPickerOpen: boolean;
  locationPickerType: 'home' | 'work' | 'offline';
  setLocationPickerOpen: (open: boolean) => void;
  
  // Submission
  isSubmitting: boolean;
  isSaving: boolean;
  
  // Actions
  handleApiKeyChange: (value: string) => void;
  handleCityChange: (city: string, agencyId: string) => void;
  handleLogLevelChange: (level: number) => void;
  validateApiKey: (apiKey: string) => Promise<void>;
  handleLocationPicker: (type: 'home' | 'work' | 'offline') => void;
  handleLocationSelected: (location: Coordinates) => void;
  handleSubmit: () => Promise<void>;
  handleAutoSave: (field: keyof UserConfig, value: any) => void;
  
  // Utilities
  validateAndSetErrors: () => boolean;
  formatLocationDisplay: (location: Coordinates | undefined) => string | null;
  
  // Data
  cityOptions: Array<{ label: string; value: string; agencyId: string }>;
  config: UserConfig | null;
  isConfigured: boolean;
}

export const useConfigurationManager = (
  onConfigComplete?: () => void
): UseConfigurationManagerReturn => {
  const { config, updateConfig, isConfigured, agencies, fetchAgencies, isApiValidated, validateApiKey } = useConfigStore();
  
  const [formData, setFormData] = useState<Partial<UserConfig>>({
    city: config?.city || '',
    agencyId: config?.agencyId || '',
    homeLocation: config?.homeLocation || undefined,
    workLocation: config?.workLocation || undefined,
    defaultLocation: config?.defaultLocation || { latitude: 46.7712, longitude: 23.6236 }, // Cluj-Napoca center
    apiKey: config?.apiKey || '',
    refreshRate: config?.refreshRate || 30000,
    staleDataThreshold: config?.staleDataThreshold || 2,
    logLevel: config?.logLevel ?? 1, // Default to INFO level
    maxVehiclesPerStation: config?.maxVehiclesPerStation || 5,
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<'home' | 'work' | 'offline'>('home');
  
  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load agencies on mount if API is validated but agencies are empty
  useEffect(() => {
    if (isApiValidated && agencies.length === 0 && config?.apiKey) {
      // Validate API key and fetch agencies if not already loaded
      validateApiKey(config.apiKey);
    }
  }, [isApiValidated, agencies.length, config?.apiKey]);

  // Auto-save function with debouncing
  const autoSave = useCallback(async (data: Partial<UserConfig>) => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Only auto-save if we have required fields
      if (data.apiKey?.trim() && data.city?.trim() && data.agencyId?.trim()) {
        setIsSaving(true);
        try {
          await updateConfig(data);
          logger.debug('Configuration auto-saved', { data }, 'CONFIG');
        } catch (error) {
          logger.error('Failed to auto-save configuration', { error }, 'CONFIG');
        } finally {
          setIsSaving(false);
        }
      }
    }, 1000); // 1 second debounce
  }, [updateConfig]);

  // Auto-save function for blur events
  const handleAutoSave = useCallback((field: keyof UserConfig, value: any) => {
    if (isConfigured && config) {
      const updatedConfig = { ...config, [field]: value };
      autoSave(updatedConfig);
    }
  }, [isConfigured, config, autoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Get city options from agencies
  const cityOptions = agencies
    .map(agency => ({ label: agency.name, value: agency.name, agencyId: agency.id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const validateAndSetErrors = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!formData.apiKey?.trim()) {
      newErrors.apiKey = 'API key is required';
    }
    
    if (!formData.city?.trim()) {
      newErrors.city = 'City selection is required';
    }
    
    if (!formData.agencyId?.trim()) {
      newErrors.city = 'City selection is required';
    }
    
    if (formData.refreshRate && (formData.refreshRate < 5000 || formData.refreshRate > 300000)) {
      newErrors.refreshRate = 'Refresh rate must be between 5 and 300 seconds';
    }
    
    if (formData.staleDataThreshold && (formData.staleDataThreshold < 1 || formData.staleDataThreshold > 30)) {
      newErrors.staleDataThreshold = 'Stale data threshold must be between 1 and 30 minutes';
    }
    
    if (formData.maxVehiclesPerStation && (formData.maxVehiclesPerStation < 1 || formData.maxVehiclesPerStation > 20)) {
      newErrors.maxVehiclesPerStation = 'Max vehicles per station must be between 1 and 20';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateApiKeyLocal = async (apiKey: string): Promise<void> => {
    if (!apiKey.trim()) {
      setApiKeyValid(null);
      return;
    }

    setIsValidatingApiKey(true);
    try {
      // Use the validateApiKey method from configStore which caches agencies
      await validateApiKey(apiKey.trim());
      setApiKeyValid(true);
      
      setErrors(prev => ({ ...prev, apiKey: undefined }));
      // Agencies are now cached automatically by validateAndFetchAgencies
    } catch (error) {
      setApiKeyValid(false);
      setErrors(prev => ({ ...prev, apiKey: 'Failed to validate API key' }));
    } finally {
      setIsValidatingApiKey(false);
    }
  };

  const handleApiKeyChange = (value: string): void => {
    setFormData(prev => ({ ...prev, apiKey: value }));
    setApiKeyValid(null);
  };

  const handleCityChange = (city: string, agencyId: string): void => {
    setFormData(prev => ({ ...prev, city, agencyId }));
  };

  const handleLogLevelChange = (level: number): void => {
    setFormData(prev => ({ ...prev, logLevel: level.toString() }));
    // Immediately update the logger and persist to config
    updateConfig({ ...config, logLevel: level.toString() });
  };

  const handleLocationPicker = (type: 'home' | 'work' | 'offline'): void => {
    setLocationPickerType(type);
    setLocationPickerOpen(true);
  };

  const handleLocationSelected = (location: Coordinates): void => {
    if (locationPickerType === 'home') {
      setFormData(prev => ({ ...prev, homeLocation: location }));
      handleAutoSave('homeLocation', location);
    } else if (locationPickerType === 'work') {
      setFormData(prev => ({ ...prev, workLocation: location }));
      handleAutoSave('workLocation', location);
    } else if (locationPickerType === 'offline') {
      setFormData(prev => ({ ...prev, defaultLocation: location }));
      handleAutoSave('defaultLocation', location);
    }
    setLocationPickerOpen(false);
  };

  const formatLocationDisplay = (location: Coordinates | undefined): string | null => {
    if (!location) return null;
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateAndSetErrors()) return;
    
    setIsSubmitting(true);
    try {
      // Validate API key before saving
      if (formData.apiKey?.trim()) {
        await validateApiKey(formData.apiKey.trim());
      }
      
      await updateConfig(formData);
      if (onConfigComplete) {
        onConfigComplete();
      }
    } catch (error) {
      logger.error('Failed to save configuration', error, 'CONFIG_MANAGER');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // Form state
    formData,
    setFormData,
    errors,
    
    // API key validation
    isValidatingApiKey,
    apiKeyValid,
    showApiKey,
    setShowApiKey,
    
    // Location picker
    locationPickerOpen,
    locationPickerType,
    setLocationPickerOpen,
    
    // Submission
    isSubmitting,
    isSaving,
    
    // Actions
    handleApiKeyChange,
    handleCityChange,
    handleLogLevelChange,
    validateApiKey: validateApiKeyLocal,
    handleLocationPicker,
    handleLocationSelected,
    handleSubmit,
    handleAutoSave,
    
    // Utilities
    validateAndSetErrors,
    formatLocationDisplay,
    
    // Data
    cityOptions,
    config,
    isConfigured,
  };
};