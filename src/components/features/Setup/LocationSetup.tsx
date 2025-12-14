import React, { useState } from 'react';
import { MaterialLocationPicker } from '../LocationPicker/MaterialLocationPicker';
import { logger } from '../../../utils/loggerFixed';
import type { Coordinates } from '../../../types';

interface LocationSetupProps {
  onLocationsSet: (homeLocation: Coordinates, workLocation: Coordinates) => void;
  onBack?: () => void;
}

export const LocationSetup: React.FC<LocationSetupProps> = ({ onLocationsSet, onBack }) => {
  const [homeLocation, setHomeLocation] = useState<Coordinates | null>(null);
  const [workLocation, setWorkLocation] = useState<Coordinates | null>(null);
  const [currentStep, setCurrentStep] = useState<'home' | 'work'>('home');

  const handleLocationSelected = (location: Coordinates) => {
    if (currentStep === 'home') {
      setHomeLocation(location);
      setCurrentStep('work');
      logger.info('Home location set in setup wizard', { location }, 'UI');
    } else {
      setWorkLocation(location);
      logger.info('Work location set in setup wizard', { location }, 'UI');
      
      if (homeLocation) {
        onLocationsSet(homeLocation, location);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'work' && homeLocation) {
      setCurrentStep('home');
      setHomeLocation(null);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">{currentStep === 'home' ? '🏠' : '🏢'}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Set Your {currentStep === 'home' ? 'Home' : 'Work'} Location
        </h2>
        <p className="text-gray-600">
          {currentStep === 'home' 
            ? 'Choose your home location for personalized route suggestions'
            : 'Choose your work location to complete the setup'
          }
        </p>
      </div>

      <div className="mb-6">
        <MaterialLocationPicker
          open={true}
          onClose={() => {}}
          title="Select Location"
          type="home"
          onLocationSelected={handleLocationSelected}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
        >
          Back
        </button>
        {homeLocation && workLocation && (
          <button
            type="button"
            onClick={() => onLocationsSet(homeLocation, workLocation)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationSetup;