import React, { type ReactNode } from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardActions,
  CardHeader,
  CardMedia,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import type { CardProps as MuiCardProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useComposition, createCardComposition } from '../../../../hooks/shared/useComposition';
import { useComponentStyles } from '../../../../hooks/shared/useComponentStyles';
import { useThemeUtils } from '../../../../hooks/shared/useThemeUtils';
// Temporary fix - define types locally
interface StandardCardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: (event: React.MouseEvent) => void;
}
interface StandardCompositionProps {
  children?: React.ReactNode;
}

/**
 * Advanced composable Card component with slot-based composition
 * Implements Requirements: 3.4, 6.4, 8.4
 */

// ============================================================================
// COMPOSITION INTERFACES
// ============================================================================

/**
 * Card-specific slot content types
 */
export interface CardSlots {
  /** Card header slot - can be ReactNode or render prop */
  header?: React.ReactNode | ((props: CardCompositionContext) => React.ReactNode);
  /** Card media slot - can be ReactNode or render prop */
  media?: React.ReactNode | ((props: CardCompositionContext) => React.ReactNode);
  /** Card content slot - can be ReactNode or render prop */
  content?: React.ReactNode | ((props: CardCompositionContext) => React.ReactNode);
  /** Card actions slot - can be ReactNode or render prop */
  actions?: React.ReactNode | ((props: CardCompositionContext) => React.ReactNode);
  /** Card footer slot - can be ReactNode or render prop */
  footer?: React.ReactNode | ((props: CardCompositionContext) => React.ReactNode);
}

/**
 * Card slot props for customizing each slot
 */
export interface CardSlotProps {
  header?: {
    title?: string;
    subtitle?: string;
    avatar?: React.ReactNode;
    action?: React.ReactNode;
    disableTypography?: boolean;
  };
  media?: {
    component?: React.ElementType;
    height?: number | string;
    image?: string;
    title?: string;
  };
  content?: {
    component?: React.ElementType;
    disableGutters?: boolean;
  };
  actions?: {
    disableSpacing?: boolean;
    disableGutters?: boolean;
  };
  footer?: {
    component?: React.ElementType;
    divider?: boolean;
  };
}

/**
 * Context passed to render props and slot functions
 */
export interface CardCompositionContext {
  /** Card variant */
  variant: 'elevated' | 'outlined' | 'filled';
  /** Card padding */
  padding: 'none' | 'small' | 'medium' | 'large';
  /** Card state */
  isLoading: boolean;
  hasError: boolean;
  isInteractive: boolean;
  /** Card data */
  data?: any;
  /** Event handlers */
  onClick?: () => void;
  onDoubleClick?: () => void;
  /** Styling */
  sx?: SxProps<Theme>;
}

/**
 * Composable Card component props
 */
export interface ComposableCardProps 
  extends Omit<StandardCardProps, 'children'>,
          Omit<MuiCardProps, 'children' | 'variant'> {
  /** Card variant following Material Design principles */
  variant?: 'elevated' | 'outlined' | 'filled';
  /** Card padding with consistent sizing */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Interactive card state */
  isInteractive?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  hasError?: boolean;
  /** Children can be ReactNode or a function that receives context */
  children?: ReactNode | ((context: CardCompositionContext) => ReactNode);
  /** Card data for render props */
  data?: any;
  
  // Composition props
  /** Named slots for card parts */
  slots?: CardSlots;
  /** Props for each slot */
  slotProps?: CardSlotProps;
  /** Render prop for complete custom rendering */
  render?: (context: CardCompositionContext) => React.ReactNode;
  
  // Event handlers
  onClick?: () => void;
  onDoubleClick?: () => void;
}

// ============================================================================
// COMPOSABLE CARD COMPONENT
// ============================================================================

/**
 * ComposableCard - Advanced card component with slot-based composition
 * Supports children, render props, and slot-based composition patterns
 * Maintains type safety across component boundaries
 */
