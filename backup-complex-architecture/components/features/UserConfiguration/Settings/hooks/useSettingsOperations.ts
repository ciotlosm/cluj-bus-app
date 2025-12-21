import { useState } from 'react';
import { logger } from '../../../../utils/shared/logger';

export const useSettingsOperations = () => {
  const [isResettingSettings, setIsResettingSettings] = useState(false);

  const handleResetAllSettings = async () => {
    const confirmed = confirm(
      'Reset All App Settings?\n\n' +
      'This will permanently delete:\n' +
      '• All favorite routes and stations\n' +
      '• Location preferences (home/work)\n' +
      '• Theme and display settings\n' +
      '• API configuration\n' +
      '• All cached data\n\n' +
      'The app will restart with default settings.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      setIsResettingSettings(true);
      
      // Delete all app settings from localStorage
      const settingsKeys = ['favorites', 'config', 'theme'];
      settingsKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear all cache data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      logger.info('All settings and cache cleared', {}, 'SETTINGS_RESET');
      
      // Reload the page to restart with fresh settings
      window.location.reload();
    } catch (error) {
      logger.error('Failed to reset settings', { error }, 'SETTINGS_RESET');
      setIsResettingSettings(false);
      alert('Failed to reset settings. Please try again.');
    }
  };

  return {
    isResettingSettings,
    handleResetAllSettings
  };
};