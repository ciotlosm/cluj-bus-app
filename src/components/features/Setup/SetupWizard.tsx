import React, { useState } from 'react';
import { useConfigStore } from '../../../stores/configStore';
import { useAgencyStore } from '../../../stores/agencyStore';
import { tranzyApiService } from '../../../services/tranzyApiService';
import ApiKeySetup from './ApiKeySetup';
import CitySelection from './CitySelection';
import { LocationSetup } from './index';
import { logger } from '../../../utils/loggerFixed';
import type { Coordinates, UserConfig } from '../../../types';

interface SetupWizardProps {
  onSetupComplete?: () => void;
}

type SetupStep = 'api-key' | 'city' | 'locations' | 'complete';

interface SetupData {
  apiKey: string;
  city: string;
  agencyId: string;
  homeLocation?: Coordinates;
  workLocation?: Coordinates;
  refreshRate: number;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('api-key');
  const [setupData, setSetupData] = useState<Partial<SetupData>>({
    refreshRate: 30000, // 30 seconds default
  });

  const { updateConfig } = useConfigStore();
  const { isApiValidated } = useAgencyStore();

  // If API is already validated, skip to city selection
  React.useEffect(() => {
    if (isApiValidated && currentStep === 'api-key') {
      logger.info('API already validated, skipping to city selection', undefined, 'UI');
      setCurrentStep('city');
    }
  }, [isApiValidated, currentStep]);

  const handleApiKeyValidated = (apiKey: string) => {
    logger.info('API key validated, proceeding to city selection', undefined, 'UI');
    setSetupData(prev => ({ ...prev, apiKey }));
    setCurrentStep('city');
  };

  const handleCitySelected = (city: string, agencyId: string) => {
    logger.info('City selected, proceeding to location setup', { city, agencyId }, 'UI');
    setSetupData(prev => ({ ...prev, city, agencyId }));
    setCurrentStep('locations');
  };

  const handleLocationsSet = (homeLocation: Coordinates, workLocation: Coordinates) => {
    logger.info('Locations set, completing setup', undefined, 'UI');
    
    const finalConfig: UserConfig = {
      city: setupData.city!,
      agencyId: setupData.agencyId!,
      homeLocation,
      workLocation,
      apiKey: setupData.apiKey!,
      refreshRate: setupData.refreshRate!,
      staleDataThreshold: 2, // Default to 2 minutes
    };

    // Update the configuration store
    updateConfig(finalConfig);

    // Set API key in service
    const service = tranzyApiService();
    service.setApiKey(finalConfig.apiKey);

    logger.info('Setup completed successfully', { city: finalConfig.city }, 'UI');
    
    if (onSetupComplete) {
      onSetupComplete();
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'city':
        setCurrentStep('api-key');
        break;
      case 'locations':
        setCurrentStep('city');
        break;
      default:
        break;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'api-key':
        return (
          <ApiKeySetup
            onApiKeyValidated={handleApiKeyValidated}
          />
        );
      
      case 'city':
        return (
          <CitySelection
            onCitySelected={handleCitySelected}
            onBack={handleBack}
          />
        );
      
      case 'locations':
        return (
          <LocationSetup
            onLocationsSet={handleLocationsSet}
            onBack={handleBack}
          />
        );
      
      default:
        return null;
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'api-key': return 1;
      case 'city': return 2;
      case 'locations': return 3;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      {/* Progress Indicator */}
      <div className="max-w-md mx-auto mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= getStepNumber()
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-8 h-1 ${
                    step < getStepNumber() ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>API Key</span>
          <span>City</span>
          <span>Locations</span>
        </div>
      </div>

      {/* Current Step */}
      {renderStep()}
    </div>
  );
};

export default SetupWizard;