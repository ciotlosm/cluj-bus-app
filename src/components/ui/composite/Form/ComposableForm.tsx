import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  LinearProgress,
  Divider,
  Stack,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useComposition, createFormComposition } from '../../../../hooks/shared/useComposition';
import { useComponentStyles } from '../../../../hooks/shared/useComponentStyles';
import { useThemeUtils } from '../../../../hooks/shared/useThemeUtils';
import type { StandardCompositionProps } from '../../../../types/componentProps';

/**
 * Advanced composable Form component with slot-based composition
 * Implements Requirements: 3.4, 6.4, 8.4
 */

// ============================================================================
// COMPOSITION INTERFACES
// ============================================================================

/**
 * Form-specific slot content types
 */
export interface FormSlots<T = any> {
  /** Form header slot - can be ReactNode or render prop */
  header?: React.ReactNode | ((props: FormCompositionContext<T>) => React.ReactNode);
  /** Form fields slot - can be ReactNode or render prop */
  fields?: React.ReactNode | ((props: FormCompositionContext<T>) => React.ReactNode);
  /** Form validation slot - can be ReactNode or render prop */
  validation?: React.ReactNode | ((props: FormCompositionContext<T>) => React.ReactNode);
  /** Form help slot - can be ReactNode or render prop */
  help?: React.ReactNode | ((props: FormCompositionContext<T>) => React.ReactNode);
  /** Form actions slot - can be ReactNode or render prop */
  actions?: React.ReactNode | ((props: FormCompositionContext<T>) => React.ReactNode);
  /** Form footer slot - can be ReactNode or render prop */
  footer?: React.ReactNode | ((props: FormCompositionContext<T>) => React.ReactNode);
}

/**
 * Form slot props for customizing each slot
 */
export interface FormSlotProps {
  header?: {
    component?: React.ElementType;
    variant?: 'default' | 'compact';
  };
  fields?: {
    component?: React.ElementType;
    spacing?: number;
    direction?: 'row' | 'column';
  };
  validation?: {
    component?: React.ElementType;
    severity?: 'error' | 'warning' | 'info' | 'success';
  };
  help?: {
    component?: React.ElementType;
    variant?: 'default' | 'compact';
  };
  actions?: {
    component?: React.ElementType;
    spacing?: number;
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  };
  footer?: {
    component?: React.ElementType;
    divider?: boolean;
  };
}

/**
 * Form validation state
 */
export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  touched: Record<string, boolean>;
}

/**
 * Context passed to render props and slot functions
 */
export interface FormCompositionContext<T = any> {
  /** Form data */
  data: T;
  /** Form validation state */
  validation: FormValidationState;
  /** Form submission state */
  isSubmitting: boolean;
  isSubmitted: boolean;
  /** Form configuration */
  isDisabled: boolean;
  isReadOnly: boolean;
  /** Event handlers */
  onSubmit: (data: T) => void | Promise<void>;
  onReset: () => void;
  onChange: (field: keyof T, value: any) => void;
  onValidate: (field?: keyof T) => void;
  /** Utility functions */
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  /** Styling */
  sx?: SxProps<Theme>;
}

/**
 * Composable Form component props
 */
export interface ComposableFormProps<T = any> {
  /** Initial form data */
  initialData?: T;
  /** Form validation schema or function */
  validation?: (data: T) => FormValidationState | Promise<FormValidationState>;
  /** Form submission handler */
  onSubmit: (data: T) => void | Promise<void>;
  /** Form reset handler */
  onReset?: () => void;
  /** Form change handler */
  onChange?: (data: T) => void;
  /** Form isDisabled state */
  isDisabled?: boolean;
  /** Form read-only state */
  isReadOnly?: boolean;
  /** Show progress indicator during submission */
  showProgress?: boolean;
  /** Form title */
  title?: string;
  /** Form description */
  description?: string;
  
  // Composition props
  /** Named slots for form parts */
  slots?: FormSlots<T>;
  /** Props for each slot */
  slotProps?: FormSlotProps;
  /** Render prop for complete custom rendering */
  render?: (context: FormCompositionContext<T>) => React.ReactNode;
  /** Children - can be ReactNode or render prop */
  children?: React.ReactNode | ((context: FormCompositionContext<T>) => React.ReactNode);
  
  /** Custom styling */
  sx?: SxProps<Theme>;
}

// ============================================================================
// COMPOSABLE FORM COMPONENT
// ============================================================================

/**
 * ComposableForm - Advanced form component with slot-based composition
 * Supports children, render props, and slot-based composition patterns
 * Maintains type safety across component boundaries
 */
