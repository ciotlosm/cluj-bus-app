import { useCallback } from 'react';
import type { MouseEvent, KeyboardEvent, ChangeEvent, FocusEvent } from 'react';

/**
 * Shared event handler patterns
 * Extracts common event handling patterns with consistent data passing
 * Validates Requirements: 2.5, 6.2, 6.5
 */
export const useEventPatterns = () => {

  // Generic click handler with data passing pattern
  const createClickHandler = useCallback(<T = any>(
    handler: (data?: T, event?: MouseEvent<HTMLElement>) => void | Promise<void>,
    data?: T,
    options: {
      preventDefault?: boolean;
      stopPropagation?: boolean;
      isDisabled?: boolean;
      debounce?: number;
    } = {}
  ) => {
    const { preventDefault = true, stopPropagation = false, isDisabled = false, debounce } = options;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return async (event: MouseEvent<HTMLElement>) => {
      if (isDisabled) return;

      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();

      const executeHandler = async () => {
        await handler(data, event);
      };

      if (debounce) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(executeHandler, debounce);
      } else {
        await executeHandler();
      }
    };
  }, []);

  // Generic change handler with value transformation
  const createChangeHandler = useCallback(<T = string>(
    handler: (value: T, event?: ChangeEvent<HTMLInputElement>) => void,
    transform?: (value: string) => T,
    options: {
      debounce?: number;
      validate?: (value: T) => boolean;
    } = {}
  ) => {
    const { debounce, validate } = options;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      const transformedValue = transform ? transform(rawValue) : (rawValue as unknown as T);

      if (validate && !validate(transformedValue)) {
        return;
      }

      const executeHandler = () => {
        handler(transformedValue, event);
      };

      if (debounce) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(executeHandler, debounce);
      } else {
        executeHandler();
      }
    };
  }, []);

  // Generic keyboard handler with key filtering
  const createKeyboardHandler = useCallback(<T = any>(
    handler: (data?: T, event?: KeyboardEvent<HTMLElement>) => void | Promise<void>,
    data?: T,
    options: {
      keys?: string[];
      preventDefault?: boolean;
      stopPropagation?: boolean;
      isDisabled?: boolean;
    } = {}
  ) => {
    const { 
      keys = ['Enter', ' '], 
      preventDefault = true, 
      stopPropagation = true, 
      isDisabled = false 
    } = options;

    return async (event: KeyboardEvent<HTMLElement>) => {
      if (isDisabled || !keys.includes(event.key)) return;

      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();

      await handler(data, event);
    };
  }, []);

  // Generic focus handler with validation
  const createFocusHandler = useCallback(<T = any>(
    handler: (data?: T, event?: FocusEvent<HTMLElement>) => void,
    data?: T,
    options: {
      onFocus?: boolean;
      onBlur?: boolean;
      isDisabled?: boolean;
    } = {}
  ) => {
    const { onFocus = true, onBlur = false, isDisabled = false } = options;

    return {
      ...(onFocus && {
        onFocus: (event: FocusEvent<HTMLElement>) => {
          if (!isDisabled) handler(data, event);
        },
      }),
      ...(onBlur && {
        onBlur: (event: FocusEvent<HTMLElement>) => {
          if (!isDisabled) handler(data, event);
        },
      }),
    };
  }, []);

  // Combined accessible handler (click + keyboard)
  const createAccessibleHandler = useCallback(<T = any>(
    handler: (data?: T) => void | Promise<void>,
    data?: T,
    options: {
      keys?: string[];
      isDisabled?: boolean;
      role?: string;
      ariaLabel?: string;
    } = {}
  ) => {
    const { keys = ['Enter', ' '], isDisabled = false, role = 'button', ariaLabel } = options;

    return {
      onClick: createClickHandler(handler, data, { isDisabled }),
      onKeyDown: createKeyboardHandler(handler, data, { keys, isDisabled }),
      tabIndex: isDisabled ? -1 : 0,
      role,
      'aria-disabled': isDisabled,
      ...(ariaLabel && { 'aria-label': ariaLabel }),
    };
  }, [createClickHandler, createKeyboardHandler]);

  // Form submission handler with validation
  const createSubmitHandler = useCallback(<T = any>(
    handler: (data: T) => void | Promise<void>,
    validator?: (data: T) => boolean | string,
    options: {
      resetOnSuccess?: boolean;
      showErrors?: boolean;
    } = {}
  ) => {
    const { resetOnSuccess = false, showErrors = true } = options;

    return async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const formData = new FormData(event.currentTarget);
      const data = Object.fromEntries(formData.entries()) as unknown as T;

      if (validator) {
        const validationResult = validator(data);
        if (validationResult !== true) {
          if (showErrors && typeof validationResult === 'string') {
            // Form validation failed - could be logged here if needed
          }
          return;
        }
      }

      try {
        await handler(data);
        if (resetOnSuccess) {
          event.currentTarget.reset();
        }
      } catch (error) {
        if (showErrors) {
          // Form submission failed - could be logged here if needed
        }
      }
    };
  }, []);

  // Toggle handler for boolean states
  const createToggleHandler = useCallback((
    setter: (value: boolean) => void,
    currentValue?: boolean
  ) => {
    return createClickHandler(() => {
      setter(!currentValue);
    });
  }, [createClickHandler]);

  // Multi-select handler for arrays
  const createMultiSelectHandler = useCallback(<T>(
    setter: (values: T[]) => void,
    currentValues: T[] = []
  ) => {
    return (value: T, selected: boolean) => {
      if (selected) {
        setter([...currentValues, value]);
      } else {
        setter(currentValues.filter(v => v !== value));
      }
    };
  }, []);

  // Drag and drop handlers
  const createDragHandlers = useCallback(<T = any>(
    onDrop: (data: T, event: React.DragEvent) => void,
    data?: T,
    options: {
      onDragStart?: (data?: T, event?: React.DragEvent) => void;
      onDragOver?: (event: React.DragEvent) => void;
      onDragEnter?: (event: React.DragEvent) => void;
      onDragLeave?: (event: React.DragEvent) => void;
      isDisabled?: boolean;
    } = {}
  ) => {
    const { onDragStart, onDragOver, onDragEnter, onDragLeave, isDisabled = false } = options;

    if (isDisabled) return {};

    return {
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        if (onDragStart) onDragStart(data, event);
      },
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        if (onDragOver) onDragOver(event);
      },
      onDragEnter: (event: React.DragEvent) => {
        event.preventDefault();
        if (onDragEnter) onDragEnter(event);
      },
      onDragLeave: (event: React.DragEvent) => {
        if (onDragLeave) onDragLeave(event);
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        onDrop(data!, event);
      },
    };
  }, []);

  return {
    createClickHandler,
    createChangeHandler,
    createKeyboardHandler,
    createFocusHandler,
    createAccessibleHandler,
    createSubmitHandler,
    createToggleHandler,
    createMultiSelectHandler,
    createDragHandlers,
  };
};

/**
 * Simplified hooks for common patterns
 */
export const useClickHandler = () => {
  const { createClickHandler } = useEventPatterns();
  return createClickHandler;
};

export const useChangeHandler = () => {
  const { createChangeHandler } = useEventPatterns();
  return createChangeHandler;
};

export const useAccessibleHandler = () => {
  const { createAccessibleHandler } = useEventPatterns();
  return createAccessibleHandler;
};