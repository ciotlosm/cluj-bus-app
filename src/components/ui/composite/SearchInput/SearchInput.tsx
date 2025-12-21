import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Paper,
  Typography,
  Box,
  type TextFieldProps,
  type AutocompleteProps,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useDebounceCallback } from '../../../../utils/shared/debounce';
import { useFormFieldStyles } from '../../../../hooks/shared/useMuiUtils';
import { useAsyncOperation } from '../../../../hooks/shared/useAsyncOperation';
import { ErrorHandler, ErrorType } from '../../../../hooks/shared/errors';
import type { StandardError } from '../../../../hooks/shared/errors/types';

import type { StandardInputProps } from '../../../../types/componentProps';

/**
 * SearchInput component props extending Material-UI patterns
 * Implements composite UI component with search functionality
 * Follows standardized prop patterns for consistency
 * Validates Requirements: 3.1, 3.3, 3.5, 8.1
 */
interface SearchInputProps extends Omit<TextFieldProps, 'variant' | 'size' | 'onChange'> {
  /** Input variant following Material Design principles */
  variant?: 'outlined' | 'filled';
  /** Input size with consistent spacing */
  size?: 'small' | 'medium';
  /** Full width */
  isFullWidth?: boolean;
  /** Loading state */
  isLoading?: boolean;
  loading?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Error state */
  hasError?: boolean;
  /** Helper text */
  helpText?: string;
  /** Callback fired when search is performed */
  onSearch: (query: string) => void;
  /** Callback fired when input is cleared */
  onClear?: () => void;
  /** Callback fired when input value changes */
  onChange?: (value: string) => void;
  /** Array of suggestion strings */
  suggestions?: string[];
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether to show clear button */
  isClearable?: boolean;
  /** Whether to show suggestions dropdown */
  showSuggestions?: boolean;
  /** Minimum characters before triggering search */
  minSearchLength?: number;
}

