import React from 'react';
import { TextField, InputAdornment, type TextFieldProps } from '@mui/material';
import { useFormFieldStyles } from '../../../../hooks/shared/useMuiUtils';

/**
 * Input component props extending Material-UI TextFieldProps
 * Implements consistent prop patterns with standardized naming conventions
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1
 */
interface InputProps extends Omit<TextFieldProps, 'variant' | 'size'> {
  /** Input variant following Material Design principles */
  variant?: 'outlined' | 'filled';
  /** Input size with consistent spacing */
  size?: 'small' | 'medium';
  /** Left icon (alias for startIcon) */
  leftIcon?: React.ReactNode;
  /** Right icon (alias for endIcon) */
  rightIcon?: React.ReactNode;
  /** Start icon */
  startIcon?: React.ReactNode;
  /** End icon */
  endIcon?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Clearable input */
  isClearable?: boolean;
  /** Full width */
  isFullWidth?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Required field */
  isRequired?: boolean;
  /** Multiline input */
  isMultiline?: boolean;
  /** Read-only input */
  isReadOnly?: boolean;
  /** Error state */
  hasError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Helper text */
  helpText?: string;
}

export const Input: React.FC<InputProps> = ({
  variant = 'outlined',
  size = 'medium',
  startIcon,
  endIcon,
  leftIcon,
  rightIcon,
  isLoading = false,
  isClearable = false,
  fullWidth = true,
  isDisabled = false,
  isRequired = false,
  isMultiline = false,
  isReadOnly = false,
  hasError = false,
  errorMessage,
  helpText,
  sx,
  ...props
}) => {

  const getFormFieldStyles = useFormFieldStyles();
  
  // Determine the state for styling
  const state = hasError ? 'error' : 'default';
  const formFieldStyles = getFormFieldStyles(variant, state);
  const actualHelperText = errorMessage || helpText;

  // Support both startIcon/endIcon and leftIcon/rightIcon prop names
  const actualStartIcon = startIcon || leftIcon;
  const actualEndIcon = endIcon || rightIcon;

  return (
    <TextField
      variant={variant}
      size={size}
      error={hasError}
      helperText={actualHelperText}
      fullWidth={fullWidth}
      disabled={isDisabled}
      required={isRequired}
      multiline={isMultiline}
      InputProps={{
        readOnly: isReadOnly,
        startAdornment: actualStartIcon ? (
          <InputAdornment position="start">
            {actualStartIcon}
          </InputAdornment>
        ) : undefined,
        endAdornment: actualEndIcon ? (
          <InputAdornment position="end">
            {actualEndIcon}
          </InputAdornment>
        ) : undefined,
        ...props.InputProps,
      }}
      sx={[
        formFieldStyles,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
};

export default Input;