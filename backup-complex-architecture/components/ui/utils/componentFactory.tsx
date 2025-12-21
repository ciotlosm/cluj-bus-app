/**
 * Type-safe component factory utilities
 * Provides utilities for creating consistent, type-safe components with variants
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React, { forwardRef } from 'react';
import type { ComponentType, ReactNode, ElementType } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import type {
  PolymorphicComponentPropsWithRef,
  ButtonVariant,
  CardVariant,
  InputVariant,
  SizeVariant,
  ColorVariant,
  ResponsiveProp,
  AccessibilityProps,
  CompositionProps,
} from '../../../types/componentTypeUtils';
import { useThemeUtils, useComponentStyles } from '../../../hooks';

// ============================================================================
// COMPONENT FACTORY TYPES
// ============================================================================

/**
 * Base component factory props
 * Validates Requirements: 8.1 (TypeScript interface completeness)
 */
interface BaseComponentFactoryProps extends AccessibilityProps {
  /** Component variant */
  variant?: string;
  /** Component size */
  size?: ResponsiveProp<SizeVariant>;
  /** Component color */
  color?: ColorVariant;
  /** Custom sx props */
  sx?: SxProps<Theme>;
  /** Component children */
  children?: ReactNode;
  /** Component class name */
  className?: string;
  /** Component test ID */
  testId?: string;
}

/**
 * Component factory configuration
 */
interface ComponentFactoryConfig<P = {}> {
  /** Default props for the component */
  defaultProps?: Partial<P>;
  /** Component display name */
  displayName?: string;
  /** Variant configurations */
  variants?: Record<string, Partial<P>>;
  /** Size configurations */
  sizes?: Record<string, Partial<P>>;
  /** Color configurations */
  colors?: Record<string, Partial<P>>;
  /** Custom style generator */
  styleGenerator?: (props: P) => SxProps<Theme>;
  /** Prop validator */
  propValidator?: (props: P) => boolean;
}

/**
 * Component factory return type
 */
type ComponentFactory<P> = ComponentType<P> & {
  displayName?: string;
  defaultProps?: Partial<P>;
};

// ============================================================================
// GENERIC COMPONENT FACTORY
// ============================================================================

/**
 * Creates a type-safe component with variant support
 * Validates Requirements: 8.5 (Generic component typing)
 */
function createComponent<P extends BaseComponentFactoryProps>(
  baseComponent: ComponentType<P>,
  config: ComponentFactoryConfig<P> = {}
): ComponentFactory<P> {
  const {
    defaultProps = {},
    displayName,
    variants = {},
    sizes = {},
    colors = {},
    styleGenerator,
    propValidator,
  } = config;

  const Component: ComponentType<P> = (props) => {
    // Merge props with defaults and variant-specific props
    const mergedProps = {
      ...defaultProps,
      ...props,
    } as P;

    // Apply variant-specific props
    if (mergedProps.variant && variants[mergedProps.variant]) {
      Object.assign(mergedProps, variants[mergedProps.variant]);
    }

    // Apply size-specific props
    if (mergedProps.size && typeof mergedProps.size === 'string' && sizes[mergedProps.size]) {
      Object.assign(mergedProps, sizes[mergedProps.size]);
    }

    // Apply color-specific props
    if (mergedProps.color && colors[mergedProps.color]) {
      Object.assign(mergedProps, colors[mergedProps.color]);
    }

    // Generate custom styles
    if (styleGenerator) {
      const customStyles = styleGenerator(mergedProps);
      mergedProps.sx = Array.isArray(mergedProps.sx) 
        ? [...mergedProps.sx, customStyles]
        : [mergedProps.sx, customStyles];
    }

    // Validate props
    if (propValidator && !propValidator(mergedProps)) {
      // Invalid props - could be logged here if needed
    }

    return React.createElement(baseComponent, mergedProps);
  };

  // Set display name
  if (displayName) {
    Component.displayName = displayName;
  }

  // Note: defaultProps are handled in the component logic above

  return Component as ComponentFactory<P>;
}

// ============================================================================
// POLYMORPHIC COMPONENT FACTORY
// ============================================================================

/**
 * Creates a polymorphic component with 'as' prop support
 * Validates Requirements: 8.4, 8.5 (Composition type safety, generic components)
 */
