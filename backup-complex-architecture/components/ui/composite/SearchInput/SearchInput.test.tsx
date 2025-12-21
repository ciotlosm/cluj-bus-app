import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { SearchInput } from './SearchInput';
import { materialTheme } from '../../../../theme/materialTheme';

// Mock debounce utility
vi.mock('../../../../utils/debounce', () => ({
  useDebounceCallback: vi.fn((callback, delay) => {
    // Return the callback directly for immediate execution in tests
    const mockCallback = vi.fn((...args) => callback(...args));
    mockCallback.cancel = vi.fn();
    mockCallback.flush = vi.fn();
    return mockCallback;
  }),
}));

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={materialTheme}>
    {children}
  </ThemeProvider>
);

describe('SearchInput', () => {
  const mockOnSearch = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByTestId('SearchIcon')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <TestWrapper>
        <SearchInput 
          onSearch={mockOnSearch} 
          placeholder="Search routes..." 
        />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText('Search routes...')).toBeInTheDocument();
  });

  it('calls onSearch when user types', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });

    // Should call onSearch due to debounced callback
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when Enter key is pressed', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('shows clear button when input has value and clearable is true', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} isClearable />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} onClear={mockOnClear} isClearable />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('shows isLoading spinner when isLoading is true', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} isLoading />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders suggestions when provided', () => {
    const suggestions = ['Route 1', 'Route 2', 'Route 3'];
    
    render(
      <TestWrapper>
        <SearchInput 
          onSearch={mockOnSearch} 
          suggestions={suggestions}
          showSuggestions 
        />
      </TestWrapper>
    );

    // Autocomplete should be present (though suggestions won't show until focused)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('does not show suggestions when showSuggestions is false', () => {
    const suggestions = ['Route 1', 'Route 2', 'Route 3'];
    
    render(
      <TestWrapper>
        <SearchInput 
          onSearch={mockOnSearch} 
          suggestions={suggestions}
          showSuggestions={false}
        />
      </TestWrapper>
    );

    // Should render as regular textfield, not combobox
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('respects minSearchLength prop', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} minSearchLength={3} />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    
    // Type less than minSearchLength
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(mockOnSearch).not.toHaveBeenCalled();
    
    // Type more than minSearchLength
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(mockOnSearch).toHaveBeenCalledWith('abc');
  });

  it('shows error state when error prop is provided', () => {
    render(
      <TestWrapper>
        <SearchInput 
          onSearch={mockOnSearch} 
          hasError 
          helpText="Search failed" 
        />
      </TestWrapper>
    );

    expect(screen.getByText('Search failed')).toBeInTheDocument();
  });

  it('shows custom error message when errorMessage prop is provided', () => {
    render(
      <TestWrapper>
        <SearchInput 
          onSearch={mockOnSearch} 
          errorMessage="Custom error message" 
        />
      </TestWrapper>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('is isDisabled when isDisabled prop is true', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} isDisabled />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDisabled();
  });

  it('clears input when Escape key is pressed', () => {
    render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} onClear={mockOnClear} />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(input).toHaveValue('');
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} size="small" />
      </TestWrapper>
    );

    let input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveClass('MuiInputBase-inputSizeSmall');

    rerender(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} size="medium" />
      </TestWrapper>
    );

    input = screen.getByPlaceholderText('Search...');
    expect(input).not.toHaveClass('MuiInputBase-inputSizeSmall');
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} variant="outlined" />
      </TestWrapper>
    );

    let input = screen.getByPlaceholderText('Search...');
    expect(input.closest('.MuiOutlinedInput-root')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <SearchInput onSearch={mockOnSearch} variant="filled" />
      </TestWrapper>
    );

    input = screen.getByPlaceholderText('Search...');
    expect(input.closest('.MuiFilledInput-root')).toBeInTheDocument();
  });
});