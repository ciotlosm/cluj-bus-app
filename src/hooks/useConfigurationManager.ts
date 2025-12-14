import { useState, useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useAgencyStore } from '../stores/agencyStore';
import { tranzyApiService } from '../services/tranzyApiService';
import type { UserConfig, Coordinates } from '../types';

interface ValidationErrors {
  city?: string;
  homeLocation?: string;
  workLocation?: string;
  apiKey?: string;
  googleMapsApiKey?: string;
  refreshRate?: string;
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
  locationPickerType: 'home' | 'work';
  setLocationPickerOpen: (open: boolean) => void;
  
  // Submission
  isSubmitting: boolean;
  
  // Actions
  handleApiKeyChange: (value: string) => void;
  validateApiKey: (apiKey: string) => Promise<void>;
  handleLocationPicker: (type: 'home' | 'work') => void;
  handleLocationSelected: (location: Coordinates) => void;
  handleSubmit: () => Promise<void>;
  
  // Utilities
  validateAndSetErrors: () => boolean;
  formatLocationDisplay: (location: Coordinates | undefined) => string | null;
  
  // Data
  cityOptions: Array<{ label: string; value: string }>;
  config: UserConfig | null;
  isConfigured: boolean;
}

export const useConfigurationManager = (
  onConfigComplete?: () => void
): UseConfigurationManagerReturn => {
  const { config, updateConfig, isConfigured } = useConfigStore();
  const { agencies, fetchAgencies, isApiValidated, validateAndFetchAgencies } = useAgencyStore();
  
  const [formData, setFormData] = useState<Partial<UserConfig>>({
    city: config?.city || '',
    homeLocation: config?.homeLocation || undefined,
    workLocation: config?.workLocation || undefined,
    apiKey: config?.apiKey || '',
    refreshRate: config?.refreshRate || 30000,
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<'home' | 'work'>('home');

  // Load agencies on mount if API is validated but agencies are empty
  useEffect(() => {
    if (isApiValidated && agencies.length === 0 && config?.apiKey) {
      // Validate API key and fetch agencies if not already loaded
      validateApiKey(config.apiKey);
    }
  }, [isApiValidated, agencies.length, config?.apiKey]);

  // Get city options from agencies
  const cityOptions = agencies
    .map(agency => ({ label: agency.name, value: agency.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const validateAndSetErrors = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!formData.apiKey?.trim()) {
      newErrors.apiKey = 'API key is required';
    }
    
    if (!formData.city?.trim()) {
      newErrors.city = 'City selection is required';
    }
    
    if (formData.refreshRate && (formData.refreshRate < 5000 || formData.refreshRate > 300000)) {
      newErrors.refreshRate = 'Refresh rate must be between 5 and 300 seconds';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateApiKey = async (apiKey: string): Promise<void> => {
    if (!apiKey.trim()) {
      setApiKeyValid(null);
      return;
    }

    setIsValidatingApiKey(true);
    try {
      // First validate the API key
      const service = tranzyApiService();
      const isValid = await service.validateApiKey(apiKey.trim());
      setApiKeyValid(isValid);
      
      if (!isValid) {
        setErrors(prev => ({ ...prev, apiKey: 'Invalid API key' }));
      } else {
        setErrors(prev => ({ ...prev, apiKey: undefined }));
        
        // If validation successful, fetch agencies
        try {
          service.setApiKey(apiKey.trim());
          await fetchAgencies();
        } catch (agencyError) {
          console.warn('Failed to fetch agencies after API validation:', agencyError);
        }
      }
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

  const handleLocationPicker = (type: 'home' | 'work'): void => {
    setLocationPickerType(type);
    setLocationPickerOpen(true);
  };

  const handleLocationSelected = (location: Coordinates): void => {
    if (locationPickerType === 'home') {
      setFormData(prev => ({ ...prev, homeLocation: location }));
    } else {
      setFormData(prev => ({ ...prev, workLocation: location }));
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
        
        // Check if API key validation failed
        if (apiKeyValid === false) {
          setIsSubmitting(false);
          return;
        }
      }
      
      await updateConfig(formData);
      if (onConfigComplete) {
        onConfigComplete();
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
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
    
    // Actions
    handleApiKeyChange,
    validateApiKey,
    handleLocationPicker,
    handleLocationSelected,
    handleSubmit,
    
    // Utilities
    validateAndSetErrors,
    formatLocationDisplay,
    
    // Data
    cityOptions,
    config,
    isConfigured,
  };
};