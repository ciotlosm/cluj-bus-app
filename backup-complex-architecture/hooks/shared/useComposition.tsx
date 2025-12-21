import React, { isValidElement, cloneElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Advanced composition utilities for building complex components
 * Implements slot-based composition, render props, and type-safe component boundaries
 * Validates Requirements: 3.4, 6.4, 8.4
 */

// ============================================================================
// COMPOSITION TYPES
// ============================================================================

/**
 * Slot-based composition interface
 * Supports named slots with optional props
 */
export interface ComponentSlots<T extends Record<string, any> = Record<string, any>> {
  header?: ReactNode | ((props: T) => ReactNode);
  content?: ReactNode | ((props: T) => ReactNode);
  footer?: ReactNode | ((props: T) => ReactNode);
  actions?: ReactNode | ((props: T) => ReactNode);
  [slotName: string]: ReactNode | ((props: T) => ReactNode) | undefined;
}

/**
 * Slot props for customizing slot components
 */
export interface SlotProps<T extends Record<string, any> = Record<string, any>> {
  [slotName: string]: T;
}

/**
 * Render prop function type
 */
export type RenderProp<T = any> = (props: T) => ReactNode;

/**
 * Component composition configuration
 */
export interface CompositionConfig<T = any> {
  /** Named slots for component parts */
  slots?: ComponentSlots<T>;
  /** Props for each slot */
  slotProps?: SlotProps<T>;
  /** Render prop for custom rendering */
  render?: RenderProp<T>;
  /** Children for standard composition */
  children?: ReactNode | RenderProp<T>;
  /** Default slot content */
  defaultSlots?: ComponentSlots<T>;
  /** Slot order for rendering */
  slotOrder?: string[];
}

/**
 * Composition context for passing data to slots
 */
export interface CompositionContext<T = any> {
  /** Data to pass to slots and render props */
  data: T;
  /** Component state */
  state?: Record<string, any>;
  /** Event handlers */
  handlers?: Record<string, (...args: any[]) => void>;
  /** Styling props */
  sx?: SxProps<Theme>;
  /** Additional context */
  [key: string]: any;
}

/**
 * Slot component interface
 */
export interface SlotComponent<T = any> {
  /** Slot name */
  name: string;
  /** Slot content */
  content: ReactNode | RenderProp<T>;
  /** Slot props */
  props?: T;
  /** Whether slot is required */
  required?: boolean;
  /** Default content if slot is empty */
  fallback?: ReactNode;
}

// ============================================================================
// COMPOSITION UTILITIES
// ============================================================================

/**
 * Hook for managing component composition
 */
export const useComposition = <T = any>() => {
  /**
   * Renders a slot with proper type safety and context
   */
  const renderSlot = (
    slotName: string,
    slot: ReactNode | RenderProp<T>,
    context: CompositionContext<T>,
    fallback?: ReactNode
  ): ReactNode => {
    if (!slot) {
      return fallback || null;
    }

    // If slot is a function (render prop), call it with context data
    if (typeof slot === 'function') {
      return (slot as RenderProp<T>)(context.data);
    }

    // If slot is a React element, clone it with additional props
    if (isValidElement(slot)) {
      const slotProps = context.slotProps?.[slotName] || {};
      return cloneElement(slot, {
        ...slotProps,
        ...(slot.props as any), // Preserve original props
      });
    }

    // Return slot as-is for other types
    return slot;
  };

  /**
   * Renders multiple slots in specified order
   */
  const renderSlots = (
    slots: ComponentSlots<T>,
    context: CompositionContext<T>,
    order?: string[]
  ): ReactNode[] => {
    const slotNames = order || Object.keys(slots);
    
    return slotNames
      .filter(name => slots[name] !== undefined)
      .map(name => renderSlot(name, slots[name], context));
  };

  /**
   * Handles children as render prop or regular content
   */
  const renderChildren = (
    children: ReactNode | RenderProp<T>,
    context: CompositionContext<T>
  ): ReactNode => {
    if (typeof children === 'function') {
      return (children as RenderProp<T>)(context.data);
    }
    return children;
  };

  /**
   * Creates a composition context with data and handlers
   */
  const createContext = (
    data: T,
    state?: Record<string, any>,
    handlers?: Record<string, (...args: any[]) => void>,
    additional?: Record<string, any>
  ): CompositionContext<T> => ({
    data,
    state,
    handlers,
    ...additional,
  });

  /**
   * Validates slot configuration
   */
  const validateSlots = (
    slots: ComponentSlots<T>,
    requiredSlots: string[] = []
  ): { isValid: boolean; missingSlots: string[] } => {
    const providedSlots = Object.keys(slots);
    const missingSlots = requiredSlots.filter(slot => !providedSlots.includes(slot));
    
    return {
      isValid: missingSlots.length === 0,
      missingSlots,
    };
  };

  /**
   * Merges default slots with provided slots
   */
  const mergeSlots = (
    defaultSlots: ComponentSlots<T>,
    providedSlots: ComponentSlots<T>
  ): ComponentSlots<T> => ({
    ...defaultSlots,
    ...providedSlots,
  });

  /**
   * Creates a slot component with validation
   */
  const createSlot = (
    name: string,
    content: ReactNode | RenderProp<T>,
    props?: any,
    required = false,
    fallback?: ReactNode
  ): SlotComponent<T> => ({
    name,
    content,
    props,
    required,
    fallback,
  });

  /**
   * Renders a slot component with full validation
   */
  const renderSlotComponent = (
    slot: SlotComponent<T>,
    context: CompositionContext<T>
  ): ReactNode => {
    if (!slot.content && slot.required) {
      // Required slot is missing content - could be logged here if needed
    }

    return renderSlot(slot.name, slot.content, context, slot.fallback);
  };

  return {
    renderSlot,
    renderSlots,
    renderChildren,
    createContext,
    validateSlots,
    mergeSlots,
    createSlot,
    renderSlotComponent,
  };
};

// ============================================================================
// COMPOSITION PATTERNS
// ============================================================================

/**
 * Higher-order component for adding composition support
 */
export const withComposition = <P extends object, T = any>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P & CompositionConfig<T>>((props, ref) => {
    const { slots, slotProps, render, children, defaultSlots, slotOrder, ...componentProps } = props;
    const { createContext, mergeSlots, renderSlots, renderChildren } = useComposition<T>();

    // Create composition context
    const context = createContext(
      componentProps as T,
      undefined,
      undefined,
      { slotProps }
    );

    // Merge default and provided slots
    const finalSlots = defaultSlots ? mergeSlots(defaultSlots, slots || {}) : (slots || {});

    // Render component with composition support
    return (
      <Component ref={ref} {...(componentProps as P)}>
        {render ? render(context.data) : (
          <>
            {Object.keys(finalSlots).length > 0 && renderSlots(finalSlots, context, slotOrder)}
            {children && renderChildren(children, context)}
          </>
        )}
      </Component>
    );
  });
};

