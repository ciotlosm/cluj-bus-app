/**
 * Component prop validation utilities
 * Ensures consistent prop patterns across all components
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1
 */

import type {
  StandardCompositionProps,
  StandardStylingProps,
  StandardStateProps,
  StandardConfigProps
} from '../types/componentProps';
import type {
  ButtonVariant,
  SizeVariant,
  ColorVariant,
  SeverityVariant
} from '../types/componentTypeUtils';

// ============================================================================
// PROP VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that event handler props follow consistent naming conventions
 */
export const validateEventHandlerProps = (props: Record<string, any>): string[] => {
  const errors: string[] = [];
  const validEventHandlers = [
    'onClick', 'onDoubleClick', 'onKeyDown', 'onFocus', 'onBlur', 
    'onChange', 'onSubmit', 'onCancel', 'onClear', 'onToggle',
    'onShow', 'onHide', 'onNavigate', 'onBack', 'onNext',
    'onRefresh', 'onReload', 'onRetry', 'onSelect', 'onDeselect'
  ];

  Object.keys(props).forEach(propName => {
    if (propName.startsWith('on') && typeof props[propName] === 'function') {
      if (!validEventHandlers.includes(propName)) {
        errors.push(`Invalid event handler prop: ${propName}. Use standard naming conventions.`);
      }
    }
  });

  return errors;
};

/**
 * Validates that state props follow consistent naming conventions
 */
export const validateStateProps = (props: Record<string, any>): string[] => {
  const errors: string[] = [];
  const validStatePrefixes = ['is', 'has', 'can', 'should', 'will'];
  const validStateProps = [
    'isLoading', 'hasError', 'isSuccess', 'isActive', 'isSelected',
    'isExpanded', 'isVisible', 'isOpen', 'isFocused', 'isHovered',
    'isPressed', 'isReadOnly', 'isRequired', 'isValid', 'isDirty',
    'isTouched', 'isSubmitting', 'isClearable', 'isInteractive'
  ];

  Object.keys(props).forEach(propName => {
    if (typeof props[propName] === 'boolean') {
      const hasValidPrefix = validStatePrefixes.some(prefix => propName.startsWith(prefix));
      const isValidStateProp = validStateProps.includes(propName);
      
      if (!hasValidPrefix && !isValidStateProp && !propName.startsWith('aria-')) {
        errors.push(`Invalid state prop: ${propName}. Use 'is', 'has', 'can', 'should', or 'will' prefixes.`);
      }
    }
  });

  return errors;
};

/**
 * Validates that styling props follow consistent patterns
 */
export const validateStylingProps = (props: Record<string, any>): string[] => {
  const errors: string[] = [];
  const validSizes: SizeVariant[] = ['small', 'medium', 'large'];
  const validColors: ColorVariant[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];

  // Validate size prop
  if (props.size && !validSizes.includes(props.size)) {
    errors.push(`Invalid size prop: ${props.size}. Use 'small', 'medium', or 'large'.`);
  }

  // Validate color prop
  if (props.color && !validColors.includes(props.color)) {
    errors.push(`Invalid color prop: ${props.color}. Use standard color variants.`);
  }

  // Check for deprecated styling props
  const deprecatedProps = ['loading', 'error', 'clearable', 'interactive'];
  deprecatedProps.forEach(prop => {
    if (props[prop] !== undefined) {
      const newProp = prop === 'loading' ? 'isLoading' :
                     prop === 'error' ? 'hasError' :
                     prop === 'clearable' ? 'isClearable' :
                     prop === 'interactive' ? 'isInteractive' : prop;
      errors.push(`Deprecated prop: ${prop}. Use ${newProp} instead.`);
    }
  });

  return errors;
};

/**
 * Validates component variant props
 */
export const validateVariantProps = <T extends string>(
  variant: T | undefined,
  validVariants: T[],
  componentName: string
): string[] => {
  const errors: string[] = [];

  if (variant && !validVariants.includes(variant)) {
    errors.push(`Invalid variant for ${componentName}: ${variant}. Valid variants: ${validVariants.join(', ')}.`);
  }

  return errors;
};

/**
 * Validates accessibility props
 */
export const validateAccessibilityProps = (props: Record<string, any>): string[] => {
  const errors: string[] = [];

  // Check for missing aria-label when interactive
  if (props.onClick && !props['aria-label'] && !props['aria-labelledby'] && !props.children) {
    errors.push('Interactive elements should have aria-label or aria-labelledby for accessibility.');
  }

  // Check for proper role usage
  if (props.role && props.onClick && props.role !== 'button' && props.role !== 'link') {
    errors.push('Interactive elements with onClick should have role="button" or role="link".');
  }

  return errors;
};

