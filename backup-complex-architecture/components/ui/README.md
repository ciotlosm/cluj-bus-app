# UI Component Prop Patterns

This document outlines the standardized prop patterns used across all UI components in the Cluj Bus App. These patterns ensure consistency, predictability, and maintainability.

## Overview

All UI components follow standardized prop naming conventions that make the codebase more predictable and easier to maintain. This standardization validates Requirements 3.1, 3.3, 3.5, and 8.1.

## Standard Prop Categories

### 1. Event Handler Props

All event handlers follow consistent naming conventions:

```typescript
// ✅ Standard event handlers
onClick?: (event: MouseEvent<HTMLElement>) => void;
onDoubleClick?: (event: MouseEvent<HTMLElement>) => void;
onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
onFocus?: (event: FocusEvent<HTMLElement>) => void;
onBlur?: (event: FocusEvent<HTMLElement>) => void;
onChange?: (event: ChangeEvent<HTMLInputElement>) => void;

// ✅ Component-specific actions
onToggle?: (expanded: boolean) => void;
onShow?: () => void;
onHide?: () => void;
onRefresh?: () => void;
onRetry?: () => void;
onSelect?: (value: any) => void;

// ❌ Avoid inconsistent naming
onToggleExpanded?: () => void; // Use onToggle instead
onShowMap?: () => void;        // Use onShow instead
onRouteClick?: () => void;     // Use onClick instead
```

### 2. State Props

All state props use consistent prefixes (`is`, `has`, `can`, `should`, `will`):

```typescript
// ✅ Standard state props
isLoading?: boolean;
hasError?: boolean;
isSuccess?: boolean;
isActive?: boolean;
isSelected?: boolean;
isExpanded?: boolean;
isVisible?: boolean;
isOpen?: boolean;
isFocused?: boolean;
isInteractive?: boolean;
isClearable?: boolean;

// ❌ Avoid inconsistent naming
loading?: boolean;      // Use isLoading instead
error?: boolean;        // Use hasError instead
clearable?: boolean;    // Use isClearable instead
interactive?: boolean;  // Use isInteractive instead
```

### 3. Styling Props

All styling props follow consistent naming and value patterns:

```typescript
// ✅ Standard styling props
variant?: string;                    // Component variant
size?: 'small' | 'medium' | 'large'; // Consistent sizes
color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
fullWidth?: boolean;
disabled?: boolean;
sx?: SxProps<Theme>;
className?: string;

// ✅ Extended styling props
padding?: 'none' | 'small' | 'medium' | 'large';
borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'round';
elevation?: 'none' | 'low' | 'medium' | 'high';
```

### 4. Configuration Props

All configuration props follow consistent naming:

```typescript
// ✅ Standard configuration props
id?: string;
name?: string;
label?: string;
placeholder?: string;
value?: any;
defaultValue?: any;
children?: ReactNode;
startIcon?: ReactNode;  // Replaces leftIcon
endIcon?: ReactNode;    // Replaces rightIcon

// ✅ Extended configuration props
title?: string;
subtitle?: string;
description?: string;
tooltip?: string;
helpText?: string;
errorMessage?: string;
successMessage?: string;
warningMessage?: string;
```

### 5. Composition Props

All composition props support consistent patterns:

```typescript
// ✅ Standard composition props
children?: ReactNode;
render?: (props: any) => ReactNode;
slots?: {
  header?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
};
slotProps?: {
  header?: Record<string, any>;
  content?: Record<string, any>;
  footer?: Record<string, any>;
  actions?: Record<string, any>;
  icon?: Record<string, any>;
};
```

## Component-Specific Patterns

### Button Component

```typescript
interface ButtonProps extends StandardButtonProps {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal';
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

// ✅ Usage
<Button 
  variant="filled" 
  isLoading={false} 
  startIcon={<SearchIcon />}
  onClick={handleClick}
>
  Search
</Button>

// ❌ Legacy usage (still supported but deprecated)
<Button 
  variant="filled" 
  loading={false} 
  icon={<SearchIcon />}
  onClick={handleClick}
>
  Search
</Button>
```

### Input Component

```typescript
interface InputProps extends StandardInputProps {
  variant?: 'outlined' | 'filled';
  type?: 'text' | 'email' | 'password' | 'number';
  isMultiline?: boolean;
  isClearable?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

// ✅ Usage
<Input
  variant="outlined"
  hasError={false}
  isClearable={true}
  startIcon={<SearchIcon />}
  onChange={handleChange}
/>

// ❌ Legacy usage (still supported but deprecated)
<Input
  variant="outlined"
  error={false}
  clearable={true}
  leftIcon={<SearchIcon />}
  onChange={handleChange}
/>
```

### Card Component

```typescript
interface CardProps extends StandardCardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  isInteractive?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
}

// ✅ Usage
<Card
  variant="elevated"
  isInteractive={true}
  isLoading={false}
  onClick={handleClick}
>
  Content
</Card>

// ❌ Legacy usage (still supported but deprecated)
<Card
  variant="elevated"
  interactive={true}
  loading={false}
  onClick={handleClick}
>
  Content
</Card>
```

