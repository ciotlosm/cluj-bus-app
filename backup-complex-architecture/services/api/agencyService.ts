import { enhancedTranzyApi } from './tranzyApiService';
import { logger } from '../../utils/shared/logger';
import type { Agency } from '../../types';

/**
 * Centralized agency management service
 * Handles agency selection based on user configuration
 */
class AgencyService {
  private cachedAgency: Agency | null = null;
  private cachedAgencyId: number | null = null;

  /**
   * Get the agency ID for the configured city
   * Uses caching to avoid repeated API calls
   */
  async getAgencyIdForCity(cityName: string): Promise<number | null> {
    try {
      // Return cached result if available and matches the city
      if (this.cachedAgency && this.cachedAgency.name === cityName && this.cachedAgencyId) {
        logger.debug('Using cached agency ID', { 
          city: cityName, 
          agencyId: this.cachedAgencyId 
        });
        return this.cachedAgencyId;
      }

      logger.debug('Fetching agencies for city lookup', { city: cityName });
      // Fetch agencies from cache and find the one matching the city
      const agencies = await enhancedTranzyApi.getAgencies(false);
      logger.debug('Retrieved agencies', { count: agencies.length, agencies: agencies.map(a => ({ id: a.id, name: a.name })) });
      
      const agency = agencies.find(a => a.name === cityName);

      if (!agency) {
        logger.warn('No agency found for city', { 
          city: cityName, 
          availableAgencies: agencies.map(a => a.name),
          searchedFor: cityName
        });
        return null;
      }

      // Cache the result
      this.cachedAgency = agency;
      this.cachedAgencyId = parseInt(agency.id);

      logger.info('Found and cached agency for city', { 
        city: cityName, 
        agencyId: this.cachedAgencyId,
        agencyName: agency.name 
      });

      return this.cachedAgencyId;
    } catch (error) {
      logger.error('Failed to get agency for city', { city: cityName, error });
      return null;
    }
  }

  /**
   * Get the cached agency ID (if available)
   * Returns null if no agency is cached
   */
  getCachedAgencyId(): number | null {
    return this.cachedAgencyId;
  }

  /**
   * Get the cached agency (if available)
   * Returns null if no agency is cached
   */
  getCachedAgency(): Agency | null {
    return this.cachedAgency;
  }

  /**
   * Clear the cached agency data
   * Useful when user changes city configuration
   */
  clearCache(): void {
    logger.debug('Clearing agency cache');
    this.cachedAgency = null;
    this.cachedAgencyId = null;
  }

  /**
   * Get all available agencies
   * This is a pass-through to the enhanced API
   */
  async getAllAgencies(): Promise<Agency[]> {
    try {
      return await enhancedTranzyApi.getAgencies(false);
    } catch (error) {
      logger.error('Failed to get all agencies', error);
      return [];
    }
  }
}

export const agencyService = new AgencyService();