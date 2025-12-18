import React from 'react';
import { useConfigStore } from '../../../stores/configStore';
import { logger } from '../../../utils/logger';

export const DebugFavorites: React.FC = () => {
  const { config, getFavoriteRoutes } = useConfigStore();
  
  // For debugging purposes, we'll need to get available routes from somewhere else
  // This is a debug component, so we'll use an empty array for now
  const availableRoutes: any[] = [];

  const runDebug = () => {
    logger.debug('Debug Favorites - Current State');
    logger.debug('='.repeat(50));
    
    logger.debug('Config', config);
    logger.debug('Favorite Routes (from config)', config?.favoriteBuses);
    logger.debug('Favorite Routes (from getFavoriteRoutes)', getFavoriteRoutes());
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
      const favoriteRoutes = getFavoriteRoutes();
      if (favoriteRoutes.length > 0) {
        logger.debug('Stored Favorite Routes Analysis');
        favoriteRoutes.forEach((favoriteRoute, index) => {
          logger.debug(`${index + 1}. Favorite Route`, favoriteRoute);
          logger.debug(`  ID: ${favoriteRoute.id}, Name: ${favoriteRoute.routeName}, Type: ${favoriteRoute.type}`);
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
    
    const favoriteRoutes = getFavoriteRoutes();
    if (favoriteRoutes.length === 0) {
      logger.warn('No favorite routes to fix');
      return;
    }
    
    logger.debug('Current favorite routes', favoriteRoutes);
    logger.debug('Note: Favorites are now managed through Config Store methods');
    logger.debug('Use addFavoriteRoute() and removeFavoriteRoute() to manage favorites');
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