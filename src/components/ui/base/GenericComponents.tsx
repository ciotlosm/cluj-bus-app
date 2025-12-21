/**
 * Generic UI components with advanced TypeScript integration
 * Demonstrates polymorphic components, type-safe variants, and composition patterns
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React, { forwardRef } from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type {
  PolymorphicComponentPropsWithRef,
  ButtonVariant,
  SizeVariant,
  ColorVariant,
  CompositionProps,
  ResponsiveProp,
  AccessibilityProps,
  GenericSlotProps,
} from '../../../types/componentTypeUtils';
import { useThemeUtils, useComponentStyles } from '../../../hooks';

// ============================================================================
// POLYMORPHIC BOX COMPONENT
// ============================================================================

/**
 * Generic Box component props with polymorphic support
 * Validates Requirements: 8.5 (Generic component typing)
 */
interface GenericBoxProps extends AccessibilityProps {
  /** Responsive padding */
  p?: ResponsiveProp<'xs' | 'sm' | 'md' | 'lg' | 'xl'>;
  /** Responsive margin */
  m?: ResponsiveProp<'xs' | 'sm' | 'md' | 'lg' | 'xl'>;
  /** Background color variant */
  bg?: 'paper' | 'default' | 'primary' | 'secondary';
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Shadow elevation */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom sx props */
  sx?: SxProps<Theme>;
  /** Children content */
  children?: React.ReactNode;
}

/**
 * Polymorphic Box component that can render as any HTML element
 * Demonstrates advanced TypeScript generic component patterns
 */
const GenericBox = forwardRef<
  HTMLElement,
  PolymorphicComponentPropsWithRef<React.ElementType, GenericBoxProps>
>(({ as: Component = 'div', p, m, bg = 'paper', rounded = 'md', shadow = 'none', sx, children, ...props }, ref) => {
  const { getSpacing, getBorderRadius, getShadows, getBackgroundColors } = useThemeUtils();
  
  const spacing = getSpacing();
  const borderRadius = getBorderRadius();
  const shadows = getShadows();
  const backgrounds = getBackgroundColors();

  // Map responsive props to theme values
  const getPaddingValue = (value: ResponsiveProp<'xs' | 'sm' | 'md' | 'lg' | 'xl'>) => {
    if (typeof value === 'string') return spacing[value];
    if (typeof value === 'object') {
      return Object.entries(value).reduce((acc, [breakpoint, val]) => {
        acc[breakpoint] = spacing[val as keyof typeof spacing];
        return acc;
      }, {} as any);
    }
    return undefined;
  };

  const getMarginValue = (value: ResponsiveProp<'xs' | 'sm' | 'md' | 'lg' | 'xl'>) => {
    if (typeof value === 'string') return spacing[value];
    if (typeof value === 'object') {
      return Object.entries(value).reduce((acc, [breakpoint, val]) => {
        acc[breakpoint] = spacing[val as keyof typeof spacing];
        return acc;
      }, {} as any);
    }
    return undefined;
  };

  const backgroundMap = {
    paper: backgrounds.paper,
    default: backgrounds.default,
    primary: backgrounds.surface,
    secondary: backgrounds.surfaceVariant,
  };

  const shadowMap = {
    none: shadows.none,
    sm: shadows.light,
    md: shadows.medium,
    lg: shadows.heavy,
    xl: shadows.highest,
  };

  const boxSx: SxProps<Theme> = {
    padding: p ? getPaddingValue(p) : undefined,
    margin: m ? getMarginValue(m) : undefined,
    bgcolor: backgroundMap[bg],
    borderRadius: borderRadius[rounded],
    boxShadow: shadowMap[shadow],
    ...sx,
  };

  return (
    <Box
      ref={ref}
      component={Component}
      sx={boxSx}
      {...props}
    >
      {children}
    </Box>
  );
});

GenericBox.displayName = 'GenericBox';

// ============================================================================
// GENERIC BUTTON WITH ADVANCED VARIANTS
// ============================================================================

/**
 * Generic Button component props with comprehensive type safety
 * Validates Requirements: 8.1, 8.2, 8.3 (TypeScript interfaces, Material-UI extension, variant type safety)
 */
interface GenericButtonProps<T = any> extends AccessibilityProps, CompositionProps<T> {
  /** Button variant with type safety */
  variant?: ButtonVariant;
  /** Button size with type safety */
  size?: SizeVariant;
  /** Button color with type safety */
  color?: ColorVariant;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Full width */
  isFullWidth?: boolean;
  /** Start icon */
  startIcon?: React.ReactNode;
  /** End icon */
  endIcon?: React.ReactNode;
  /** Click handler with generic event data */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>, data?: T) => void;
  /** Custom sx props */
  sx?: SxProps<Theme>;
  /** Button text/content */
  children?: React.ReactNode;
  /** Generic data to pass to event handlers */
  data?: T;
}

/**
 * Generic Button component with advanced TypeScript integration
 * Demonstrates type-safe variants and generic event handling
 */
