/**
 * Utility functions for consistent time formatting across the application
 */

/**
 * Format time in 24-hour format (HH:MM) without seconds
 */
export const formatTime24 = (date: Date): string => {
  // Validate that the input is actually a Date object
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.warn('formatTime24 received invalid date:', date);
    return 'N/A';
  }
  
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Format time for debugging/logging (includes seconds for precision)
 */
export const formatTimeDebug = (date: Date): string => {
  // Validate that the input is actually a Date object
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.warn('formatTimeDebug received invalid date:', date);
    return 'INVALID_DATE';
  }
  
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Format relative time (e.g., "2m ago", "just now")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  } else {
    return formatTime24(date);
  }
};

/**
 * Format relative time with more granular precision for refresh indicators
 */
export const formatRefreshTime = (date: Date | null): string => {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 5) {
    return 'now';
  } else if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  } else if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  } else {
    return formatTime24(date);
  }
};