import React, { useMemo } from 'react';
import {
  List as MuiList,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  ListSubheader,
  Typography,
  Box,
  Divider,
  Skeleton,
  Alert,
} from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import type { ListProps as MuiListProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useComposition, createListComposition } from '../../../../hooks/shared/useComposition';
import { useComponentStyles } from '../../../../hooks/shared/useComponentStyles';
import { useThemeUtils } from '../../../../hooks/shared/useThemeUtils';
import type { StandardCompositionProps } from '../../../../types/componentProps';

/**
 * Advanced composable List component with slot-based composition
 * Implements Requirements: 3.4, 6.4, 8.4
 */

// ============================================================================
// COMPOSITION INTERFACES
// ============================================================================

/**
 * List-specific slot content types
 */
export interface ListSlots<T = any> {
  /** List header slot - can be ReactNode or render prop */
  header?: React.ReactNode | ((props: ListCompositionContext<T>) => React.ReactNode);
  /** List items slot - can be ReactNode or render prop */
  items?: React.ReactNode | ((props: ListCompositionContext<T>) => React.ReactNode);
  /** List footer slot - can be ReactNode or render prop */
  footer?: React.ReactNode | ((props: ListCompositionContext<T>) => React.ReactNode);
  /** Empty state slot - can be ReactNode or render prop */
  empty?: React.ReactNode | ((props: ListCompositionContext<T>) => React.ReactNode);
  /** Loading state slot - can be ReactNode or render prop */
  loading?: React.ReactNode | ((props: ListCompositionContext<T>) => React.ReactNode);
  /** Error state slot - can be ReactNode or render prop */
  error?: React.ReactNode | ((props: ListCompositionContext<T>) => React.ReactNode);
}

/**
 * List slot props for customizing each slot
 */
export interface ListSlotProps {
  header?: {
    component?: React.ElementType;
    variant?: 'default' | 'sticky' | 'inset';
    disableGutters?: boolean;
  };
  items?: {
    component?: React.ElementType;
    dividers?: boolean;
    dense?: boolean;
  };
  footer?: {
    component?: React.ElementType;
    divider?: boolean;
  };
  empty?: {
    component?: React.ElementType;
    variant?: 'default' | 'minimal';
  };
  loading?: {
    component?: React.ElementType;
    count?: number;
  };
  error?: {
    component?: React.ElementType;
    severity?: 'error' | 'warning';
  };
}

/**
 * List item configuration
 */
export interface ListItemConfig<T = any> {
  /** Item data */
  data: T;
  /** Item key */
  key: string | number;
  /** Item content renderer */
  render?: (item: T, index: number) => React.ReactNode;
  /** Item click handler */
  onClick?: (item: T, index: number) => void;
  /** Item selection state */
  selected?: boolean;
  /** Item disabled state */
  disabled?: boolean;
  /** Item icon */
  icon?: React.ReactNode;
  /** Item secondary action */
  secondaryAction?: React.ReactNode;
}

/**
 * Context passed to render props and slot functions
 */
export interface ListCompositionContext<T = any> {
  /** List items data */
  items: T[];
  /** List state */
  isLoading: boolean;
  hasError: boolean;
  isEmpty: boolean;
  /** List configuration */
  dense: boolean;
  disablePadding: boolean;
  /** Selection state */
  selectedItems: T[];
  /** Event handlers */
  onItemClick?: (item: T, index: number) => void;
  onItemSelect?: (item: T, index: number, selected: boolean) => void;
  /** Utility functions */
  getItemKey: (item: T, index: number) => string | number;
  isItemSelected: (item: T, index: number) => boolean;
  /** Styling */
  sx?: SxProps<Theme>;
}

/**
 * Composable List component props
 */