function GenericButton<T = any>({
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  isLoading = false,
  isDisabled = false,
  isFullWidth = false,
  startIcon,
  endIcon,
  onClick,
  sx,
  children,
  data,
  render,
  slots,
  ...props
}: GenericButtonProps<T>) {
  const { getButtonVariantStyles } = useComponentStyles();
  
  const buttonStyles = getButtonVariantStyles(
    variant === 'contained' ? 'filled' : variant, 
    color === 'info' ? 'primary' : color
  );
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick && !isDisabled && !isLoading) {
      onClick(event, data);
    }
  };

  // Handle render prop pattern
  if (render) {
    return <>{render(data as T)}</>;
  }

  // Handle slot-based composition
  if (slots) {
    return (
      <GenericBox as="div" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {slots.header}
        <GenericBox
          as="button"
          onClick={handleClick}
          isDisabled={isDisabled || isLoading}
          sx={{
            ...buttonStyles,
            width: isFullWidth ? '100%' : 'auto',
            ...sx,
          }}
          {...props}
        >
          {startIcon}
          {slots.content || children}
          {endIcon}
        </GenericBox>
        {slots.footer}
      </GenericBox>
    );
  }

  return (
    <GenericBox
      as="button"
      onClick={handleClick}
      isDisabled={isDisabled || isLoading}
      sx={{
        ...buttonStyles,
        width: isFullWidth ? '100%' : 'auto',
        ...sx,
      }}
      {...props}
    >
      {startIcon}
      {children}
      {endIcon}
    </GenericBox>
  );
}

// ============================================================================
// GENERIC LIST COMPONENT WITH TYPE SAFETY
// ============================================================================

/**
 * Generic List component props with type-safe item rendering
 * Validates Requirements: 8.4, 8.5 (Composition type safety, generic components)
 */
interface GenericListProps<T> extends AccessibilityProps {
  /** Array of items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optional key extractor */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state component */
  emptyComponent?: React.ReactNode;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** List variant */
  variant?: 'default' | 'dense' | 'comfortable';
  /** Dividers between items */
  showDividers?: boolean;
  /** Custom sx props */
  sx?: SxProps<Theme>;
  /** Item click handler */
  onItemClick?: (item: T, index: number) => void;
  /** Item selection */
  selectedItems?: T[];
  /** Selection change handler */
  onSelectionChange?: (selectedItems: T[]) => void;
  /** Multi-select mode */
  multiSelect?: boolean;
}

/**
 * Generic List component with comprehensive type safety
 * Demonstrates generic component patterns with type inference
 */
function GenericList<T>({
  items,
  renderItem,
  keyExtractor = (_, index) => index,
  isLoading = false,
  emptyComponent,
  loadingComponent,
  variant = 'default',
  showDividers = true,
  sx,
  onItemClick,
  selectedItems = [],
  onSelectionChange,
  multiSelect = false,
  ...props
}: GenericListProps<T>) {
  const { getSpacing, getBorderColors } = useThemeUtils();
  const spacing = getSpacing();
  const borders = getBorderColors();

  const variantStyles = {
    default: { padding: spacing.md },
    dense: { padding: spacing.sm },
    comfortable: { padding: spacing.lg },
  };

  const handleItemClick = (item: T, index: number) => {
    if (onItemClick) {
      onItemClick(item, index);
    }

    if (onSelectionChange) {
      if (multiSelect) {
        const isSelected = selectedItems.includes(item);
        const newSelection = isSelected
          ? selectedItems.filter(selected => selected !== item)
          : [...selectedItems, item];
        onSelectionChange(newSelection);
      } else {
        onSelectionChange([item]);
      }
    }
  };

  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  if (items.length === 0 && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  return (
    <GenericBox
      as="ul"
      sx={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        ...sx,
      }}
      {...props}
    >
      {items.map((item, index) => {
        const key = keyExtractor(item, index);
        const isSelected = selectedItems.includes(item);
        const isLast = index === items.length - 1;

        return (
          <GenericBox
            key={key}
            as="li"
            onClick={() => handleItemClick(item, index)}
            sx={{
              ...variantStyles[variant],
              borderBottom: showDividers && !isLast ? `1px solid ${borders.divider}` : 'none',
              backgroundColor: isSelected ? 'action.selected' : 'transparent',
              cursor: onItemClick || onSelectionChange ? 'pointer' : 'default',
              '&:hover': {
                backgroundColor: onItemClick || onSelectionChange ? 'action.hover' : 'transparent',
              },
            }}
          >
            {renderItem(item, index)}
          </GenericBox>
        );
      })}
    </GenericBox>
  );
}

// ============================================================================
// GENERIC FORM FIELD COMPONENT
// ============================================================================

/**
 * Generic Form Field component props with validation support
 * Validates Requirements: 8.1, 8.4 (TypeScript interfaces, composition type safety)
 */
