import React from 'react';
import { useConfigStore } from '../../../../../stores/configStore';
import { useVehicleStore } from '../../../../../stores/vehicleStore';
import { useThemeUtils } from '../../../../../hooks';
import type { CoreVehicle } from '../../../../../types/coreVehicle';

export interface VehicleCardState {
  isOnline: boolean;
  isApiOnline: boolean;
  isDeparted: boolean;
  currentTime: number;
  statusDotColor: string;
  timestampColor: string;
  stopsToShow: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
}

export const useVehicleCardState = (
  vehicle: CoreVehicle,
  stopSequence: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>,
  showShortStopList: boolean
): VehicleCardState => {
  const { config } = useConfigStore();
  const { error } = useVehicleStore();
  const { getDataFreshnessColor, alpha } = useThemeUtils();
  
  // Network status
  const isOnline = !error || error.type !== 'network';
  const isApiOnline = isOnline;
  
  // Determine if vehicle has departed based on simple logic
  const isDeparted = false; // TODO: Implement simple departure logic if needed
  
  // State for updating relative time display every 10 seconds
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  
  // Update current time every 10 seconds for relative time display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Memoize expensive color calculations using vehicle timestamp
  const statusDotColor = React.useMemo(() => {
    const vehicleTimestamp = vehicle.timestamp;
    if (!vehicleTimestamp) {
      return getDataFreshnessColor(Infinity, config?.staleDataThreshold || 5, !isOnline || !isApiOnline);
    }

    const lastUpdate = vehicleTimestamp instanceof Date 
      ? vehicleTimestamp 
      : new Date(vehicleTimestamp);
    
    const minutesSinceUpdate = (currentTime - lastUpdate.getTime()) / (1000 * 60);
    
    return getDataFreshnessColor(minutesSinceUpdate, config?.staleDataThreshold || 5, !isOnline || !isApiOnline);
  }, [vehicle.timestamp, config?.staleDataThreshold, isOnline, isApiOnline, currentTime, getDataFreshnessColor]);

  const timestampColor = React.useMemo(() => {
    const vehicleTimestamp = vehicle.timestamp;
    if (!vehicleTimestamp) {
      const baseColor = getDataFreshnessColor(Infinity, config?.staleDataThreshold || 5, !isOnline || !isApiOnline);
      return alpha(baseColor, isDeparted ? 0.3 : 0.4);
    }

    const lastUpdate = vehicleTimestamp instanceof Date 
      ? vehicleTimestamp 
      : new Date(vehicleTimestamp);
    
    const minutesSinceUpdate = (currentTime - lastUpdate.getTime()) / (1000 * 60);
    
    const baseColor = getDataFreshnessColor(minutesSinceUpdate, config?.staleDataThreshold || 5, !isOnline || !isApiOnline);
    return alpha(baseColor, isDeparted ? 0.3 : 0.5);
  }, [vehicle.timestamp, config?.staleDataThreshold, isOnline, isApiOnline, currentTime, getDataFreshnessColor, alpha, isDeparted]);

  // Get stops to show in short list (next few stops)
  const stopsToShow = React.useMemo(() => {
    if (!stopSequence || !showShortStopList) return [];
    
    // Find current stop index
    const currentStopIndex = stopSequence.findIndex(stop => stop.isCurrent);
    if (currentStopIndex === -1) return stopSequence.slice(0, 3); // Show first 3 if no current stop
    
    // Show current stop + next 2 stops
    return stopSequence.slice(currentStopIndex, currentStopIndex + 3);
  }, [stopSequence, showShortStopList]);

  return {
    isOnline,
    isApiOnline,
    isDeparted,
    currentTime,
    statusDotColor,
    timestampColor,
    stopsToShow
  };
};