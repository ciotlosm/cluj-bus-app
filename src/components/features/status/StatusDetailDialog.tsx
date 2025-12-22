import type { FC } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';
import type { PermissionState, LocationAccuracy } from '../../../types/location';
import {
  getGpsIcon,
  getGpsColor,
  getGpsStatusText,
  getGpsRecommendations
} from '../../../utils/status/gpsStatusHelpers';
import {
  getApiIcon,
  getApiColor,
  getApiStatusText,
  getApiRecommendations
} from '../../../utils/status/apiStatusHelpers';

interface GpsState {
  status: 'available' | 'unavailable' | 'disabled';
  accuracy: LocationAccuracy | null;
  permissionState: PermissionState | null;
  lastUpdated: number | null;
}

interface ApiState {
  status: 'online' | 'offline' | 'error';
  networkOnline: boolean;
  lastCheck: number | null;
  responseTime: number | null;
}

interface StatusDetailDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'gps' | 'api';
  gpsState?: GpsState;
  apiState?: ApiState;
}

export const StatusDetailDialog: FC<StatusDetailDialogProps> = ({
  open,
  onClose,
  type,
  gpsState,
  apiState
}) => {
  const renderGpsDetails = () => {
    if (!gpsState) return null;
    
    const { status, accuracy, permissionState, lastUpdated } = gpsState;
    const IconComponent = getGpsIcon(status, accuracy, permissionState);
    const color = getGpsColor(status, accuracy, permissionState);
    const statusText = getGpsStatusText(status, permissionState);
    const recommendations = getGpsRecommendations(status, accuracy, permissionState);

    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconComponent sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h6">GPS Location Services</Typography>
            <Chip label={statusText} color={color} size="small" />
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Accuracy Level:</strong> {accuracy ? accuracy.charAt(0).toUpperCase() + accuracy.slice(1) : 'Unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Permission Status:</strong> {permissionState || 'Unknown'}
          </Typography>
          {lastUpdated && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Last Updated:</strong> {new Date(lastUpdated).toLocaleString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          {status === 'available' ? 'Tips:' : 'How to fix this:'}
        </Typography>
        <Box component="ul" sx={{ pl: 2, mt: 1 }}>
          {recommendations.map((rec, index) => (
            <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
              {rec}
            </Typography>
          ))}
        </Box>
      </>
    );
  };

  const renderApiDetails = () => {
    if (!apiState) return null;
    
    const { status, networkOnline, lastCheck, responseTime } = apiState;
    const IconComponent = getApiIcon(status, networkOnline);
    const color = getApiColor(status, networkOnline, responseTime);
    const statusText = getApiStatusText(status, networkOnline);
    const recommendations = getApiRecommendations(status, networkOnline, responseTime);

    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconComponent sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h6">Transit Data Connection</Typography>
            <Chip label={statusText} color={color} size="small" />
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Network Status:</strong> {networkOnline ? 'Online' : 'Offline'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Service Status:</strong> {status || 'Unknown'}
          </Typography>
          {responseTime && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Response Time:</strong> {responseTime}ms
            </Typography>
          )}
          {lastCheck && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Last Check:</strong> {new Date(lastCheck).toLocaleString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          {status === 'online' && networkOnline ? 'Status:' : 'How to fix this:'}
        </Typography>
        <Box component="ul" sx={{ pl: 2, mt: 1 }}>
          {recommendations.map((rec, index) => (
            <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
              {rec}
            </Typography>
          ))}
        </Box>
      </>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 2 } }
      }}
      // Improve accessibility and focus management
      aria-labelledby="status-dialog-title"
      aria-describedby="status-dialog-content"
      // Disable restore focus to prevent the aria-hidden warning
      disableRestoreFocus={true}
      keepMounted={false}
    >
      <DialogTitle id="status-dialog-title">
        {type === 'gps' ? 'Location Status Details' : 'Connection Status Details'}
      </DialogTitle>
      <DialogContent id="status-dialog-content">
        {type === 'gps' ? renderGpsDetails() : renderApiDetails()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" autoFocus>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};