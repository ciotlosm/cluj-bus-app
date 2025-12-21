// Performance Utilities
// Helper functions for optimizing React component performance and data sharing

import { useRef, useMemo } from 'react';

/**
 * Custom hook for deep comparison memoization
 * Useful when dependencies are objects or arrays that might have the same content
 * but different references
 * 
 * @param factory - Function that creates the value to memoize
 * @param deps - Dependencies for comparison
 * @returns Memoized value that only changes when deps actually change
 */
export function useDeepMemo<T>(factory: () => T, deps: unknown[]): T {
  const ref = useRef<{ deps: unknown[]; value: T } | undefined>(undefined);
  
  const hasChanged = useMemo(() => {
    if (!ref.current) return true;
    
    const prevDeps = ref.current.deps;
    if (prevDeps.length !== deps.length) return true;
    
    return deps.some((dep, index) => {
      const prevDep = prevDeps[index];
      
      // Deep comparison for arrays
      if (Array.isArray(dep) && Array.isArray(prevDep)) {
        if (dep.length !== prevDep.length) return true;
        return dep.some((item, i) => item !== prevDep[i]);
      }
      
      // Simple comparison for primitives and objects
      return dep !== prevDep;
    });
  }, [...deps]);
  
  const value = useMemo(factory, [...deps]);
  
  if (hasChanged) {
    ref.current = { deps, value };
  }
  
  return ref.current!.value;
}

/**
 * Debounce function for performance optimization
 * Useful for expensive operations that shouldn't run on every change
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function for performance optimization
 * Ensures function is called at most once per specified interval
 * 
 * @param func - Function to throttle
 * @param interval - Interval in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T, 
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Simple object comparison for memoization
 * Compares objects by their JSON representation (shallow comparison)
 * 
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns True if objects are equal, false otherwise
 */
export function shallowEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  const keys1 = Object.keys(obj1 as object);
  const keys2 = Object.keys(obj2 as object);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!(key in (obj2 as object))) return false;
    if ((obj1 as Record<string, unknown>)[key] !== (obj2 as Record<string, unknown>)[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Performance monitoring utility
 * Helps track expensive operations and their timing
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  
  static start(label: string): void {
    this.timers.set(label, performance.now());
  }
  
  static end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Performance timer '${label}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    // Log slow operations (over 100ms)
    if (duration > 100) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static measure<T>(label: string, operation: () => T): T {
    this.start(label);
    try {
      return operation();
    } finally {
      this.end(label);
    }
  }
}