export const ComposableCard: React.FC<ComposableCardProps> = ({
  variant = 'elevated',
  padding = 'medium',
  isInteractive = false,
  isLoading = false,
  hasError = false,
  data,
  slots,
  slotProps,
  render,
  children,
  onClick,
  onDoubleClick,
  sx,
  ...props
}) => {
  const { getCardVariantStyles, getComponentStateStyles } = useComponentStyles();
  const { alpha, theme } = useThemeUtils();
  const { renderSlot, renderChildren, createContext } = useComposition<CardCompositionContext>();

  // Create composition context
  const context = createContext({
    variant,
    padding,
    isLoading,
    hasError,
    isInteractive,
    data,
    onClick,
    onDoubleClick,
    sx,
  });

  // Get card styles
  const cardStyles = getCardVariantStyles(variant, padding);
  const interactiveStyles = isInteractive ? getComponentStateStyles('card', {
    hover: true,
    focus: !!onClick,
    active: !!onClick,
  }) : {};

  // Handle loading state
  if (isLoading) {
    return (
      <MuiCard
        sx={[
          cardStyles,
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...props}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        </CardContent>
      </MuiCard>
    );
  }

  // Handle error state
  if (hasError) {
    const errorStyles = {
      borderColor: theme.palette.error.main,
      bgcolor: alpha(theme.palette.error.main, 0.04),
    };
    
    return (
      <MuiCard
        sx={[
          cardStyles,
          errorStyles,
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...props}
      >
        <CardContent>
          <Typography variant="h6" color="error.main" gutterBottom>
            Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Something went wrong loading this content.
          </Typography>
        </CardContent>
      </MuiCard>
    );
  }

  // Render with complete custom render prop
  if (render) {
    return (
      <MuiCard
        sx={[
          cardStyles,
          interactiveStyles,
          { cursor: onClick ? 'pointer' : 'default' },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        {...props}
      >
        {render(context.data)}
      </MuiCard>
    );
  }

  // Render with slots or children
  return (
    <MuiCard
      sx={[
        cardStyles,
        interactiveStyles,
        { cursor: onClick ? 'pointer' : 'default' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      {...props}
    >
      {/* Header Slot */}
      {slots?.header && (
        <CardHeader
          {...slotProps?.header}
          title={
            typeof slots.header === 'function' 
              ? slots.header(context.data)
              : slots.header
          }
        />
      )}

      {/* Media Slot */}
      {slots?.media && (
        <CardMedia
          {...slotProps?.media}
        >
          {renderSlot('media', slots.media, context)}
        </CardMedia>
      )}

      {/* Content Slot */}
      {(slots?.content || children) && (
        <CardContent {...slotProps?.content}>
          {slots?.content && renderSlot('content', slots.content, context)}
          {children && renderChildren(children, context)}
        </CardContent>
      )}

      {/* Actions Slot */}
      {slots?.actions && (
        <CardActions {...slotProps?.actions}>
          {renderSlot('actions', slots.actions, context)}
        </CardActions>
      )}

      {/* Footer Slot */}
      {slots?.footer && (
        <>
          {slotProps?.footer?.divider && <Divider />}
          <Box component={slotProps?.footer?.component || 'div'} sx={{ p: 2 }}>
            {renderSlot('footer', slots.footer, context)}
          </Box>
        </>
      )}
    </MuiCard>
  );
};

// ============================================================================
// COMPOSITION HELPERS
// ============================================================================

/**
 * Creates a card composition configuration with type safety
 */
export const createCardSlots = (slots: CardSlots): CardSlots => slots;

/**
 * Creates card slot props with type safety
 */
export const createCardSlotProps = (slotProps: CardSlotProps): CardSlotProps => slotProps;

/**
 * Higher-order component for creating specialized card variants
 */
export const createCardVariant = <T extends object>(
  defaultProps: Partial<ComposableCardProps>,
  defaultSlots?: CardSlots
) => {
  return React.forwardRef<HTMLDivElement, ComposableCardProps & T>((props, ref) => {
    const mergedSlots = defaultSlots ? { ...defaultSlots, ...props.slots } : props.slots;
    
    return (
      <ComposableCard
        ref={ref}
        {...defaultProps}
        {...props}
        slots={mergedSlots}
      />
    );
  });
};

// ============================================================================
// SPECIALIZED CARD VARIANTS
// ============================================================================

/**
 * InfoCard - Specialized card for informational content
 * Note: InfoCard is exported from Card.tsx with full feature set
 */
// Removed duplicate InfoCard export - use the one from Card.tsx instead

/**
 * ActionCard - Specialized card with built-in action support
 */
export const ActionCard = createCardVariant({
  variant: 'elevated',
  padding: 'medium',
  isInteractive: true,
});

/**
 * MediaCard - Specialized card for media content
 */
export const MediaCard = createCardVariant({
  variant: 'elevated',
  padding: 'none',
});

/**
 * DataCard - Specialized card for data display
 */
export const ComposableDataCard = createCardVariant({
  variant: 'outlined',
  padding: 'small',
}, {
  header: ({ data }) => (
    <Typography variant="h6" component="h2">
      {data?.title || 'Data'}
    </Typography>
  ),
});

export default ComposableCard;