### Loading Component

```typescript
interface LoadingProps extends StandardLoadingProps {
  variant?: 'spinner' | 'skeleton' | 'progress';
  text?: string;
  isFullHeight?: boolean;
}

// ✅ Usage
<LoadingState
  variant="spinner"
  isFullHeight={true}
  text="Loading..."
/>

// ❌ Legacy usage (still supported but deprecated)
<LoadingState
  variant="spinner"
  fullHeight={true}
  text="Loading..."
/>
```

## Migration Guide

### Backward Compatibility

All components support legacy prop names for backward compatibility:

```typescript
// Legacy props are automatically transformed
const legacyProps = {
  loading: true,        // → isLoading: true
  error: true,          // → hasError: true
  clearable: true,      // → isClearable: true
  interactive: true,    // → isInteractive: true
  leftIcon: <Icon />,   // → startIcon: <Icon />
  rightIcon: <Icon />,  // → endIcon: <Icon />
};
```

### Gradual Migration

1. **New components**: Use standardized props from the start
2. **Existing components**: Legacy props continue to work
3. **Refactoring**: Gradually update to standardized props
4. **Validation**: Development warnings help identify legacy usage

## Validation

### Development Warnings

In development mode, components validate props and show warnings:

```typescript
// Development console warnings for deprecated props
console.warn('[Button] Deprecated prop: loading. Use isLoading instead.');
console.warn('[Input] Deprecated prop: leftIcon. Use startIcon instead.');
```

### Prop Validation Utility

```typescript
import { validateComponentProps } from '../utils/propValidation';

const validation = validateComponentProps(props, 'Button', ['filled', 'outlined']);
if (!validation.isValid) {
  console.error('Prop validation errors:', validation.errors);
}
```

## TypeScript Integration

### Comprehensive Interfaces

All components have comprehensive TypeScript interfaces:

```typescript
interface ButtonProps extends StandardButtonProps {
  // Component-specific props with proper typing
  variant?: ComponentVariant<'filled' | 'outlined' | 'text' | 'tonal'>;
  size?: ComponentSize;
  color?: ComponentColor;
}
```

### Type Safety

```typescript
// ✅ Type-safe prop usage
const buttonProps: ButtonProps = {
  variant: 'filled',     // Type-checked
  size: 'medium',        // Type-checked
  isLoading: true,       // Type-checked
  onClick: handleClick   // Type-checked
};

// ❌ TypeScript errors for invalid props
const invalidProps: ButtonProps = {
  variant: 'invalid',    // Error: not assignable
  size: 'huge',          // Error: not assignable
  loading: true,         // Warning: deprecated
};
```

## Best Practices

### 1. Use Standard Props

Always use standardized prop names in new code:

```typescript
// ✅ Good
<Button isLoading={true} startIcon={<Icon />} />

// ❌ Avoid
<Button loading={true} icon={<Icon />} />
```

### 2. Consistent Event Handlers

Use standard event handler names:

```typescript
// ✅ Good
<Card onClick={handleClick} onToggle={handleToggle} />

// ❌ Avoid
<Card onCardClick={handleClick} onToggleExpanded={handleToggle} />
```

### 3. Boolean State Props

Use consistent boolean state prop naming:

```typescript
// ✅ Good
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);

// ❌ Avoid
const [loading, setLoading] = useState(false);
const [error, setError] = useState(false);
```

### 4. Composition Patterns

Support standard composition patterns:

```typescript
// ✅ Good - supports children
<Card>
  <CardContent />
</Card>

// ✅ Good - supports slots
<Card
  slots={{
    header: <CardHeader />,
    actions: <CardActions />
  }}
/>

// ✅ Good - supports render props
<Card render={(props) => <CustomContent {...props} />} />
```

## Testing

### Prop Validation Tests

```typescript
import { validateComponentProps } from '../utils/propValidation';

describe('Button prop validation', () => {
  it('should validate standard props', () => {
    const props = { variant: 'filled', isLoading: true };
    const validation = validateComponentProps(props, 'Button');
    expect(validation.isValid).toBe(true);
  });

  it('should warn about deprecated props', () => {
    const props = { variant: 'filled', loading: true };
    const validation = validateComponentProps(props, 'Button');
    expect(validation.warnings).toContain('Deprecated prop: loading');
  });
});
```

## Summary

This standardization ensures:

- **Consistency**: All components follow the same patterns
- **Predictability**: Developers know what to expect
- **Maintainability**: Easy to update and refactor
- **Type Safety**: Comprehensive TypeScript support
- **Backward Compatibility**: Legacy props continue to work
- **Developer Experience**: Clear warnings and validation

By following these patterns, we create a cohesive and maintainable component library that scales well and provides an excellent developer experience.