import React from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import { FilterList as FilterIcon } from '@mui/icons-material';
import { getRouteTypeInfo } from '../../../../utils/routeUtils';
import { useTheme } from '@mui/material/styles';

interface RouteTypeFiltersProps {
  availableTypes: string[];
  selectedTypes: string[];
  onTypeFilterChange: (event: React.MouseEvent<HTMLElement>, newTypes: string[]) => void;
}

export const RouteTypeFilters: React.FC<RouteTypeFiltersProps> = ({
  availableTypes,
  selectedTypes,
  onTypeFilterChange,
}) => {
  const theme = useTheme();

  if (availableTypes.length <= 1) {
    return null;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <FilterIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Filter by Type:
        </Typography>
      </Stack>
      <ToggleButtonGroup
        value={selectedTypes.length === 1 ? selectedTypes[0] : null} // Single selection mode
        exclusive // Enable exclusive (single) selection
        onChange={(event, newType) => {
          // Handle single selection - if same type clicked, deselect (show all)
          // If different type clicked, select only that type
          const newTypes = newType ? [newType] : [];
          onTypeFilterChange(event, newTypes);
        }}
        aria-label="bus type filter"
        size="small"
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiToggleButton-root': {
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            minWidth: 'auto',
            px: 2,
            py: 0.5,
          },
        }}
      >
        {availableTypes.map((type) => {
          const typeInfo = getRouteTypeInfo(type, theme);
          return (
            <ToggleButton
              key={type}
              value={type}
              sx={{
                color: typeInfo.color,
                borderColor: typeInfo.color + '40',
                '&.Mui-selected': {
                  bgcolor: typeInfo.color + '20',
                  color: typeInfo.color,
                  borderColor: typeInfo.color,
                },
                '&:hover': {
                  bgcolor: typeInfo.color + '10',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span style={{ fontSize: '1rem' }}>{typeInfo.icon}</span>
                <span>{typeInfo.label}</span>
              </Box>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Box>
  );
};