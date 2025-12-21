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
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  setApiKey: (key: string) => void;
  setAgency: (agency_id: number) => void;
  setHomeLocation: (lat: number, lon: number) => void;
  setWorkLocation: (lat: number, lon: number) => void;
  clearError: () => void;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      // Raw config data
      apiKey: null,
      agency_id: null,
      home_location: null,
      work_location: null,
      
      // Simple states
      loading: false,
      error: null,
      
      // Actions
      setApiKey: (key: string) => set({ apiKey: key, error: null }),
      setAgency: (agency_id: number) => set({ agency_id, error: null }),
      setHomeLocation: (lat: number, lon: number) => 
        set({ home_location: { lat, lon }, error: null }),
      setWorkLocation: (lat: number, lon: number) => 
        set({ work_location: { lat, lon }, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'config-store',
    }
  )
);