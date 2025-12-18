import React, { useState, useEffect } from 'react';
import { logger, LogLevel } from '../../../utils/logger';
import { Button } from '../../ui/Button';

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState(logger.getLogs());
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>(LogLevel.DEBUG);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  const filteredLogs = logs.filter(log => log.level >= selectedLevel);
  const recentLogs = filteredLogs.slice(-100); // Show last 100 logs

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-600';
      case LogLevel.INFO: return 'text-blue-600';
      case LogLevel.WARN: return 'text-yellow-600';
      case LogLevel.ERROR: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getLevelBg = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'bg-gray-100';
      case LogLevel.INFO: return 'bg-blue-100';
      case LogLevel.WARN: return 'bg-yellow-100';
      case LogLevel.ERROR: return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 left-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Toggle Debug Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-gray-900">Debug Panel</h2>
                  <span className="text-sm text-gray-500">({recentLogs.length} logs)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(Number(e.target.value) as LogLevel)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={LogLevel.DEBUG}>Debug+</option>
                    <option value={LogLevel.INFO}>Info+</option>
                    <option value={LogLevel.WARN}>Warn+</option>
                    <option value={LogLevel.ERROR}>Error</option>
                  </select>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      logger.clearLogs();
                      setLogs([]);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const logData = logger.exportLogs();
                      navigator.clipboard?.writeText(logData);
                    }}
                  >
                    Copy
                  </Button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {recentLogs.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No logs to display
                  </div>
                ) : (
                  recentLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${getLevelBg(log.level)} border-l-current ${getLevelColor(log.level)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-mono bg-white px-2 py-1 rounded">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span className="text-xs font-medium">
                              {LogLevel[log.level]}
                            </span>
                            <span className="text-xs text-gray-500">
                              [{log.category}]
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {log.message}
                          </p>
                          {log.data && (
                            <pre className="text-xs text-gray-600 bg-white p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                          {log.error && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                              <div className="font-medium">{log.error.message}</div>
                              {log.error.stack && (
                                <pre className="mt-1 text-xs overflow-x-auto">
                                  {log.error.stack}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugPanel;