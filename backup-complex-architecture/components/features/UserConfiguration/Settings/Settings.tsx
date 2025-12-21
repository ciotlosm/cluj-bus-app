import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Storage as DatabaseIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Backup as BackupIcon,
  Key as KeyIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';

import { useConfigStore } from '../../../stores/configStore';
import ConfigurationManager from '../../Configuration/ConfigurationManager';
import { CacheManagerPanel } from './CacheManagerPanel';
import ApiConfigurationPanel from './ApiConfigurationPanel';
import { Button, InfoCard, VersionControl } from '../../../ui';
import SettingsRoute from './SettingsRoute';
import { useThemeUtils, useMuiUtils } from '../../../hooks';
import type { UserConfig } from '../../../types';

interface SettingsProps {
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

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { config, updateConfig } = useConfigStore();
  const [activeTab, setActiveTab] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const { getBackgroundColors, getBorderColors } = useThemeUtils();
  const { getCardStyles } = useMuiUtils();

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



  const tabs = [
    { label: 'Favorites', icon: <FavoriteIcon /> },
    { label: 'Config', icon: <SettingsIcon /> },
    { label: 'API Keys', icon: <KeyIcon /> },
    { label: 'Cache', icon: <DatabaseIcon /> },
    { label: 'Backup', icon: <BackupIcon /> },
  ];

  return (
    <Box>
      {/* Header with Tabs and Version Control */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pr: 2 
        }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
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
          
          {/* Version Control in Header */}
          <VersionControl size="medium" />
        </Box>
      </Card>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <SettingsRoute />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <ConfigurationManager />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <ApiConfigurationPanel />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <CacheManagerPanel />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <InfoCard
          title="Backup & Restore"
          subtitle="Export, import, and reset your configuration"
          icon={<BackupIcon />}
        >
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportConfig}
              isDisabled={!config}
            >
              Export Config
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
            >
              Import Config
              <input
                accept=".json"
                onChange={handleImportConfig}
                style={{ display: 'none' }}
              />
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> API keys are not included in exports for security reasons. 
              You'll need to re-enter your API key after importing a configuration.
            </Typography>
          </Alert>


        </InfoCard>
      </TabPanel>





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

export { Settings };