export const ComposableForm = <T extends Record<string, any> = Record<string, any>>({
  initialData,
  validation,
  onSubmit,
  onReset,
  onChange,
  isDisabled = false,
  isReadOnly = false,
  showProgress = true,
  title,
  description,
  slots,
  slotProps,
  render,
  children,
  sx,
}: ComposableFormProps<T>) => {
  const { renderSlot, renderChildren, createContext } = useComposition<FormCompositionContext<T>>();
  const { getCompositionStyles } = useComponentStyles();
  const { theme } = useThemeUtils();

  // Form state
  const [data, setData] = useState<T>(initialData || {} as T);
  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: true,
    errors: {},
    warnings: {},
    touched: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form handlers
  const handleChange = useCallback((field: keyof T, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData);
    
    // Mark field as touched
    setValidationState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));
  }, [data, onChange]);

  const handleValidate = useCallback(async (field?: keyof T) => {
    if (!validation) return;
    
    try {
      const result = await validation(data);
      setValidationState(result);
    } catch (error) {
      // Form validation error - could be logged here if needed
    }
  }, [data, validation]);

  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    
    if (isDisabled || isReadOnly || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate before submit
      if (validation) {
        const result = await validation(data);
        setValidationState(result);
        
        if (!result.isValid) {
          setIsSubmitting(false);
          return;
        }
      }
      
      await onSubmit(data);
      setIsSubmitted(true);
    } catch (error) {
      // Form submission error - could be logged here if needed
      // Handle submission error
    } finally {
      setIsSubmitting(false);
    }
  }, [data, validation, onSubmit, isDisabled, isReadOnly, isSubmitting]);

  const handleReset = useCallback(() => {
    setData(initialData || {} as T);
    setValidationState({
      isValid: true,
      errors: {},
      warnings: {},
      touched: {},
    });
    setIsSubmitted(false);
    onReset?.();
  }, [initialData, onReset]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    handleChange(field, value);
  }, [handleChange]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setValidationState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
      isValid: false,
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setValidationState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field as string];
      
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  // Create composition context
  const context = createContext({
    data,
    validation: validationState,
    isSubmitting,
    isSubmitted,
    isDisabled,
    isReadOnly,
    onSubmit: (data: T) => handleSubmit(),
    onReset: handleReset,
    onChange: handleChange,
    onValidate: handleValidate,
    setFieldValue,
    setFieldError,
    clearFieldError,
    sx,
  });

  // Form styles
  const formStyles = getCompositionStyles('stack', {
    gap: 'lg',
    align: 'stretch',
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={sx}
    >
      {/* Progress indicator */}
      {showProgress && isSubmitting && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
          }}
        />
      )}

      {/* Render with complete custom render prop */}
      {render ? (
        render(context.data)
      ) : (
        <Stack spacing={slotProps?.fields?.spacing || 3}>
          {/* Header Section */}
          {(slots?.header || title || description) && (
            <Box component={slotProps?.header?.component || 'div'}>
              {slots?.header ? (
                renderSlot('header', slots.header, context)
              ) : (
                <>
                  {title && (
                    <Typography variant="h5" component="h1" gutterBottom>
                      {title}
                    </Typography>
                  )}
                  {description && (
                    <Typography variant="body1" color="text.secondary" paragraph>
                      {description}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Validation Section */}
          {slots?.validation && (
            <Alert
              severity={slotProps?.validation?.severity || 'error'}
              sx={{ mb: 2 }}
            >
              {renderSlot('validation', slots.validation, context)}
            </Alert>
          )}

          {/* Fields Section */}
          {(slots?.fields || children) && (
            <Stack
              component={slotProps?.fields?.component || 'div'}
              direction={slotProps?.fields?.direction || 'column'}
              spacing={slotProps?.fields?.spacing || 2}
            >
              {slots?.fields && renderSlot('fields', slots.fields, context)}
              {children && renderChildren(children, context)}
            </Stack>
          )}

          {/* Help Section */}
          {slots?.help && (
            <Box component={slotProps?.help?.component || 'div'}>
              {renderSlot('help', slots.help, context)}
            </Box>
          )}

          {/* Actions Section */}
          {slots?.actions && (
            <Box
              component={slotProps?.actions?.component || 'div'}
              sx={{
                display: 'flex',
                gap: slotProps?.actions?.spacing || 2,
                justifyContent: slotProps?.actions?.justifyContent || 'flex-end',
                pt: 2,
              }}
            >
              {renderSlot('actions', slots.actions, context)}
            </Box>
          )}

          {/* Footer Section */}
          {slots?.footer && (
            <>
              {slotProps?.footer?.divider && <Divider sx={{ my: 2 }} />}
              <Box component={slotProps?.footer?.component || 'div'}>
                {renderSlot('footer', slots.footer, context)}
              </Box>
            </>
          )}
        </Stack>
      )}
    </Box>
  );
};

// ============================================================================
// COMPOSITION HELPERS
// ============================================================================

/**
 * Creates form slots with type safety
 */
export const createFormSlots = <T = any>(slots: FormSlots<T>): FormSlots<T> => slots;

/**
 * Creates form slot props with type safety
 */
export const createFormSlotProps = (slotProps: FormSlotProps): FormSlotProps => slotProps;

/**
 * Higher-order component for creating specialized form variants
 */
export const createFormVariant = <T extends object, D = any>(
  defaultProps: Partial<ComposableFormProps<D>>,
  defaultSlots?: FormSlots<D>
) => {
  return React.forwardRef<HTMLFormElement, ComposableFormProps<D> & T>((props, ref) => {
    const mergedSlots = defaultSlots ? { ...defaultSlots, ...props.slots } : props.slots;
    
    return (
      <ComposableForm
        {...defaultProps}
        {...props}
        slots={mergedSlots}
      />
    );
  });
};

// ============================================================================
// SPECIALIZED FORM VARIANTS
// ============================================================================

/**
 * LoginForm - Specialized form for login
 */
export const LoginForm = createFormVariant({
  title: 'Sign In',
  showProgress: true,
});

/**
 * ContactForm - Specialized form for contact information
 */
export const ContactForm = createFormVariant({
  title: 'Contact Us',
  description: 'Send us a message and we\'ll get back to you.',
});

/**
 * SettingsForm - Specialized form for settings
 */
export const SettingsForm = createFormVariant({
  title: 'Settings',
  showProgress: false,
});

/**
 * SearchForm - Specialized form for search
 */
export const SearchForm = createFormVariant({
  showProgress: false,
}, {
  actions: ({ onSubmit, onReset }) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <button type="button" onClick={onReset}>Clear</button>
      <button type="submit">Search</button>
    </Box>
  ),
});

export default ComposableForm;