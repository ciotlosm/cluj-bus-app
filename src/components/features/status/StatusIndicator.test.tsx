import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatusIndicator } from './StatusIndicator';
import { useLocationStore } from '../../../stores/locationStore';
import { useStatusStore } from '../../../stores/statusStore';

// Mock the stores
vi.mock('../../../stores/locationStore');
vi.mock('../../../stores/statusStore');

const mockLocationStore = {
  currentPosition: null,
  permissionState: null,
  locationAccuracy: null,
  lastUpdated: null,
  requestLocation: vi.fn()
};

const mockStatusStore = {
  apiStatus: 'online' as const,
  networkOnline: true,
  lastApiCheck: Date.now(),
  responseTime: 150,
  setNetworkStatus: vi.fn()
};

describe('StatusIndicator', () => {
  beforeEach(() => {
    (useLocationStore as any).mockReturnValue(mockLocationStore);
    (useStatusStore as any).mockReturnValue(mockStatusStore);
  });

  it('renders both GPS and API status icons', () => {
    render(<StatusIndicator />);
    
    expect(screen.getByLabelText('GPS status')).toBeInTheDocument();
    expect(screen.getByLabelText('API connectivity status')).toBeInTheDocument();
  });

  it('shows GPS detail dialog when GPS icon is clicked', async () => {
    render(<StatusIndicator showGpsDetails={true} />);
    
    const gpsIcon = screen.getByLabelText('GPS status');
    fireEvent.click(gpsIcon);
    
    await waitFor(() => {
      expect(screen.getByText('Location Status Details')).toBeInTheDocument();
    });
  });

  it('shows API detail dialog when API icon is clicked', async () => {
    render(<StatusIndicator />);
    
    const apiIcon = screen.getByLabelText('API connectivity status');
    fireEvent.click(apiIcon);
    
    await waitFor(() => {
      expect(screen.getByText('Connection Status Details')).toBeInTheDocument();
    });
  });

  it('displays actionable tooltips on hover', async () => {
    render(<StatusIndicator />);
    
    const gpsIcon = screen.getByLabelText('GPS status');
    fireEvent.mouseEnter(gpsIcon);
    
    await waitFor(() => {
      expect(screen.getByText(/Click for details/)).toBeInTheDocument();
    });
  });

  it('calls requestLocation when GPS icon is clicked and no position available', () => {
    render(<StatusIndicator />);
    
    const gpsIcon = screen.getByLabelText('GPS status');
    fireEvent.click(gpsIcon);
    
    expect(mockLocationStore.requestLocation).toHaveBeenCalled();
  });

  it('handles network events properly', () => {
    render(<StatusIndicator />);
    
    // Simulate offline event
    fireEvent(window, new Event('offline'));
    expect(mockStatusStore.setNetworkStatus).toHaveBeenCalledWith(false);
    
    // Simulate online event
    fireEvent(window, new Event('online'));
    expect(mockStatusStore.setNetworkStatus).toHaveBeenCalledWith(true);
  });
});