function createPolymorphicComponent<
  P extends BaseComponentFactoryProps,
  DefaultElement extends ElementType = 'div'
>(
  defaultElement: DefaultElement,
  config: ComponentFactoryConfig<P> = {}
) {
  const {
    defaultProps = {},
    displayName,
    variants = {},
    sizes = {},
    colors = {},
    styleGenerator,
    propValidator,
  } = config;

  type PolymorphicProps = PolymorphicComponentPropsWithRef<ElementType, P>;

  const Component = forwardRef<any, PolymorphicProps>(
    (allProps, ref) => {
      const Element = (allProps as any).as || defaultElement;
      const { as, ...props } = allProps as any;
      // Merge props with defaults and variant-specific props
      const mergedProps = {
        ...defaultProps,
        ...props,
      } as unknown as P;

      // Apply variant-specific props
      if (mergedProps.variant && variants[mergedProps.variant]) {
        Object.assign(mergedProps, variants[mergedProps.variant]);
      }

      // Apply size-specific props
      if (mergedProps.size && typeof mergedProps.size === 'string' && sizes[mergedProps.size]) {
        Object.assign(mergedProps, sizes[mergedProps.size]);
      }

      // Apply color-specific props
      if (mergedProps.color && colors[mergedProps.color]) {
        Object.assign(mergedProps, colors[mergedProps.color]);
      }

      // Generate custom styles
      if (styleGenerator) {
        const customStyles = styleGenerator(mergedProps);
        mergedProps.sx = Array.isArray(mergedProps.sx) 
          ? [...mergedProps.sx, customStyles]
          : [mergedProps.sx, customStyles];
      }

      // Validate props
      if (propValidator && !propValidator(mergedProps)) {
        // Invalid props - could be logged here if needed
      }

      return React.createElement(Element, { ref, ...mergedProps });
    }
  );

  // Set display name
  if (displayName) {
    Component.displayName = displayName;
  }

  return Component;
}

// ============================================================================
// VARIANT COMPONENT FACTORY
// ============================================================================

/**
 * Creates a component with predefined variants
 * Validates Requirements: 8.3 (Variant type safety)
 */
function createVariantComponent<
  P extends BaseComponentFactoryProps,
  V extends string
>(
  baseComponent: ComponentType<P>,
  variantConfig: Record<V, Partial<P>>,
  config: Omit<ComponentFactoryConfig<P>, 'variants'> = {}
): ComponentFactory<P & { variant?: V }> {
  return createComponent(baseComponent, {
    ...config,
    variants: variantConfig,
  }) as ComponentFactory<P & { variant?: V }>;
}

// ============================================================================
// COMPOSITION COMPONENT FACTORY
// ============================================================================

/**
 * Creates a component with composition support (slots, render props)
 * Validates Requirements: 8.4 (Composition type safety)
 */
function createCompositionComponent<
  P extends BaseComponentFactoryProps & CompositionProps<any>
>(
  config: ComponentFactoryConfig<P> & {
    renderComponent: (props: P) => ReactNode;
  }
): ComponentFactory<P> {
  const { renderComponent, ...factoryConfig } = config;

  const BaseComponent: ComponentType<P> = (props) => {
    const { render, slots, children, ...restProps } = props;

    // Handle render prop pattern
    if (render && typeof render === 'function') {
      return <>{render(restProps)}</>;
    }

    // Handle slot-based composition
    if (slots) {
      return <>{renderComponent({ ...restProps, slots, children } as P)}</>;
    }

    // Handle children as function
    if (typeof children === 'function') {
      return <>{children(restProps)}</>;
    }

    // Default rendering
    return <>{renderComponent(props)}</>;
  };

  return createComponent(BaseComponent, factoryConfig);
}

// ============================================================================
// HIGHER-ORDER COMPONENT FACTORY
// ============================================================================

/**
 * Creates a higher-order component with type safety
 * Validates Requirements: 8.5 (Generic component typing)
 */
function createHOC<InjectedProps = {}, AdditionalProps = {}>(
  hocLogic: (props: any) => InjectedProps,
  config: {
    displayName?: string;
    propValidator?: (props: any) => boolean;
  } = {}
) {
  return function withHOC<P extends object>(
    WrappedComponent: ComponentType<P>
  ): ComponentType<Omit<P, keyof InjectedProps> & AdditionalProps> {
    const HOCComponent: ComponentType<Omit<P, keyof InjectedProps> & AdditionalProps> = (props) => {
      const injectedProps = hocLogic(props);
      
      // Validate props
      if (config.propValidator && !config.propValidator(props)) {
        // Invalid props - could be logged here if needed
      }

      const combinedProps = { ...props, ...injectedProps } as unknown as P;
      return React.createElement(WrappedComponent, combinedProps);
    };

    // Set display name
    if (config.displayName) {
      HOCComponent.displayName = config.displayName;
    } else if (WrappedComponent.displayName || WrappedComponent.name) {
      HOCComponent.displayName = `withHOC(${WrappedComponent.displayName || WrappedComponent.name})`;
    }

    return HOCComponent;
  };
}

// ============================================================================
// THEME-AWARE COMPONENT FACTORY
// ============================================================================

/**
 * Creates a component with theme integration
 * Validates Requirements: 8.2 (Material-UI type extension)
 */
function createThemeAwareComponent<P extends BaseComponentFactoryProps>(
  renderComponent: (props: P, theme: Theme, utils: ReturnType<typeof useThemeUtils>) => ReactNode,
  config: ComponentFactoryConfig<P> = {}
): ComponentFactory<P> {
  const BaseComponent: ComponentType<P> = (props) => {
    const themeUtils = useThemeUtils();
    return <>{renderComponent(props, themeUtils.theme, themeUtils)}</>;
  };

  return createComponent(BaseComponent, config);
}

// ============================================================================
// RESPONSIVE COMPONENT FACTORY
// ============================================================================

/**
 * Creates a component with responsive prop support
 * Validates Requirements: 8.3 (Variant type safety)
 */
function createResponsiveComponent<P extends BaseComponentFactoryProps>(
  baseComponent: ComponentType<P>,
  responsiveProps: (keyof P)[],
  config: ComponentFactoryConfig<P> = {}
): ComponentFactory<P> {
  const ResponsiveComponent: ComponentType<P> = (props) => {
    const { theme } = useThemeUtils();
    
    // Process responsive props
    const processedProps = { ...props };
    
    responsiveProps.forEach((propName) => {
      const propValue = props[propName];
      
      if (propValue && typeof propValue === 'object' && !React.isValidElement(propValue)) {
        // Convert responsive prop to sx styles
        const responsiveStyles: SxProps<Theme> = {};
        
        Object.entries(propValue).forEach(([breakpoint, value]) => {
          if (breakpoint === 'xs') {
            responsiveStyles[propName as string] = value;
          } else {
            responsiveStyles[theme.breakpoints.up(breakpoint as 'sm' | 'md' | 'lg' | 'xl')] = {
              [propName as string]: value,
            };
          }
        });
        
        // Merge with existing sx
        processedProps.sx = Array.isArray(processedProps.sx)
          ? [...processedProps.sx, responsiveStyles]
          : [processedProps.sx, responsiveStyles];
        
        // Remove the responsive prop
        delete processedProps[propName];
      }
    });

    return React.createElement(baseComponent, processedProps);
  };

  return createComponent(ResponsiveComponent, config);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Type guard to check if a component has a specific prop
 */
function hasComponentProp<T extends object, K extends keyof T>(
  props: T,
  propName: K
): props is T & Required<Pick<T, K>> {
  return propName in props && props[propName] !== undefined;
}

/**
 * Merge component props with type safety
 */
function mergeComponentProps<T extends object, U extends object>(
  baseProps: T,
  overrideProps: U
): T & U {
  return { ...baseProps, ...overrideProps };
}

/**
 * Extract specific props from component props
 */
function extractProps<T extends object, K extends keyof T>(
  props: T,
  keys: K[]
): Pick<T, K> {
  const extracted = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in props) {
      extracted[key] = props[key];
    }
  });
  return extracted;
}

/**
 * Omit specific props from component props
 */
function omitProps<T extends object, K extends keyof T>(
  props: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...props };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export {
  createComponent,
  createPolymorphicComponent,
  createVariantComponent,
  createCompositionComponent,
  createHOC,
  createThemeAwareComponent,
  createResponsiveComponent,
  hasComponentProp,
  mergeComponentProps,
  extractProps,
  omitProps,
};

export type {
  BaseComponentFactoryProps,
  ComponentFactoryConfig,
  ComponentFactory,
};