// ============================================================================
// COMPREHENSIVE PROP VALIDATION
// ============================================================================

/**
 * Comprehensive prop validation for all components
 */
export const validateComponentProps = (
  props: Record<string, any>,
  componentName: string,
  validVariants?: string[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate event handlers
  errors.push(...validateEventHandlerProps(props));

  // Validate state props
  errors.push(...validateStateProps(props));

  // Validate styling props
  errors.push(...validateStylingProps(props));

  // Validate variants if provided
  if (validVariants && props.variant) {
    errors.push(...validateVariantProps(props.variant, validVariants, componentName));
  }

  // Validate accessibility
  warnings.push(...validateAccessibilityProps(props));

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// PROP TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Transforms legacy props to standardized props
 */
export const transformLegacyProps = (props: Record<string, any>): Record<string, any> => {
  const transformed = { ...props };

  // Transform legacy prop names
  const propMappings: Record<string, string> = {
    loading: 'isLoading',
    error: 'hasError',
    clearable: 'isClearable',
    interactive: 'isInteractive',
    fullHeight: 'isFullHeight',
    leftIcon: 'startIcon',
    rightIcon: 'endIcon',
    icon: 'startIcon'
  };

  Object.entries(propMappings).forEach(([oldProp, newProp]) => {
    if (transformed[oldProp] !== undefined && transformed[newProp] === undefined) {
      transformed[newProp] = transformed[oldProp];
      delete transformed[oldProp];
    }
  });

  return transformed;
};

/**
 * Extracts standard props from component props
 */
export const extractStandardProps = (props: Record<string, any>): {
  standardProps: StandardCompositionProps;
  remainingProps: Record<string, any>;
} => {
  const standardPropKeys = [
    'sx', 'className', 'variant', 'size', 'color', 'fullWidth', 'disabled',
    'padding', 'borderRadius', 'elevation', 'isInteractive',
    'isLoading', 'hasError', 'isSuccess', 'isActive', 'isSelected',
    'isExpanded', 'isVisible', 'isOpen', 'isFocused',
    'id', 'name', 'label', 'placeholder', 'value', 'defaultValue',
    'children', 'icon', 'startIcon', 'endIcon',
    'onClick', 'onDoubleClick', 'onKeyDown', 'onFocus', 'onBlur',
    'onChange', 'onSubmit', 'onCancel', 'onClear',
    'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
    'aria-selected', 'aria-disabled', 'aria-hidden', 'tabIndex', 'role',
    'data-testid'
  ];

  const standardProps: Partial<StandardCompositionProps> = {};
  const remainingProps: Record<string, any> = {};

  Object.entries(props).forEach(([key, value]) => {
    if (standardPropKeys.includes(key) || key.startsWith('data-')) {
      (standardProps as any)[key] = value;
    } else {
      remainingProps[key] = value;
    }
  });

  return {
    standardProps: standardProps as StandardCompositionProps,
    remainingProps
  };
};

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Development-only prop validation (removed in production)
 */
export const devValidateProps = (
  props: Record<string, any>,
  componentName: string,
  validVariants?: string[]
): void => {
  if (process.env.NODE_ENV === 'development') {
    const validation = validateComponentProps(props, componentName, validVariants);
    
    if (!validation.isValid) {
      // Prop validation errors - could be logged here if needed
    }
    
    if (validation.warnings.length > 0) {
      // Prop validation warnings - could be logged here if needed
    }
  }
};

/**
 * Creates a prop validator hook for components
 */
export const createPropValidator = (componentName: string, validVariants?: string[]) => {
  return (props: Record<string, any>) => {
    devValidateProps(props, componentName, validVariants);
    return transformLegacyProps(props);
  };
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for standard component props
 */
export const isStandardComponentProps = (props: any): props is StandardCompositionProps => {
  return typeof props === 'object' && props !== null;
};

/**
 * Type guard for valid component size
 */
export const isValidSize = (size: any): size is SizeVariant => {
  return ['small', 'medium', 'large'].includes(size);
};

/**
 * Type guard for valid component color
 */
export const isValidColor = (color: any): color is ColorVariant => {
  return ['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(color);
};

/**
 * Type guard for valid component state
 */
export const isValidState = (state: any): state is SeverityVariant => {
  return ['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'error'].includes(state);
};