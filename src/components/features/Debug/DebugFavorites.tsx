import React from 'react';
import { useConfigStore } from '../../../stores/configStore';
import { useFavoriteBusStore } from '../../../stores/favoriteBusStore';
import { logger } from '../../../utils/logger';

export const DebugFavorites: React.FC = () => {
  const { config } = useConfigStore();
  const { availableRoutes } = useFavoriteBusStore();

  const runDebug = () => {
    logger.debug('Debug Favorites - Current State');
    logger.debug('='.repeat(50));
    
    logger.debug('Config', config);
    logger.debug('Favorite Buses', config?.favoriteBuses);
    logger.debug('Available Routes Count', { count: availableRoutes.length });
    
    if (availableRoutes.length > 0) {
      // Find the problematic routes
      const route42 = availableRoutes.find(r => r.routeName === '42');
      const route43B = availableRoutes.find(r => r.routeName === '43B');
      const routeId40 = availableRoutes.find(r => (r as any).id === '40');
      const routeId42 = availableRoutes.find(r => (r as any).id === '42');
      
      logger.debug('Key Routes Analysis');
      if (route42) logger.debug('Route with shortName "42"', route42);
      if (route43B) logger.debug('Route with shortName "43B"', route43B);
      if (routeId40) logger.debug('Route with ID "40"', routeId40);
      if (routeId42) logger.debug('Route with ID "42"', routeId42);
      
      // Check what's actually stored vs what should be stored
      if (config?.favoriteBuses) {
        logger.debug('Stored Route IDs Analysis');
        config.favoriteBuses.forEach((storedId, index) => {
          const route = availableRoutes.find(r => (r as any).id === storedId);
          logger.debug(`${index + 1}. Stored ID "${storedId}" → Route`, route);
          if (route) {
            logger.debug(`Shows as: "${route.routeName}" (ID: ${route.id})`);
          }
        });
      }
      
      // Show first 10 routes for context
      logger.debug('First 10 Available Routes');
      availableRoutes.slice(0, 10).forEach(route => {
        logger.debug(`ID: ${route.id.padEnd(3)} | Route: ${(route.routeName || 'N/A').padEnd(6)} | Desc: ${route.routeDesc}`);
      });
    }
  };

  const testRouteSelection = () => {
    logger.debug('Testing Route Selection Logic');
    logger.debug('='.repeat(50));
    
    // Find route "42" (should have ID "40")
    const route42 = availableRoutes.find(r => r.routeName === '42');
    if (route42) {
      logger.debug('Found route "42"', route42);
      logger.debug(`When user clicks "42", we should store ID: "${(route42 as any).id}"`);
      logger.debug(`When displaying ID "${(route42 as any).id}", we should show: "${route42.routeName}"`);
    }
    
    // Test what happens if we store the wrong ID
    const routeId42 = availableRoutes.find(r => (r as any).id === '42');
    if (routeId42) {
      logger.debug('If we mistakenly store ID "42"');
      logger.debug('Route with ID "42"', routeId42);
      logger.debug(`Would display as: "${routeId42.routeName}" (WRONG!)`);
    }
  };

  const fixMapping = () => {
    logger.debug('Attempting to fix route mapping...');
    
    if (!config?.favoriteBuses) {
      logger.warn('No favorite buses to fix');
      return;
    }
    
    const validRoutes = config.favoriteBuses.filter(id => {
      const route = availableRoutes.find(r => (r as any).id === id);
      const isValid = !!route;
      logger.debug(`ID "${id}" → ${isValid ? 'Valid' : 'Invalid'} ${route ? `(${route.routeName})` : ''}`);
      return isValid;
    });
    
    logger.debug('Fixed routes', { validCount: validRoutes.length, totalCount: config.favoriteBuses.length });
    
    if (validRoutes.length !== config.favoriteBuses.length) {
      logger.warn('Some routes were invalid and removed');
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg m-4">
      <h3 className="text-white font-bold mb-4">🔍 Debug Favorites</h3>
      <div className="space-x-2">
        <button
          onClick={runDebug}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Run Debug
        </button>
        <button
          onClick={testRouteSelection}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Test Selection
        </button>
        <button
          onClick={fixMapping}
          className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
        >
          Fix Mapping
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Open browser console and click buttons to see debug output
      </div>
    </div>
  );
};