import { useCallback } from 'react';
import { useAsyncOperation } from './useAsyncOperation';
import { useFormValidation, type FormState, type FieldConfig } from './useFormValidation';

export interface FormSubmitOptions<T = any> {
  /** Custom error message prefix */
  errorMessage?: string;
  /** Log category for debugging */
  logCategory?: string;
  /** Whether to reset form on successful submit */
  resetOnSuccess?: boolean;
  /** Custom success handler */
  onSuccess?: (result: T) => void;
  /** Custom error handler */
  onError?: (error: Error) => void;
}

/**
 * Comprehensive form handling hook combining validation and submission
 * Eliminates duplication of form handling patterns across components
 */
export const useFormHandler = <T = any>(
  initialState: FormState,
  fieldConfig: FieldConfig,
  submitFn: (values: FormState) => Promise<T>
) => {
  const validation = useFormValidation(initialState, fieldConfig);
  const submission = useAsyncOperation<T>();

  // Handle form submission with validation
  const handleSubmit = useCallback(async (
    event?: React.FormEvent,
    options: FormSubmitOptions<T> = {}
  ) => {
    // Prevent default form submission if event provided
    if (event) {
      event.preventDefault();
    }

    const {
      errorMessage = 'Form submission failed',
      logCategory = 'FORM_SUBMIT',
      resetOnSuccess = false,
      onSuccess,
      onError,
    } = options;

    // Validate all fields
    if (!validation.validateAll()) {
      return null;
    }

    // Submit form
    const result = await submission.execute(
      () => submitFn(validation.values),
      {
        errorMessage,
        logCategory,
        onSuccess: onSuccess ? (result) => {
          if (resetOnSuccess) {
            validation.reset();
          }
          onSuccess(result as unknown as T);
        } : undefined,
        onError,
      }
    );

    return result;
  }, [validation, submission, submitFn]);

  // Create form props for easy integration
  const getFormProps = useCallback(() => ({
    onSubmit: (event: React.FormEvent) => handleSubmit(event),
  }), [handleSubmit]);

  return {
    // Form validation
    ...validation,
    
    // Form submission
    handleSubmit,
    isSubmitting: submission.isLoading,
    submitError: submission.error,
    lastResult: submission.lastResult,
    
    // Convenience props
    getFormProps,
    
    // Manual control
    clearSubmitError: submission.clearError,
    resetSubmission: submission.reset,
  };
};

/**
 * Specialized hook for API key setup forms
 */
export const useApiKeyForm = (
  onSuccess: (apiKey: string) => void,
  validateFn: (apiKey: string) => Promise<boolean>
) => {
  const form = useFormHandler(
    { apiKey: '' },
    { apiKey: { required: true, minLength: 10 } },
    async (values) => {
      const isValid = await validateFn(values.apiKey);
      if (!isValid) {
        throw new Error('Invalid API key. Please check your key and try again.');
      }
      return values.apiKey;
    }
  );

  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    const result = await form.handleSubmit(event, {
      errorMessage: 'API key validation failed',
      logCategory: 'API_KEY_SETUP',
      onSuccess: onSuccess,
    });
    return result;
  }, [form, onSuccess]);

  return {
    ...form,
    handleSubmit,
    apiKey: form.values.apiKey,
    setApiKey: (value: string) => form.setValue('apiKey', value),
    apiKeyProps: form.getFieldProps('apiKey'),
  };
};

/**
 * Specialized hook for configuration forms
 */
export const useConfigForm = (
  initialConfig: any,
  onSave: (config: any) => Promise<void>
) => {
  // Convert config object to form state
  const initialState = Object.keys(initialConfig).reduce((acc, key) => {
    acc[key] = String(initialConfig[key] || '');
    return acc;
  }, {} as FormState);

  const form = useFormHandler(
    initialState,
    {}, // Field config can be passed as parameter
    async (values) => {
      // Convert form values back to config object
      const config = { ...initialConfig };
      Object.keys(values).forEach(key => {
        if (key in config) {
          // Try to preserve original type
          const originalValue = initialConfig[key];
          if (typeof originalValue === 'number') {
            config[key] = parseFloat(values[key]) || 0;
          } else if (typeof originalValue === 'boolean') {
            config[key] = values[key] === 'true';
          } else {
            config[key] = values[key];
          }
        }
      });
      
      await onSave(config);
      return config;
    }
  );

  return form;
};

/**
 * Common form submission patterns
 */
export const FormPatterns = {
  // Prevent default and stop propagation
  preventDefaults: (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
  },

  // Common button click handler
  createButtonHandler: (handler: () => void | Promise<void>) => 
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      await handler();
    },

  // Common input change handler
  createChangeHandler: (setValue: (value: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(event.target.value);
    },
};