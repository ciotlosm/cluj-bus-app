import React from 'react';
import type { BusInfo } from '../../../types';

interface BusDataDiscrepancyProps {
  liveBuses: BusInfo[];
  scheduledBuses: BusInfo[];
}

export const BusDataDiscrepancy: React.FC<BusDataDiscrepancyProps> = ({ 
  liveBuses, 
  scheduledBuses 
}) => {
  // Create maps to count buses by route
  const liveBusCount = new Map<string, number>();
  const scheduledBusCount = new Map<string, number>();
  
  // Count live buses by route (case-insensitive)
  liveBuses.forEach(bus => {
    const route = bus.route.toLowerCase();
    liveBusCount.set(route, (liveBusCount.get(route) || 0) + 1);
  });
  
  // Count scheduled buses by route (case-insensitive)
  scheduledBuses.forEach(bus => {
    const route = bus.route.toLowerCase();
    scheduledBusCount.set(route, (scheduledBusCount.get(route) || 0) + 1);
  });
  
  // Find routes that are scheduled but have no live data
  const missingLiveBuses = scheduledBuses.filter(bus => !liveBusCount.has(bus.route.toLowerCase()));
  
  // Find routes that have live data but no scheduled data
  const unexpectedLiveBuses = liveBuses.filter(bus => !scheduledBusCount.has(bus.route.toLowerCase()));
  
  // Remove duplicates by route for display
  const uniqueMissingLive = Array.from(new Set(missingLiveBuses.map(bus => bus.route)))
    .map(route => missingLiveBuses.find(bus => bus.route === route)!)
    .filter(Boolean);
    
  const uniqueUnexpectedLive = Array.from(new Set(unexpectedLiveBuses.map(bus => bus.route)))
    .map(route => unexpectedLiveBuses.find(bus => bus.route === route)!)
    .filter(Boolean);

  if (uniqueMissingLive.length === 0 && uniqueUnexpectedLive.length === 0) {
    return (
      <div className="text-green-600 text-sm">
        ✓ All data synchronized
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {uniqueMissingLive.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Missing Live Data
          </h4>
          <div className="space-y-1">
            {uniqueMissingLive.map((bus, index) => (
              <div
                key={`${bus.route}-${index}`}
                data-missing-live={bus.route}
                className="missing-live-indicator flex items-center text-sm text-yellow-700"
              >
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                <span className="font-medium">Route {bus.route}</span>
                <span className="ml-2 text-xs">
                  (scheduled: {bus.arrivalTime.toLocaleTimeString()})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {uniqueUnexpectedLive.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Unexpected Live Data
          </h4>
          <div className="space-y-1">
            {uniqueUnexpectedLive.map((bus, index) => (
              <div
                key={`${bus.route}-${index}`}
                data-unexpected-live={bus.route}
                className="unexpected-live-indicator flex items-center text-sm text-blue-700"
              >
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span className="font-medium">Route {bus.route}</span>
                <span className="ml-2 text-xs">
                  (live: {bus.arrivalTime.toLocaleTimeString()})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};