/**
 * Nearby View Debug Panel
 * 
 * A temporary debug component that can be added to your app to troubleshoot
 * nearby view issues in real-time. Shows detailed information about station
 * selection, filtering, and route associations.
 * 
 * Usage: Add this component to your app temporarily during debugging
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import type { Coordinates, Station, LiveVehicle } from '../../types';
import type { Route, StopTime, Trip } from '../../types/tranzyApi';
import { debugNearbyView, type NearbyViewDebugReport, type DebugStationInfo } from '../../utils/nearbyViewDebugger';

interface NearbyViewDebugPanelProps {
  userLocation: Coordinates | null;
  stations: Station[];
  routes: Route[];
  vehicles: LiveVehicle[];
  stopTimes?: StopTime[];
  trips?: Trip[];
  onClose?: () => void;
}

export const NearbyViewDebugPanel: React.FC<NearbyViewDebugPanelProps> = ({
  userLocation,
  stations,
  routes,
  vehicles,
  stopTimes,
  trips,
  onClose
}) => {
  const [debugReport, setDebugReport] = useState<NearbyViewDebugReport | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<string | false>('overview');

  // Generate debug report
  useEffect(() => {
    if (userLocation && stations.length > 0) {
      const report = debugNearbyView(userLocation, stations, routes, stopTimes, trips);
      setDebugReport(report);
    }
  }, [userLocation, stations, routes, stopTimes, trips]);

  // Auto-refresh every 5 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (userLocation && stations.length > 0) {
        const report = debugNearbyView(userLocation, stations, routes, stopTimes, trips);
        setDebugReport(report);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, userLocation, stations, routes, stopTimes, trips]);

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (!userLocation) {
    return (
      <Card sx={{ m: 2, bgcolor: 'warning.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Nearby View Debug Panel
          </Typography>
          <Typography>
            No GPS location available. Enable location services to debug nearby view.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!debugReport) {
    return (
      <Card sx={{ m: 2 }}>
        <CardContent>
          <Typography>Loading debug report...</Typography>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (info: DebugStationInfo) => {
    if (info.selected) {
      return <CheckCircleIcon color="success" fontSize="small" />;
    }
    return <CancelIcon color="error" fontSize="small" />;
  };

  const getStatusColor = (info: DebugStationInfo) => {
    if (info.selected) return 'success';
    if (info.rejectionReason === 'too_far') return 'warning';
    if (info.rejectionReason === 'no_routes') return 'error';
    if (info.rejectionReason === 'threshold_exceeded') return 'info';
    return 'default';
  };

  const getStatusText = (info: DebugStationInfo) => {
    if (info.selected) return `Selected (${info.selectionType})`;
    if (info.rejectionReason === 'too_far') return 'Too far';
    if (info.rejectionReason === 'no_routes') return 'No routes';
    if (info.rejectionReason === 'threshold_exceeded') return 'Threshold exceeded';
    return 'Unknown';
  };

  return (
    <Box sx={{ m: 2, maxWidth: 1200 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              🔍 Nearby View Debug Panel
            </Typography>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto-refresh"
              />
              {onClose && (
                <Button onClick={onClose} sx={{ ml: 2 }}>
                  Close
                </Button>
              )}
            </Box>
          </Box>

          {/* Recommendations */}
          {debugReport.recommendations.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Recommendations:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {debugReport.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Overview */}
          <Accordion expanded={expanded === 'overview'} onChange={handleAccordionChange('overview')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                📊 Overview
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      User Location
                    </Typography>
                    <Typography variant="body2">
                      <LocationOnIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {debugReport.userLocation.latitude.toFixed(4)}, {debugReport.userLocation.longitude.toFixed(4)}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Configuration
                    </Typography>
                    <Typography variant="body2">
                      Radius: {debugReport.searchRadius}m<br />
                      Threshold: {debugReport.distanceThreshold}m
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Stations
                    </Typography>
                    <Typography variant="body2">
                      Total: {debugReport.totalStations}<br />
                      In radius: {debugReport.stationsInRadius}<br />
                      With routes: {debugReport.stationsWithRoutes}<br />
                      Selected: {debugReport.selectedStations}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      GTFS Data
                    </Typography>
                    <Typography variant="body2">
                      Stop times: {debugReport.gtfsDataAvailable.hasStopTimes ? '✅' : '❌'} ({debugReport.gtfsDataAvailable.stopTimesCount})<br />
                      Trips: {debugReport.gtfsDataAvailable.hasTrips ? '✅' : '❌'} ({debugReport.gtfsDataAvailable.tripsCount})
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Selection Results */}
          <Accordion expanded={expanded === 'selection'} onChange={handleAccordionChange('selection')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                🏁 Selection Results
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                {debugReport.selectionSummary.closestStation ? (
                  <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        ✅ Closest Station
                      </Typography>
                      <Typography variant="h6">
                        {debugReport.selectionSummary.closestStation.station.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Distance: {Math.round(debugReport.selectionSummary.closestStation.distanceFromUser)}m
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {debugReport.selectionSummary.closestStation.associatedRoutes.map(route => (
                          <Chip
                            key={route.id}
                            label={route.routeName}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                            icon={<DirectionsBusIcon />}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="outlined" sx={{ bgcolor: 'error.light' }}>
                    <CardContent>
                      <Typography variant="subtitle1">
                        ❌ No Closest Station Selected
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {debugReport.selectionSummary.secondStation ? (
                  <Card variant="outlined" sx={{ bgcolor: 'info.light' }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        ✅ Second Station
                      </Typography>
                      <Typography variant="h6">
                        {debugReport.selectionSummary.secondStation.station.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Distance: {Math.round(debugReport.selectionSummary.secondStation.distanceFromUser)}m
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {debugReport.selectionSummary.secondStation.associatedRoutes.map(route => (
                          <Chip
                            key={route.id}
                            label={route.routeName}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                            icon={<DirectionsBusIcon />}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="outlined" sx={{ bgcolor: 'grey.100' }}>
                    <CardContent>
                      <Typography variant="subtitle1">
                        ⚪ No Second Station Selected
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Detailed Station Analysis */}
          <Accordion expanded={expanded === 'stations'} onChange={handleAccordionChange('stations')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                📋 Detailed Station Analysis
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Station Name</TableCell>
                      <TableCell align="right">Distance (m)</TableCell>
                      <TableCell align="center">In Radius</TableCell>
                      <TableCell align="center">Has Routes</TableCell>
                      <TableCell>Routes</TableCell>
                      <TableCell align="right">Stop Times</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debugReport.stationDetails
                      .sort((a, b) => a.distanceFromUser - b.distanceFromUser)
                      .map((info) => (
                        <TableRow key={info.station.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getStatusIcon(info)}
                              <Chip
                                label={getStatusText(info)}
                                size="small"
                                color={getStatusColor(info)}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {info.station.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {info.station.id}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {Math.round(info.distanceFromUser)}
                          </TableCell>
                          <TableCell align="center">
                            {info.inRadius ? '✅' : '❌'}
                          </TableCell>
                          <TableCell align="center">
                            {info.hasRoutes ? '✅' : '❌'} ({info.associatedRoutes.length})
                          </TableCell>
                          <TableCell>
                            <Box>
                              {info.associatedRoutes.map(route => (
                                <Chip
                                  key={route.id}
                                  label={route.routeName}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {info.stopTimesCount}
                          </TableCell>
                          <TableCell>
                            {info.rejectionReason || (info.selected ? 'Selected' : '-')}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Routes Information */}
          <Accordion expanded={expanded === 'routes'} onChange={handleAccordionChange('routes')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                🚌 Routes Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" gutterBottom>
                Total routes: {debugReport.routeInfo.totalRoutes}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {routes.map(route => (
                  <Card key={route.id} variant="outlined" sx={{ minWidth: 200 }}>
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                      <Typography variant="subtitle2">
                        <DirectionsBusIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {route.routeName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {route.routeDesc}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NearbyViewDebugPanel;