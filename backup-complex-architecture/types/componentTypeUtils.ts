/**
 * Component type utilities for polymorphic and variant-based components
 */

import type { ElementType, ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';

// ============================================================================
// POLYMORPHIC COMPONENT TYPES
// ============================================================================

export type AnyComponent = ElementType;

export type PropsOf<C extends ElementType> = ComponentPropsWithoutRef<C>;

export type PolymorphicComponentProps<C extends ElementType, Props = {}> = Props & 
  Omit<ComponentPropsWithoutRef<C>, keyof Props> & {
    as?: C;
  };

export type PolymorphicComponentPropsWithRef<C extends ElementType, Props = {}> = Props & 
  Omit<ComponentPropsWithRef<C>, keyof Props> & {
    as?: C;
  };

// ============================================================================
// VARIANT TYPES
// ============================================================================

export type VariantUnion<T extends string> = T;

export type ButtonVariant = 'text' | 'outlined' | 'contained' | 'tonal' | 'filled';
export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type InputVariant = 'outlined' | 'filled' | 'standard';
export type LoadingVariant = 'circular' | 'linear' | 'skeleton';
export type ErrorVariant = 'inline' | 'toast' | 'banner';
export type SizeVariant = 'small' | 'medium' | 'large';
export type ColorVariant = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
export type SeverityVariant = 'error' | 'warning' | 'info' | 'success';

// ============================================================================
// COMPOSITION TYPES
// ============================================================================

export interface SlotProps<T = any> {
  [key: string]: T;
}

export interface GenericSlotProps extends SlotProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface TypedSlotProps<T> extends SlotProps<T> {
  data?: T;
}

export type RenderProp<T> = (props: T) => React.ReactNode;

export type ChildrenAsFunction<T> = (props: T) => React.ReactNode;

export interface CompositionProps<T = any> {
  children?: React.ReactNode | ChildrenAsFunction<T>;
  render?: RenderProp<T>;
  slots?: Record<string, RenderProp<T>>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type MergeProps<T, U> = Omit<T, keyof U> & U;

export type VariantProps<T extends string> = {
  variant?: T;
};

export type StateProps = {
  isLoading?: boolean;
  isDisabled?: boolean;
  isError?: boolean;
  isActive?: boolean;
  isSelected?: boolean;
};

export type EventHandlerProps = {
  onClick?: (event: React.MouseEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
};

export type StylingProps = {
  className?: string;
  style?: React.CSSProperties;
};

// ============================================================================
// COMPONENT FACTORY TYPES
// ============================================================================

export interface ComponentFactoryProps {
  displayName?: string;
  defaultProps?: Record<string, any>;
}

export type ComponentFactory<P = {}> = (props: ComponentFactoryProps) => React.ComponentType<P>;

export type HOC<P = {}, R = P> = (Component: React.ComponentType<P>) => React.ComponentType<R>;

// ============================================================================
// THEME-AWARE TYPES
// ============================================================================

export interface ThemeAwareProps {
  theme?: any; // Will be properly typed when theme is available
}

export type ResponsiveProp<T> = T | T[] | Record<string, T>;

export interface ResponsiveVariantProps<T extends string> {
  variant?: ResponsiveProp<T>;
}

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

export interface AriaProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  role?: string;
}

export interface KeyboardNavigationProps {
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onKeyUp?: (event: React.KeyboardEvent) => void;
}

export interface AccessibilityProps extends AriaProps, KeyboardNavigationProps {
  id?: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FormFieldProps {
  name?: string;
  value?: any;
  defaultValue?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type FieldValidator<T = any> = (value: T) => ValidationResult;

// ============================================================================
// ASYNC TYPES
// ============================================================================

export interface AsyncState<T = any> {
  data?: T;
  isLoading: boolean;
  error?: Error | string;
}

export interface AsyncComponentProps<T = any> extends AsyncState<T> {
  onRetry?: () => void;
  loadingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: Error | string; onRetry?: () => void }>;
}

// ============================================================================
// TYPE GUARDS AND VALIDATORS
// ============================================================================

export const isValidVariant = <T extends string>(value: any, validVariants: T[]): value is T => {
  return typeof value === 'string' && validVariants.includes(value as T);
};

export const isButtonVariant = (value: any): value is ButtonVariant => {
  return isValidVariant(value, BUTTON_VARIANTS);
};

export const isCardVariant = (value: any): value is CardVariant => {
  return isValidVariant(value, CARD_VARIANTS);
};

export const isSizeVariant = (value: any): value is SizeVariant => {
  return isValidVariant(value, SIZE_VARIANTS);
};

export const isColorVariant = (value: any): value is ColorVariant => {
  return isValidVariant(value, COLOR_VARIANTS);
};

export const isChildrenFunction = <T>(children: any): children is ChildrenAsFunction<T> => {
  return typeof children === 'function';
};

export const hasSlots = (props: any): props is { slots: Record<string, RenderProp<any>> } => {
  return props && typeof props.slots === 'object' && props.slots !== null;
};

// ============================================================================
// VARIANT CONSTANTS
// ============================================================================

export const BUTTON_VARIANTS: ButtonVariant[] = ['text', 'outlined', 'contained', 'tonal'];
export const CARD_VARIANTS: CardVariant[] = ['elevated', 'outlined', 'filled'];
export const INPUT_VARIANTS: InputVariant[] = ['outlined', 'filled', 'standard'];
export const LOADING_VARIANTS: LoadingVariant[] = ['circular', 'linear', 'skeleton'];
export const ERROR_VARIANTS: ErrorVariant[] = ['inline', 'toast', 'banner'];
export const SIZE_VARIANTS: SizeVariant[] = ['small', 'medium', 'large'];
export const COLOR_VARIANTS: ColorVariant[] = ['primary', 'secondary', 'error', 'warning', 'info', 'success'];
export const SEVERITY_VARIANTS: SeverityVariant[] = ['error', 'warning', 'info', 'success'];