export interface ComposableListProps<T = any> 
  extends Omit<MuiListProps, 'children'> {
  /** List items data */
  items?: T[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  hasError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Item key extractor */
  getItemKey?: (item: T, index: number) => string | number;
  /** Item click handler */
  onItemClick?: (item: T, index: number) => void;
  /** Item selection handler */
  onItemSelect?: (item: T, index: number, selected: boolean) => void;
  /** Selected items */
  selectedItems?: T[];
  /** Item renderer */
  renderItem?: (item: T, index: number) => React.ReactNode;
  /** List header */
  header?: string;
  /** List subheader */
  subheader?: string;
  
  // Composition props
  /** Named slots for list parts */
  slots?: ListSlots<T>;
  /** Props for each slot */
  slotProps?: ListSlotProps;
  /** Render prop for complete custom rendering */
  render?: (context: ListCompositionContext<T>) => React.ReactNode;
  /** Children - can be ReactNode or render prop */
  children?: React.ReactNode | ((context: ListCompositionContext<T>) => React.ReactNode);
}

// ============================================================================
// COMPOSABLE LIST COMPONENT
// ============================================================================

/**
 * ComposableList - Advanced list component with slot-based composition
 * Supports children, render props, and slot-based composition patterns
 * Maintains type safety across component boundaries
 */
export const ComposableList = <T extends any = any>({
  items = [],
  isLoading = false,
  hasError = false,
  errorMessage = 'An error occurred while loading the list.',
  emptyMessage = 'No items to display.',
  getItemKey = (item, index) => index,
  onItemClick,
  onItemSelect,
  selectedItems = [],
  renderItem,
  header,
  subheader,
  dense = false,
  disablePadding = false,
  slots,
  slotProps,
  render,
  children,
  sx,
  ...props
}: ComposableListProps<T>) => {
  const { renderSlot, renderChildren, createContext } = useComposition<ListCompositionContext<T>>();
  const { getCompositionStyles } = useComponentStyles();
  const { theme } = useThemeUtils();

  // Memoized computed values
  const isEmpty = useMemo(() => !isLoading && !hasError && items.length === 0, [isLoading, hasError, items.length]);
  
  const isItemSelected = useMemo(() => 
    (item: T, index: number) => {
      const key = getItemKey(item, index);
      return selectedItems.some(selectedItem => getItemKey(selectedItem, -1) === key);
    },
    [selectedItems, getItemKey]
  );

  // Create composition context
  const context = createContext({
    items,
    isLoading,
    hasError,
    isEmpty,
    dense,
    disablePadding,
    selectedItems,
    onItemClick,
    onItemSelect,
    getItemKey,
    isItemSelected,
    sx,
  });

  // List styles
  const listStyles: SxProps<Theme> = {
    ...sx,
  };

  // Render loading state
  if (isLoading) {
    return (
      <MuiList
        dense={dense}
        disablePadding={disablePadding}
        sx={listStyles}
        {...props}
      >
        {slots?.loading ? (
          renderSlot('loading', slots.loading, context)
        ) : (
          Array.from({ length: slotProps?.loading?.count || 3 }).map((_, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <Skeleton variant="circular" width={24} height={24} />
              </ListItemIcon>
              <ListItemText
                primary={<Skeleton variant="text" width="60%" />}
                secondary={<Skeleton variant="text" width="40%" />}
              />
            </ListItem>
          ))
        )}
      </MuiList>
    );
  }

  // Render error state
  if (hasError) {
    return (
      <Box sx={{ p: 2 }}>
        {slots?.error ? (
          renderSlot('error', slots.error, context)
        ) : (
          <Alert
            severity={slotProps?.error?.severity || 'error'}
            icon={<ErrorIcon />}
          >
            {errorMessage}
          </Alert>
        )}
      </Box>
    );
  }

  // Render empty state
  if (isEmpty) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        {slots?.empty ? (
          renderSlot('empty', slots.empty, context)
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        )}
      </Box>
    );
  }

  // Render with complete custom render prop
  if (render) {
    return (
      <MuiList
        dense={dense}
        disablePadding={disablePadding}
        sx={listStyles}
        {...props}
      >
        {render(context.data)}
      </MuiList>
    );
  }

  // Default item renderer
  const defaultRenderItem = (item: T, index: number) => {
    const key = getItemKey(item, index);
    const selected = isItemSelected(item, index);
    
    return (
      <ListItem
        key={key}
        disablePadding={!!onItemClick}
        divider={slotProps?.items?.dividers && index < items.length - 1}
      >
        {onItemClick ? (
          <ListItemButton
            selected={selected}
            onClick={() => onItemClick(item, index)}
          >
            <ListItemText
              primary={typeof item === 'object' && item !== null ? 
                (item as any).title || (item as any).name || String(item) : 
                String(item)
              }
              secondary={typeof item === 'object' && item !== null ? 
                (item as any).subtitle || (item as any).description : 
                undefined
              }
            />
          </ListItemButton>
        ) : (
          <ListItemText
            primary={typeof item === 'object' && item !== null ? 
              (item as any).title || (item as any).name || String(item) : 
              String(item)
            }
            secondary={typeof item === 'object' && item !== null ? 
              (item as any).subtitle || (item as any).description : 
              undefined
            }
          />
        )}
      </ListItem>
    );
  };

  // Render normal list
  return (
    <MuiList
      dense={dense}
      disablePadding={disablePadding}
      sx={listStyles}
      subheader={
        (header || subheader || slots?.header) ? (
          <ListSubheader
            component={slotProps?.header?.component || 'div'}
            disableGutters={slotProps?.header?.disableGutters}
            sx={{
              ...(slotProps?.header?.variant === 'sticky' && {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                bgcolor: 'background.paper',
              }),
              ...(slotProps?.header?.variant === 'inset' && {
                pl: 4,
              }),
            }}
          >
            {slots?.header ? (
              renderSlot('header', slots.header, context)
            ) : (
              <>
                {header && (
                  <Typography variant="h6" component="div">
                    {header}
                  </Typography>
                )}
                {subheader && (
                  <Typography variant="body2" color="text.secondary">
                    {subheader}
                  </Typography>
                )}
              </>
            )}
          </ListSubheader>
        ) : undefined
      }
      {...props}
    >
      {/* Items Section */}
      {slots?.items ? (
        renderSlot('items', slots.items, context)
      ) : (
        items.map((item, index) => 
          renderItem ? renderItem(item, index) : defaultRenderItem(item, index)
        )
      )}

      {/* Children */}
      {children && renderChildren(children, context)}

      {/* Footer Section */}
      {slots?.footer && (
        <>
          {slotProps?.footer?.divider && <Divider />}
          <Box component={slotProps?.footer?.component || 'div'} sx={{ p: 2 }}>
            {renderSlot('footer', slots.footer, context)}
          </Box>
        </>
      )}
    </MuiList>
  );
};

