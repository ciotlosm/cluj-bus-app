import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  Typography,
  Box,
  Divider,
  Slide,
  Fade,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { DialogProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
// TransitionProps type definition for Material-UI transitions
type TransitionProps = {
  in?: boolean;
  timeout?: number | { enter?: number; exit?: number };
  easing?: string | { enter?: string; exit?: string };
  onEnter?: () => void;
  onEntering?: () => void;
  onEntered?: () => void;
  onExit?: () => void;
  onExiting?: () => void;
  onExited?: () => void;
};
import { useComposition, createModalComposition } from '../../../../hooks/shared/useComposition';
import { useComponentStyles } from '../../../../hooks/shared/useComponentStyles';
import { useThemeUtils } from '../../../../hooks/shared/useThemeUtils';
import type { StandardModalProps, StandardCompositionProps } from '../../../../types/componentProps';

/**
 * Advanced composable Modal component with slot-based composition
 * Implements Requirements: 3.4, 6.4, 8.4
 */

// ============================================================================
// COMPOSITION INTERFACES
// ============================================================================

/**
 * Modal-specific slot content types
 */
export interface ModalSlots {
  /** Modal header slot - can be ReactNode or render prop */
  header?: React.ReactNode | ((props: ModalCompositionContext) => React.ReactNode);
  /** Modal title slot - can be ReactNode or render prop */
  title?: React.ReactNode | ((props: ModalCompositionContext) => React.ReactNode);
  /** Modal body/content slot - can be ReactNode or render prop */
  body?: React.ReactNode | ((props: ModalCompositionContext) => React.ReactNode);
  /** Modal footer slot - can be ReactNode or render prop */
  footer?: React.ReactNode | ((props: ModalCompositionContext) => React.ReactNode);
  /** Modal actions slot - can be ReactNode or render prop */
  actions?: React.ReactNode | ((props: ModalCompositionContext) => React.ReactNode);
}

/**
 * Modal slot props for customizing each slot
 */
export interface ModalSlotProps {
  header?: {
    component?: React.ElementType;
    disableTypography?: boolean;
    showCloseButton?: boolean;
  };
  title?: {
    component?: React.ElementType;
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    color?: string;
  };
  body?: {
    component?: React.ElementType;
    dividers?: boolean;
    disableGutters?: boolean;
  };
  footer?: {
    component?: React.ElementType;
    divider?: boolean;
  };
  actions?: {
    disableSpacing?: boolean;
    disableGutters?: boolean;
  };
  [key: string]: Record<string, any> | undefined;
}

/**
 * Context passed to render props and slot functions
 */
export interface ModalCompositionContext {
  /** Modal data (required by CompositionContext) */
  data: any;
  /** Modal open state */
  isOpen: boolean;
  /** Modal size */
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  /** Modal title */
  title?: string;
  /** Event handlers */
  onClose: () => void;
  onOpen?: () => void;
  /** Configuration */
  closeOnBackdropClick: boolean;
  closeOnEscape: boolean;
  showCloseButton: boolean;
  /** Styling */
  sx?: SxProps<Theme>;
}

/**
 * Composable Modal component props
 */
export interface ComposableModalProps 
  extends Omit<StandardModalProps, 'children' | 'slots'> {
  /** Modal open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Open handler */
  onOpen?: () => void;
  /** Modal size */
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  /** Modal title */
  title?: string;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Transition component */
  transition?: 'fade' | 'slide' | 'none';
  /** Modal data for render props */
  data?: any;
  
  // Composition props
  /** Named slots for modal parts */
  slots?: ModalSlots;
  /** Props for each slot */
  slotProps?: ModalSlotProps;
  /** Render prop for complete custom rendering */
  render?: (context: ModalCompositionContext) => React.ReactNode;
  /** Children - can be ReactNode or render prop */
  children?: React.ReactNode | ((context: ModalCompositionContext) => React.ReactNode);
}

// ============================================================================
// TRANSITION COMPONENTS
// ============================================================================

const SlideTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function SlideTransition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

const FadeTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function FadeTransition(props, ref) {
    return <Fade ref={ref} {...props} />;
  }
);

// ============================================================================
// COMPOSABLE MODAL COMPONENT
// ============================================================================

/**
 * ComposableModal - Advanced modal component with slot-based composition
 * Supports children, render props, and slot-based composition patterns
 * Maintains type safety across component boundaries
 */
