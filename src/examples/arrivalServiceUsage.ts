/**
 * Example usage of the refactored arrival service
 * Shows how to get real-time arrival calculations without caching
 */

import { useState, useEffect } from 'react';
import { arrivalService } from '../services/arrivalService';
import { stationService } from '../services/stationService';

/**
 * Example: Get arrival times for a specific stop
 */
export async function getArrivalsExample() {
  try {
    // Get fresh arrival calculations - no caching, always real-time
    const arrivals = await arrivalService.calculateArrivalsForStop('123');
    
    console.log('Real-time arrivals for stop 123:');
    arrivals.forEach(arrival => {
      console.log(`Vehicle ${arrival.vehicleId}: ${arrival.statusMessage} (${arrival.confidence} confidence)`);
    });
    
    return arrivals;
  } catch (error) {
    console.error('Failed to get arrivals:', error);
    return [];
  }
}

/**
 * Example: Alternative way using station service
 */
export async function getArrivalsViaStationService() {
  try {
    // This delegates to arrivalService internally
    const arrivals = await stationService.getStopArrivals('123');
    
    return arrivals;
  } catch (error) {
    console.error('Failed to get arrivals via station service:', error);
    return [];
  }
}

/**
 * Example: Component usage pattern
 */
export function useArrivals(stopId: string) {
  // In a React component, you would call arrivalService directly
  // No need for store caching since data is ephemeral
  
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const loadArrivals = async () => {
    setLoading(true);
    try {
      const results = await arrivalService.calculateArrivalsForStop(stopId);
      setArrivals(results);
    } catch (error) {
      console.error('Failed to load arrivals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh every 30 seconds for real-time updates
  useEffect(() => {
    loadArrivals();
    const interval = setInterval(loadArrivals, 30000);
    return () => clearInterval(interval);
  }, [stopId]);
  
  return { arrivals, loading, refresh: loadArrivals };
}