// ============================================================================
// COMPOSITION HELPERS
// ============================================================================

/**
 * Creates list slots with type safety
 */
export const createListSlots = <T = any>(slots: ListSlots<T>): ListSlots<T> => slots;

/**
 * Creates list slot props with type safety
 */
export const createListSlotProps = (slotProps: ListSlotProps): ListSlotProps => slotProps;

/**
 * Higher-order component for creating specialized list variants
 */
export const createListVariant = <T extends object, D = any>(
  defaultProps: Partial<ComposableListProps<D>>,
  defaultSlots?: ListSlots<D>
) => {
  return React.forwardRef<HTMLUListElement, ComposableListProps<D> & T>((props, ref) => {
    const mergedSlots = defaultSlots ? { ...defaultSlots, ...props.slots } : props.slots;
    
    return (
      <ComposableList
        ref={ref}
        {...defaultProps}
        {...props}
        slots={mergedSlots}
      />
    );
  });
};

// ============================================================================
// SPECIALIZED LIST VARIANTS
// ============================================================================

/**
 * MenuList - Specialized list for menu items
 */
export const MenuList = createListVariant({
  dense: true,
  disablePadding: true,
});

/**
 * NavigationList - Specialized list for navigation items
 */
export const NavigationList = createListVariant({
  dense: false,
  disablePadding: false,
});

/**
 * SelectableList - Specialized list with selection support
 */
export const SelectableList = createListVariant({
  dense: false,
}, {
  items: ({ items, onItemSelect, isItemSelected }) => (
    <>
      {items.map((item, index) => (
        <ListItem key={index} disablePadding>
          <ListItemButton
            selected={isItemSelected(item, index)}
            onClick={() => onItemSelect?.(item, index, !isItemSelected(item, index))}
          >
            <ListItemText
              primary={typeof item === 'object' && item !== null ? 
                (item as any).title || (item as any).name || String(item) : 
                String(item)
              }
            />
          </ListItemButton>
        </ListItem>
      ))}
    </>
  ),
});

/**
 * DataList - Specialized list for data display
 */
export const DataList = createListVariant({
  dense: true,
}, {
  header: ({ items }) => (
    <Typography variant="subtitle2" color="text.secondary">
      {items.length} items
    </Typography>
  ),
});

export default ComposableList;