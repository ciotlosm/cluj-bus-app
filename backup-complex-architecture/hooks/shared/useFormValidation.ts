import { useState, useCallback } from 'react';
import { useAsyncOperation } from './useAsyncOperation';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FieldConfig {
  [fieldName: string]: ValidationRule;
}

export interface FormState {
  [fieldName: string]: string;
}

export interface FormErrors {
  [fieldName: string]: string | null;
}

/**
 * Form validation hook providing common validation patterns
 * Eliminates duplication of form state management and validation logic
 */
export const useFormValidation = (initialState: FormState, fieldConfig: FieldConfig) => {
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: string): string | null => {
    const rules = fieldConfig[fieldName];
    if (!rules) return null;

    // Required validation
    if (rules.required && !value.trim()) {
      return `${fieldName} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value.trim() && !rules.required) {
      return null;
    }

    // Length validations
    if (rules.minLength && value.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `${fieldName} must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, [fieldConfig]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(fieldConfig).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName] || '');
      newErrors[fieldName] = error;
      if (error) isValid = false;
    });

    setErrors(newErrors);
    return isValid;
  }, [values, fieldConfig, validateField]);

  // Update field value
  const setValue = useCallback((fieldName: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  }, [errors]);

  // Handle field blur (mark as touched and validate)
  const handleBlur = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = validateField(fieldName, values[fieldName] || '');
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, [values, validateField]);

  // Handle field change
  const handleChange = useCallback((fieldName: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValue(fieldName, event.target.value);
  }, [setValue]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialState);
    setErrors({});
    setTouched({});
  }, [initialState]);

  // Get field props for easy integration with Material-UI
  const getFieldProps = useCallback((fieldName: string) => ({
    value: values[fieldName] || '',
    onChange: handleChange(fieldName),
    onBlur: () => handleBlur(fieldName),
    error: touched[fieldName] && !!errors[fieldName],
    helperText: touched[fieldName] ? errors[fieldName] : '',
  }), [values, errors, touched, handleChange, handleBlur]);

  // Check if form is valid
  const isValid = Object.values(errors).every(error => !error);
  const hasErrors = Object.values(errors).some(error => !!error);

  return {
    values,
    errors,
    touched,
    isValid,
    hasErrors,
    setValue,
    handleChange,
    handleBlur,
    validateField,
    validateAll,
    getFieldProps,
    reset,
  };
};

/**
 * API key validation hook with common patterns
 */
export const useApiKeyValidation = () => {
  const validation = useAsyncOperation<boolean>();

  const validateApiKey = useCallback(async (
    apiKey: string,
    validationFn: (key: string) => Promise<boolean>
  ) => {
    if (!apiKey.trim()) {
      throw new Error('Please enter your API key');
    }

    return await validation.execute(
      () => validationFn(apiKey.trim()),
      {
        errorMessage: 'Failed to validate API key',
        logCategory: 'API_VALIDATION',
      }
    );
  }, [validation]);

  return {
    validateApiKey,
    isValidating: validation.isLoading,
    validationError: validation.error,
    clearError: validation.clearError,
  };
};

/**
 * Common validation rules
 */
export const ValidationRules = {
  required: { required: true },
  
  apiKey: {
    required: true,
    minLength: 10,
    custom: (value: string) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'API key can only contain letters, numbers, hyphens, and underscores';
      }
      return null;
    }
  },

  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  coordinates: {
    latitude: {
      required: true,
      custom: (value: string) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < -90 || num > 90) {
          return 'Latitude must be between -90 and 90';
        }
        return null;
      }
    },
    longitude: {
      required: true,
      custom: (value: string) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < -180 || num > 180) {
          return 'Longitude must be between -180 and 180';
        }
        return null;
      }
    }
  },

  refreshRate: {
    required: true,
    custom: (value: string) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 5000 || num > 300000) {
        return 'Refresh rate must be between 5 and 300 seconds';
      }
      return null;
    }
  },
};