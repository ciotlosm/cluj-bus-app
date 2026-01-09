import { useEffect } from 'react';
import { useShapeStore } from '../stores/shapeStore';

/**
 * Custom hook to automatically initialize shape store on app start
 * Implements cache-first loading with background refresh strategy
 */
export const useShapeInitialization = () => {
  const { loadShapes } = useShapeStore();

  useEffect(() => {
    // Initialize shapes immediately when hook mounts (app start)
    // This will:
    // 1. Load cached shapes immediately if available and fresh
    // 2. Trigger background refresh to check for updates
    // 3. Fetch all shapes if no cache exists
    loadShapes();
  }, [loadShapes]);
};