/**
 * SearchInput composite component built from base Input component
 * Implements debouncing, suggestions, loading states, and consistent error handling
 * Uses Material-UI components exclusively following Material Design principles
 * 
 * Validates Requirements: 6.1, 7.1, 7.2, 7.3, 5.1
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onClear,
  onChange,
  suggestions = [],
  loading = false,
  debounceMs = 300,
  variant = 'outlined',
  size = 'medium',
  isClearable = true,
  fullWidth = true,
  showSuggestions = true,
  errorMessage,
  minSearchLength = 1,
  placeholder = 'Search...',
  isDisabled = false,
  hasError = false,
  helpText,
  sx,
  ...props
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<StandardError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const getFormFieldStyles = useFormFieldStyles();
  const asyncOperation = useAsyncOperation();

  // Debounced search function
  const debouncedSearch = useDebounceCallback(
    useCallback((query: string) => {
      if (query.length >= minSearchLength) {
        try {
          onSearch(query);
          setInternalError(null);
        } catch (err) {
          const standardError = ErrorHandler.fromError(
            err instanceof Error ? err : new Error(String(err)),
            { query, component: 'SearchInput' }
          );
          setInternalError(standardError);
        }
      }
    }, [onSearch, minSearchLength]),
    debounceMs,
    [onSearch, minSearchLength]
  );

  // Handle input change
  const handleInputChange = useCallback((
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => {
    setInputValue(value);
    
    if (reason === 'input') {
      // Clear previous errors when user starts typing
      setInternalError(null);
      
      // Trigger debounced search
      if (value.trim()) {
        debouncedSearch(value.trim());
      } else {
        // Cancel pending search if input is cleared
        debouncedSearch.cancel();
      }
    }
  }, [debouncedSearch]);

  // Handle selection change (when user selects from suggestions)
  const handleSelectionChange = useCallback((
    event: React.SyntheticEvent,
    value: string | null
  ) => {
    setSelectedValue(value);
    
    if (value) {
      setInputValue(value);
      // Immediately trigger search for selected suggestion
      try {
        onSearch(value);
        setInternalError(null);
      } catch (err) {
        const standardError = ErrorHandler.fromError(
          err instanceof Error ? err : new Error(String(err)),
          { selectedValue: value, component: 'SearchInput' }
        );
        setInternalError(standardError);
      }
    }
  }, [onSearch]);

  // Handle clear button click
  const handleClear = useCallback(() => {
    setInputValue('');
    setSelectedValue(null);
    setInternalError(null);
    debouncedSearch.cancel();
    
    // Focus input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Call onClear callback if provided
    onClear?.();
  }, [debouncedSearch, onClear]);

  // Handle key down events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const query = inputValue.trim();
      
      if (query && query.length >= minSearchLength) {
        // Cancel debounced search and execute immediately
        debouncedSearch.cancel();
        try {
          onSearch(query);
          setInternalError(null);
        } catch (err) {
          const standardError = ErrorHandler.fromError(
            err instanceof Error ? err : new Error(String(err)),
            { query, component: 'SearchInput', trigger: 'enter' }
          );
          setInternalError(standardError);
        }
      }
    } else if (event.key === 'Escape') {
      handleClear();
    }
  }, [inputValue, minSearchLength, debouncedSearch, onSearch, handleClear]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Determine error state and message
  const hasErrorState = hasError || !!internalError || !!errorMessage;
  const displayErrorMessage = errorMessage || 
    (internalError ? ErrorHandler.getUserMessage(internalError) : helpText);

  // Determine the state for styling
  const state = hasErrorState ? 'error' : 'default';
  const formFieldStyles = getFormFieldStyles(variant, state);

  // Show clear button when there's input and clearable is true
  const showClearButton = isClearable && inputValue && !!loading;

  // Prepare end adornment with loading spinner and clear button
  const endAdornment = (
    <InputAdornment position="end">
      {loading && (
        <CircularProgress 
          size={size === 'small' ? 16 : 20} 
          color="primary"
          sx={{ mr: showClearButton ? 1 : 0 }}
        />
      )}
      {showClearButton && (
        <IconButton
          onClick={handleClear}
          edge="end"
          size={size}
          disabled={isDisabled}
          aria-label="Clear search"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          <ClearIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </IconButton>
      )}
    </InputAdornment>
  );

  // If suggestions are isDisabled or empty, render as regular TextField
  if (!showSuggestions || suggestions.length === 0) {
    return (
      <TextField
        ref={inputRef}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={isDisabled}
        error={hasErrorState}
        helperText={displayErrorMessage}
        value={inputValue}
        onChange={(event) => {
          handleInputChange(event, event.target.value, 'input');
          if (onChange) {
            onChange(event.target.value);
          }
        }}
        onKeyDown={handleKeyDown}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon 
                color={isDisabled ? 'disabled' : 'action'} 
                fontSize={size === 'small' ? 'small' : 'medium'}
              />
            </InputAdornment>
          ),
          endAdornment,
          ...props.InputProps,
        }}
        sx={[
          formFieldStyles,
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...props}
      />
    );
  }

  // Render with Autocomplete for suggestions
  return (
    <Autocomplete
      freeSolo
      options={suggestions}
      value={selectedValue}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleSelectionChange}
      disabled={isDisabled}
      loading={loading}
      loadingText="Searching..."
      noOptionsText="No suggestions found"
      clearOnBlur={false}
      selectOnFocus
      handleHomeEndKeys
      PaperComponent={(props) => (
        <Paper 
          {...props} 
          elevation={8}
          sx={{
            mt: 1,
            border: '1px solid',
            borderColor: 'divider',
            '& .MuiAutocomplete-option': {
              fontSize: size === 'small' ? '0.875rem' : '1rem',
              py: size === 'small' ? 0.5 : 1,
            },
          }}
        />
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          ref={inputRef}
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          placeholder={placeholder}
          error={hasErrorState}
          helperText={displayErrorMessage}
          onKeyDown={handleKeyDown}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon 
                  color={isDisabled ? 'disabled' : 'action'} 
                  fontSize={size === 'small' ? 'small' : 'medium'}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {endAdornment}
                {params.InputProps.endAdornment}
              </>
            ),
            ...props.InputProps,
          }}
          sx={[
            formFieldStyles,
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
          {...props}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <SearchIcon 
            fontSize="small" 
            sx={{ mr: 1, color: 'text.secondary' }} 
          />
          <Typography variant="body2" noWrap>
            {option}
          </Typography>
        </Box>
      )}
    />
  );
};

export default SearchInput;