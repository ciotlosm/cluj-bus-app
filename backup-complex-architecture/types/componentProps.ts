/**
 * Standard component prop types for consistent interfaces
 */

import type { ReactNode, CSSProperties } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import type { CardProps as MuiCardProps } from '@mui/material/Card';
import type { TextFieldProps } from '@mui/material/TextField';

// ============================================================================
// STANDARD PROP PATTERNS
// ============================================================================

export interface StandardEventHandlers {
  onClick?: (event: React.MouseEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

export interface StandardStylingProps {
  className?: string;
  style?: CSSProperties;
  sx?: SxProps<Theme>;
}

export interface StandardStateProps {
  isLoading?: boolean;
  isDisabled?: boolean;
  isError?: boolean;
}

export interface StandardConfigProps {
  id?: string;
  testId?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface StandardCompositionProps {
  children?: ReactNode;
}

// ============================================================================
// ENHANCED COMPONENT PROPS
// ============================================================================

export interface StandardButtonProps<T = string> extends StandardEventHandlers, StandardStylingProps, StandardStateProps, StandardConfigProps {
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  isFullWidth?: boolean;
  icon?: ReactNode;
  value?: T;
}

export interface StandardInputProps<T = string> extends StandardStylingProps, StandardStateProps, StandardConfigProps {
  value?: T;
  defaultValue?: T;
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  onChange?: (value: T, event?: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export interface StandardCardProps extends StandardStylingProps, StandardStateProps, StandardConfigProps, StandardCompositionProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: (event: React.MouseEvent) => void;
}

export interface StandardModalProps extends StandardStylingProps, StandardConfigProps, StandardCompositionProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface StandardLoadingProps extends StandardStylingProps, StandardConfigProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'circular' | 'linear';
  message?: string;
}

export interface StandardErrorProps extends StandardStylingProps, StandardConfigProps {
  message: string;
  severity?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  isRetryable?: boolean;
}

export interface StandardEmptyStateProps extends StandardStylingProps, StandardConfigProps, StandardCompositionProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

// ============================================================================
// EXTENDED MATERIAL-UI PROPS
// ============================================================================

export interface ExtendedButtonProps extends Omit<MuiButtonProps, 'size' | 'variant' | 'color'> {
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  icon?: ReactNode;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loadingText?: string;
  iconPosition?: 'start' | 'end';
}

export interface ExtendedInputProps extends Omit<TextFieldProps, 'size' | 'variant' | 'defaultValue'> {
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  defaultValue?: string;
  // Additional input-specific props
}

export interface ExtendedCardProps extends Omit<MuiCardProps, 'variant' | 'elevation'> {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  isLoading?: boolean;
  hasError?: boolean;
  isInteractive?: boolean;
  elevation?: number;
}