interface GenericFormFieldProps<T> extends AccessibilityProps {
  /** Field name */
  name: string;
  /** Field label */
  label?: string;
  /** Field value */
  value?: T;
  /** Default value */
  defaultValue?: T;
  /** Change handler */
  onChange?: (value: T, name: string) => void;
  /** Blur handler */
  onBlur?: (name: string) => void;
  /** Focus handler */
  onFocus?: (name: string) => void;
  /** Validation error */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Required field */
  isRequired?: boolean;
  /** Disabled field */
  isDisabled?: boolean;
  /** Read-only field */
  isReadOnly?: boolean;
  /** Field touched state */
  isTouched?: boolean;
  /** Custom field renderer */
  renderField: (props: {
    value?: T;
    onChange: (value: T) => void;
    onBlur: () => void;
    onFocus: () => void;
    error?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => React.ReactNode;
  /** Custom sx props */
  sx?: SxProps<Theme>;
}

/**
 * Generic Form Field component with comprehensive validation support
 * Demonstrates generic form handling patterns
 */
function GenericFormField<T>({
  name,
  label,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  error,
  helpText,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  isTouched = false,
  renderField,
  sx,
  ...props
}: GenericFormFieldProps<T>) {
  const { getSpacing } = useThemeUtils();
  const spacing = getSpacing();

  const fieldId = `field-${name}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  const handleChange = (newValue: T) => {
    if (onChange && !isDisabled && !isReadOnly) {
      onChange(newValue, name);
    }
  };

  const handleBlur = () => {
    if (onBlur && !isDisabled) {
      onBlur(name);
    }
  };

  const handleFocus = () => {
    if (onFocus && !isDisabled) {
      onFocus(name);
    }
  };

  return (
    <GenericBox
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
        ...sx,
      }}
      {...props}
    >
      {label && (
        <Typography
          component="label"
          htmlFor={fieldId}
          variant="body2"
          sx={{
            fontWeight: 500,
            color: error ? 'error.main' : 'text.primary',
          }}
        >
          {label}
          {isRequired && (
            <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>
      )}

      {renderField({
        value: value ?? defaultValue,
        onChange: handleChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        error,
        disabled: isDisabled,
        readOnly: isReadOnly,
        required: isRequired,
        'aria-describedby': describedBy,
        'aria-invalid': !!error,
      })}

      {(error || helpText) && (
        <Typography
          variant="caption"
          id={error ? errorId : helpId}
          sx={{
            color: error ? 'error.main' : 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          {error || helpText}
        </Typography>
      )}
    </GenericBox>
  );
}

// ============================================================================
// GENERIC DATA DISPLAY COMPONENT
// ============================================================================

/**
 * Generic Data Display component props with async state support
 * Validates Requirements: 8.5 (Generic component typing)
 */
interface GenericDataDisplayProps<T, E = Error> extends AccessibilityProps {
  /** Data to display */
  data?: T;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: E;
  /** Success state */
  isSuccess?: boolean;
  /** Data renderer */
  renderData: (data: T) => React.ReactNode;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** Error component renderer */
  renderError?: (error: E, retry?: () => void) => React.ReactNode;
  /** Empty state component */
  emptyComponent?: React.ReactNode;
  /** Retry handler */
  onRetry?: () => void;
  /** Custom sx props */
  sx?: SxProps<Theme>;
}

/**
 * Generic Data Display component with async state management
 * Demonstrates generic error handling and state management patterns
 */
function GenericDataDisplay<T, E = Error>({
  data,
  isLoading = false,
  error,
  isSuccess = false,
  renderData,
  loadingComponent,
  renderError,
  emptyComponent,
  onRetry,
  sx,
  ...props
}: GenericDataDisplayProps<T, E>) {
  // Loading state
  if (isLoading && loadingComponent) {
    return (
      <GenericBox sx={sx} {...props}>
        {loadingComponent}
      </GenericBox>
    );
  }

  // Error state
  if (error && renderError) {
    return (
      <GenericBox sx={sx} {...props}>
        {renderError(error, onRetry)}
      </GenericBox>
    );
  }

  // Empty state
  if (!data && emptyComponent) {
    return (
      <GenericBox sx={sx} {...props}>
        {emptyComponent}
      </GenericBox>
    );
  }

  // Success state with data
  if (data && isSuccess) {
    return (
      <GenericBox sx={sx} {...props}>
        {renderData(data)}
      </GenericBox>
    );
  }

  // Fallback
  return (
    <GenericBox sx={sx} {...props}>
      {data ? renderData(data) : null}
    </GenericBox>
  );
}

// ============================================================================
// EXPORT ALL COMPONENTS
// ============================================================================

export {
  GenericBox,
  GenericButton,
  GenericList,
  GenericFormField,
  GenericDataDisplay,
};

export type {
  GenericBoxProps,
  GenericButtonProps,
  GenericListProps,
  GenericFormFieldProps,
  GenericDataDisplayProps,
};