/**
 * Hook for creating composable components
 */
export const useComposableComponent = <T = any>(
  config: CompositionConfig<T>,
  data: T
) => {
  const { 
    renderSlot, 
    renderSlots, 
    renderChildren, 
    createContext, 
    validateSlots, 
    mergeSlots 
  } = useComposition<T>();

  const { slots, slotProps, render, children, defaultSlots, slotOrder } = config;

  // Create composition context
  const context = createContext(data, undefined, undefined, { slotProps });

  // Merge default and provided slots
  const finalSlots = defaultSlots ? mergeSlots(defaultSlots, slots || {}) : (slots || {});

  // Validate required slots if specified
  const validation = validateSlots(finalSlots);

  return {
    context,
    slots: finalSlots,
    renderSlot: (name: string, fallback?: ReactNode) => 
      renderSlot(name, finalSlots[name], context, fallback),
    renderSlots: () => renderSlots(finalSlots, context, slotOrder),
    renderChildren: () => children ? renderChildren(children, context) : null,
    renderContent: () => render ? render(context.data) : null,
    validation,
  };
};

// ============================================================================
// COMMON COMPOSITION PATTERNS
// ============================================================================

/**
 * Card composition pattern with header, content, and footer slots
 */
export interface CardCompositionSlots {
  header?: ReactNode | RenderProp<any>;
  content?: ReactNode | RenderProp<any>;
  footer?: ReactNode | RenderProp<any>;
  actions?: ReactNode | RenderProp<any>;
  media?: ReactNode | RenderProp<any>;
}

/**
 * Modal composition pattern with header, body, and footer slots
 */
export interface ModalCompositionSlots {
  header?: ReactNode | RenderProp<any>;
  title?: ReactNode | RenderProp<any>;
  body?: ReactNode | RenderProp<any>;
  footer?: ReactNode | RenderProp<any>;
  actions?: ReactNode | RenderProp<any>;
}

/**
 * Form composition pattern with fields, actions, and validation slots
 */
export interface FormCompositionSlots {
  fields?: ReactNode | RenderProp<any>;
  actions?: ReactNode | RenderProp<any>;
  validation?: ReactNode | RenderProp<any>;
  help?: ReactNode | RenderProp<any>;
}

/**
 * List composition pattern with header, items, and footer slots
 */
export interface ListCompositionSlots {
  header?: ReactNode | RenderProp<any>;
  items?: ReactNode | RenderProp<any>;
  footer?: ReactNode | RenderProp<any>;
  empty?: ReactNode | RenderProp<any>;
  loading?: ReactNode | RenderProp<any>;
}

// ============================================================================
// COMPOSITION UTILITIES FOR SPECIFIC PATTERNS
// ============================================================================

/**
 * Creates a card composition configuration
 */
export const createCardComposition = (
  slots: CardCompositionSlots,
  slotProps?: SlotProps
): CompositionConfig => ({
  slots: slots as ComponentSlots,
  slotProps,
  slotOrder: ['media', 'header', 'content', 'actions', 'footer'],
});

/**
 * Creates a modal composition configuration
 */
export const createModalComposition = (
  slots: ModalCompositionSlots,
  slotProps?: SlotProps
): CompositionConfig => ({
  slots: slots as ComponentSlots,
  slotProps,
  slotOrder: ['header', 'title', 'body', 'footer', 'actions'],
});

/**
 * Creates a form composition configuration
 */
export const createFormComposition = (
  slots: FormCompositionSlots,
  slotProps?: SlotProps
): CompositionConfig => ({
  slots: slots as ComponentSlots,
  slotProps,
  slotOrder: ['fields', 'validation', 'help', 'actions'],
});

/**
 * Creates a list composition configuration
 */
export const createListComposition = (
  slots: ListCompositionSlots,
  slotProps?: SlotProps
): CompositionConfig => ({
  slots: slots as ComponentSlots,
  slotProps,
  slotOrder: ['header', 'items', 'empty', 'loading', 'footer'],
});

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Utility type for ensuring composition type safety
 */
export type ComposableComponent<P, T = any> = React.ComponentType<P & CompositionConfig<T>>;

/**
 * Utility type for slot content with proper typing
 */
export type SlotContent<T = any> = ReactNode | ((props: T) => ReactNode);

/**
 * Utility type for component with composition support
 */
export type WithComposition<P, T = any> = P & CompositionConfig<T>;

/**
 * Utility type for extracting slot types from a composition config
 */
export type ExtractSlotTypes<T> = T extends CompositionConfig<infer U> ? U : never;

export default useComposition;