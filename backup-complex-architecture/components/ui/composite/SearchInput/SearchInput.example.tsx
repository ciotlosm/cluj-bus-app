import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { SearchInput } from './SearchInput';

/**
 * Example usage of SearchInput component
 * Demonstrates various features and configurations
 */
export const SearchInputExample: React.FC = () => {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock suggestions for demonstration
  const mockSuggestions = [
    'Route 24 - Manastur',
    'Route 35 - Zorilor',
    'Route 5 - Centru',
    'Station Piata Unirii',
    'Station Piata Marasti',
    'Station Gara CFR',
  ];

  // Simulate search operation
  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results
      const results = mockSuggestions.filter(item =>
        item.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(results);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchResults([]);
    setError(null);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        SearchInput Component Examples
      </Typography>

      {/* Basic Search Input */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Basic Search Input
        </Typography>
        <SearchInput
          onSearch={handleSearch}
          onClear={handleClear}
          isLoading={loading}
          placeholder="Search routes and stations..."
        />
      </Box>

      {/* Search Input with Suggestions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Search Input with Suggestions
        </Typography>
        <SearchInput
          onSearch={handleSearch}
          onClear={handleClear}
          suggestions={mockSuggestions}
          isLoading={loading}
          placeholder="Type to see suggestions..."
          showSuggestions
        />
      </Box>

      {/* Small Size Search Input */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Small Size Search Input
        </Typography>
        <SearchInput
          onSearch={handleSearch}
          onClear={handleClear}
          size="small"
          placeholder="Small search input..."
        />
      </Box>

      {/* Search Input with Custom Settings */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Custom Configuration
        </Typography>
        <SearchInput
          onSearch={handleSearch}
          onClear={handleClear}
          suggestions={mockSuggestions}
          isLoading={loading}
          debounceMs={500}
          minSearchLength={2}
          placeholder="Min 2 characters, 500ms debounce..."
          showSuggestions
        />
      </Box>

      {/* Search Input with Error */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Search Input with Error
        </Typography>
        <SearchInput
          onSearch={handleSearch}
          onClear={handleClear}
          hasError={!!error}
          placeholder="Search with error state..."
        />
      </Box>

      {/* Disabled Search Input */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Disabled Search Input
        </Typography>
        <SearchInput
          onSearch={handleSearch}
          onClear={handleClear}
          isDisabled
          placeholder="Disabled search input..."
        />
      </Box>

      {/* Search Results Display */}
      {searchResults.length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Search Results ({searchResults.length})
          </Typography>
          {searchResults.map((result, index) => (
            <Typography key={index} variant="body2" sx={{ py: 0.5 }}>
              • {result}
            </Typography>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default SearchInputExample;