export const ComposableModal: React.FC<ComposableModalProps> = ({
  isOpen,
  onClose,
  onOpen,
  size = 'medium',
  title,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  transition = 'fade',
  data,
  slots,
  slotProps,
  render,
  children,
  sx,
  ...props
}) => {
  const { renderSlot, renderChildren, createContext } = useComposition<ModalCompositionContext>();
  const { theme } = useThemeUtils();

  // Create composition context
  const context: ModalCompositionContext = {
    data: data || {},
    isOpen,
    size,
    title,
    onClose,
    onOpen,
    closeOnBackdropClick,
    closeOnEscape,
    showCloseButton,
    sx,
  };

  // Size configuration
  const sizeConfig = {
    small: { maxWidth: 'sm' as const, fullWidth: true },
    medium: { maxWidth: 'md' as const, fullWidth: true },
    large: { maxWidth: 'lg' as const, fullWidth: true },
    fullscreen: { fullScreen: true },
  };

  // Transition configuration
  const transitionConfig = {
    fade: FadeTransition,
    slide: SlideTransition,
    none: undefined,
  };

  // Modal styles
  const modalStyles: SxProps<Theme> = {
    '& .MuiDialog-paper': {
      borderRadius: 2,
      boxShadow: 24,
    },
    ...sx,
  };

  // Handle close with escape key
  const handleClose = (event: {}, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' && !closeOnBackdropClick) return;
    if (reason === 'escapeKeyDown' && !closeOnEscape) return;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      TransitionComponent={transitionConfig[transition]}
      sx={modalStyles}
      {...sizeConfig[size]}
    >
      {/* Render with complete custom render prop */}
      {render ? (
        render(context)
      ) : (
        <>
          {/* Header/Title Section */}
          {(slots?.header || slots?.title || title || showCloseButton) && (
            <DialogTitle
              component={slotProps?.header?.component || 'div'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: slots?.header || slots?.title ? 2 : 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                {/* Custom Header Slot */}
                {slots?.header && renderSlot('header', slots.header, context)}
                
                {/* Title Slot or Default Title */}
                {!slots?.header && (slots?.title || title) && (
                  <Typography
                    component={slotProps?.title?.component || 'h2'}
                    variant={slotProps?.title?.variant || 'h6'}
                    color={slotProps?.title?.color || 'text.primary'}
                    sx={{ fontWeight: 600 }}
                  >
                    {slots?.title ? renderSlot('title', slots.title, context) : title}
                  </Typography>
                )}
              </Box>

              {/* Close Button */}
              {showCloseButton && (
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{
                    ml: 2,
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  aria-label="Close modal"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </DialogTitle>
          )}

          {/* Body/Content Section */}
          {(slots?.body || children) && (
            <DialogContent
              dividers={slotProps?.body?.dividers}
              sx={{
                ...(slotProps?.body?.disableGutters && { p: 0 }),
              }}
            >
              {slots?.body && renderSlot('body', slots.body, context)}
              {children && renderChildren(children, context)}
            </DialogContent>
          )}

          {/* Footer Section */}
          {slots?.footer && (
            <>
              {slotProps?.footer?.divider && <Divider />}
              <Box
                component={slotProps?.footer?.component || 'div'}
                sx={{ p: 2 }}
              >
                {renderSlot('footer', slots.footer, context)}
              </Box>
            </>
          )}

          {/* Actions Section */}
          {slots?.actions && (
            <DialogActions
              disableSpacing={slotProps?.actions?.disableSpacing}
              sx={{
                ...(slotProps?.actions?.disableGutters && { p: 0 }),
              }}
            >
              {renderSlot('actions', slots.actions, context)}
            </DialogActions>
          )}
        </>
      )}
    </Dialog>
  );
};

// ============================================================================
// COMPOSITION HELPERS
// ============================================================================

/**
 * Creates modal slots with type safety
 */
export const createModalSlots = (slots: ModalSlots): ModalSlots => slots;

/**
 * Creates modal slot props with type safety
 */
export const createModalSlotProps = (slotProps: ModalSlotProps): ModalSlotProps => slotProps;

/**
 * Higher-order component for creating specialized modal variants
 */
export const createModalVariant = <T extends object>(
  defaultProps: Partial<ComposableModalProps>,
  defaultSlots?: ModalSlots
) => {
  return React.forwardRef<HTMLDivElement, ComposableModalProps & T>((props, _ref) => {
    const mergedSlots = defaultSlots ? { ...defaultSlots, ...props.slots } : props.slots;
    
    return (
      <ComposableModal
        {...defaultProps}
        {...props}
        slots={mergedSlots}
      />
    );
  });
};

// ============================================================================
// SPECIALIZED MODAL VARIANTS
// ============================================================================

/**
 * ConfirmModal - Specialized modal for confirmation dialogs
 */
export const ConfirmModal = createModalVariant({
  size: 'small',
  showCloseButton: false,
}, {
  title: ({ title }) => title || 'Confirm Action',
  actions: ({ onClose }) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onClose}>Confirm</button>
    </Box>
  ),
});

/**
 * InfoModal - Specialized modal for informational content
 */
export const InfoModal = createModalVariant({
  size: 'medium',
  closeOnBackdropClick: true,
});

/**
 * FormModal - Specialized modal for forms
 */
export const FormModal = createModalVariant({
  size: 'medium',
  closeOnBackdropClick: false,
  closeOnEscape: false,
});

/**
 * FullscreenModal - Specialized modal for fullscreen content
 */
export const FullscreenModal = createModalVariant({
  size: 'fullscreen',
  transition: 'slide',
});

export default ComposableModal;