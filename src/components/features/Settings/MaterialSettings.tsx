import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Storage as DatabaseIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Warning as AlertIcon,
  Favorite as FavoriteIcon,
  Schedule as ScheduleIcon,
  Backup as BackupIcon,
  DeleteForever as ResetIcon,
} from '@mui/icons-material';

import { useConfigStore } from '../../../stores/configStore';
import MaterialConfigurationManager from '../Configuration/MaterialConfigurationManager';
import MaterialFavoriteBusManager from '../FavoriteBuses/MaterialFavoriteBusManager';
import { SimplifiedCacheManager } from './SimplifiedCacheManager';
import { MaterialButton } from '../../ui/Button';
import { InfoCard } from '../../ui/Card';
import type { UserConfig } from '../../../types';

interface MaterialSettingsProps {
  onClose?: () => void;
}

interface ExportData {
  version: string;
  timestamp: string;
  config: UserConfig;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const MaterialSettings: React.FC<MaterialSettingsProps> = ({ onClose }) => {
  const { config, resetConfig, updateConfig } = useConfigStore();
  const [activeTab, setActiveTab] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const theme = useTheme();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleExportConfig = () => {
    if (!config) {
      alert('No configuration to export');
      return;
    }

    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      config: {
        ...config,
        apiKey: '***REDACTED***' // Don't export API key for security
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `bus-tracker-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string) as ExportData;
        
        if (!importData.config) {
          throw new Error('Invalid configuration file format');
        }

        // Don't import API key for security
        const { apiKey, ...configToImport } = importData.config;
        updateConfig(configToImport);
        
        setImportSuccess(true);
        setImportError(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import configuration');
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const handleResetConfig = () => {
    resetConfig();
    setShowResetConfirm(false);
    if (onClose) onClose();
  };

  const tabs = [
    { label: 'Configuration', icon: <SettingsIcon /> },
    { label: 'Favorites', icon: <FavoriteIcon /> },
    { label: 'Cache', icon: <DatabaseIcon /> },
    { label: 'Backup', icon: <BackupIcon /> },
  ];

  return (
    <Box>
      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          ))}
        </Tabs>
      </Card>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <MaterialConfigurationManager />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <MaterialFavoriteBusManager />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <SimplifiedCacheManager />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <InfoCard
          title="Backup & Restore"
          subtitle="Export, import, and reset your configuration"
          icon={<BackupIcon />}
        >
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <MaterialButton
              variant="outlined"
              icon={<DownloadIcon />}
              onClick={handleExportConfig}
              disabled={!config}
            >
              Export Config
            </MaterialButton>
            
            <MaterialButton
              variant="outlined"
              icon={<UploadIcon />}
              component="label"
            >
              Import Config
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                style={{ display: 'none' }}
              />
            </MaterialButton>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> API keys are not included in exports for security reasons. 
              You'll need to re-enter your API key after importing a configuration.
            </Typography>
          </Alert>

          <Divider sx={{ my: 3 }} />

          {/* Reset Section */}
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ResetIcon />
                Reset All Settings
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This will permanently delete all your configuration, favorites, and cached data.
              </Typography>
              <MaterialButton
                variant="outlined"
                color="error"
                onClick={() => setShowResetConfirm(true)}
                icon={<ResetIcon />}
                size="small"
              >
                Reset Everything
              </MaterialButton>
            </Box>
          </Alert>
        </InfoCard>
      </TabPanel>

      {/* Subtle version footer */}
      <Box sx={{ 
        textAlign: 'center', 
        py: 2, 
        mt: 4,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` 
      }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
          Cluj Bus Tracker v1.0.0
        </Typography>
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertIcon color="warning" />
          Reset All Settings
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset all settings? This will:
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <li>Clear your API key</li>
            <li>Remove city and location settings</li>
            <li>Delete all favorite buses</li>
            <li>Clear all cached data</li>
          </Box>
          <Typography sx={{ mt: 2, fontWeight: 600, color: 'error.main' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleResetConfig}
            color="error"
            variant="contained"
            startIcon={<ResetIcon />}
          >
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={importSuccess}
        autoHideDuration={6000}
        onClose={() => setImportSuccess(false)}
      >
        <Alert
          onClose={() => setImportSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Configuration imported successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!importError}
        autoHideDuration={6000}
        onClose={() => setImportError(null)}
      >
        <Alert
          onClose={() => setImportError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {importError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MaterialSettings;