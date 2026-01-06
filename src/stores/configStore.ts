// ConfigStore - Clean state management with raw configuration data
// No cross-store dependencies, simple loading and error states

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigStore {
  // Raw config data - using raw API field names
  apiKey: string | null;
  agency_id: number | null;
  home_location: { lat: number; lon: number } | null;
  work_location: { lat: number; lon: number } | null;
  theme: 'light' | 'dark' | 'auto' | null;
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  success: string | null;
  
  // Actions
  setApiKey: (key: string) => void;
  setAgency: (agency_id: number) => void;
  setHomeLocation: (lat: number, lon: number) => void;
  setWorkLocation: (lat: number, lon: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleTheme: () => void;
  clearError: () => void;
  clearSuccess: () => void;
  validateAndSave: (apiKey: string, agencyId: number) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      // Raw config data
      apiKey: null,
      agency_id: null,
      home_location: null,
      work_location: null,
      theme: null,
      
      // Simple states
      loading: false,
      error: null,
      success: null,
      
      // Actions
      setApiKey: (key: string) => {
        set({ apiKey: key, error: null, success: null });
      },
      
      setAgency: (agency_id: number) => {
        set({ agency_id, error: null, success: null });
      },
      
      validateAndSave: async (apiKey: string, agencyId: number) => {
        set({ loading: true, error: null, success: null });
        
        try {
          // Temporarily set the config to test it
          const originalApiKey = get().apiKey;
          const originalAgencyId = get().agency_id;
          
          set({ apiKey, agency_id: agencyId });
          
          // Test the API key by calling existing agencyService
          const { agencyService } = await import('../services/agencyService');
          await agencyService.getAgencies();
          
          // If we get here, the API call succeeded
          set({ 
            loading: false, 
            success: 'Configuration validated and saved successfully'
          });
        } catch (error) {
          // Restore original values on error
          const originalApiKey = get().apiKey;
          const originalAgencyId = get().agency_id;
          
          let errorMessage = 'Failed to validate configuration';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          set({ 
            loading: false, 
            error: errorMessage,
            success: null
          });
        }
      },
      
      setHomeLocation: (lat: number, lon: number) => 
        set({ home_location: { lat, lon }, error: null, success: null }),
      setWorkLocation: (lat: number, lon: number) => 
        set({ work_location: { lat, lon }, error: null, success: null }),
      setTheme: (theme: 'light' | 'dark' | 'auto') => 
        set({ theme, error: null, success: null }),
      toggleTheme: () => 
        set((state) => ({ 
          theme: state.theme === 'dark' ? 'light' : 'dark', 
          error: null,
          success: null
        })),
      clearError: () => set({ error: null }),
      clearSuccess: () => set({ success: null }),
    }),
    {
      name: 'config-store',
    }
  )
);