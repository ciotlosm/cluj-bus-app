// Logging system for Cluj Bus App

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
  userId: string; // Always required now
  sessionId: string;
}

class FixedLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private currentLogLevel: LogLevel = LogLevel.INFO;
  
  // Message consolidation for spam prevention
  private messageCounters = new Map<string, { count: number; lastLogged: number; data: any[] }>();
  private consolidationInterval = 5000; // 5 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    // Note: Using console.log directly here since this IS the logger system
    console.log('🔧 FixedLogger constructor called - userId will be SYSTEM');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    // Note: Using console.log directly here since this IS the logger system
    console.log(`🔧 Log level changed to: ${this.getLogLevelName(level)}`);
  }

  getLogLevel(): LogLevel {
    return this.currentLogLevel;
  }

  getLogLevelName(level: LogLevel): string {
    const names = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO', 
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR'
    };
    return names[level] || 'UNKNOWN';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with styling
    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const userId = entry.userId || 'SYSTEM'; // Fallback just in case
    const prefix = `[${timestamp}] [${userId}] [${entry.category}]`;

    const styles = {
      [LogLevel.DEBUG]: 'color: #6b7280; font-weight: normal;',
      [LogLevel.INFO]: 'color: #3b82f6; font-weight: normal;',
      [LogLevel.WARN]: 'color: #f59e0b; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #ef4444; font-weight: bold;',
    };

    console.log(`%c${prefix} ${entry.message}`, styles[entry.level]);
    
    if (entry.data) {
      // Handle axios errors and other complex objects in data
      if (entry.data && typeof entry.data === 'object') {
        // Extract useful information from axios errors
        if (entry.data.config?.url || entry.data.response) {
          console.log('📊 Data:', {
            url: entry.data.config?.url,
            status: entry.data.response?.status,
            statusText: entry.data.response?.statusText,
            message: entry.data.message,
            code: entry.data.code,
          });
        } else {
          console.log('📊 Data:', entry.data);
        }
      } else {
        console.log('📊 Data:', entry.data);
      }
    }
    
    if (entry.error) {
      // Properly serialize error objects to avoid "[object Object]"
      if (entry.error instanceof Error) {
        const errorDetails: any = {
          name: entry.error.name,
          message: entry.error.message,
        };
        
        // Include stack trace in development
        if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
          errorDetails.stack = entry.error.stack;
        }
        
        // Include any additional properties from the error object (like TransformationError properties)
        const additionalProps = Object.keys(entry.error).filter(
          key => !['name', 'message', 'stack'].includes(key)
        );
        additionalProps.forEach(key => {
          const value = (entry.error as any)[key];
          // Safely serialize complex objects
          try {
            errorDetails[key] = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
          } catch {
            errorDetails[key] = String(value);
          }
        });
        
        console.error('❌ Error:', errorDetails);
      } else if (typeof entry.error === 'object' && entry.error !== null) {
        // Handle non-Error objects (like axios errors)
        try {
          console.error('❌ Error:', JSON.stringify(entry.error, null, 2));
        } catch {
          // Fallback if JSON.stringify fails (circular references, etc.)
          console.error('❌ Error:', entry.error);
        }
      } else {
        console.error('❌ Error:', entry.error);
      }
    }
  }

  private shouldConsolidate(message: string, data?: any): boolean {
    const key = message;
    const now = Date.now();
    const counter = this.messageCounters.get(key);

    if (!counter) {
      // First occurrence - log it and start tracking
      this.messageCounters.set(key, { count: 1, lastLogged: now, data: data ? [data] : [] });
      return false;
    }

    // Increment counter and collect data
    counter.count++;
    if (data) {
      counter.data.push(data);
    }

    // Check if enough time has passed to log consolidated message
    if (now - counter.lastLogged >= this.consolidationInterval) {
      // Log consolidated message
      const consolidatedMessage = `${message} (${counter.count} occurrences in last ${this.consolidationInterval/1000}s)`;
      const consolidatedData = counter.data.length > 0 ? {
        totalOccurrences: counter.count,
        sampleData: counter.data.slice(0, 5), // Show first 5 examples
        totalDataPoints: counter.data.length
      } : { totalOccurrences: counter.count };

      // Reset counter
      this.messageCounters.set(key, { count: 0, lastLogged: now, data: [] });
      
      // Output consolidated message
      this.addLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        category: 'CONSOLIDATED',
        message: consolidatedMessage,
        data: consolidatedData,
        userId: 'SYSTEM',
        sessionId: this.sessionId,
      });

      return true; // Indicates we logged a consolidated message
    }

    return true; // Suppress this individual message
  }

  debug(message: string, data?: any, category = 'APP'): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category,
      message,
      data,
      userId: 'SYSTEM',
      sessionId: this.sessionId,
    });
  }

  // Consolidated debug logging for repetitive messages
  debugConsolidated(message: string, data?: any, category = 'APP'): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    // Check if this message should be consolidated
    if (this.shouldConsolidate(message, data)) {
      return; // Message was either consolidated or suppressed
    }

    // Log the first occurrence normally
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category,
      message,
      data,
      userId: 'SYSTEM',
      sessionId: this.sessionId,
    });
  }

  info(message: string, data?: any, category = 'APP'): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category,
      message,
      data,
      userId: 'SYSTEM',
      sessionId: this.sessionId,
    });
  }

  warn(message: string, data?: any, category = 'APP'): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.WARN,
      category,
      message,
      data,
      userId: 'SYSTEM',
      sessionId: this.sessionId,
    });
  }

  error(message: string, errorOrData?: Error | any, category = 'APP'): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    let processedError: Error | undefined;
    let additionalData: any;

    // Handle different types of second parameter
    if (errorOrData instanceof Error) {
      // It's an actual Error object
      processedError = errorOrData;
    } else if (errorOrData && typeof errorOrData === 'object') {
      // It's a data object (like the current case with {error: ..., duration: ...})
      additionalData = errorOrData;
      
      // If the data object has an 'error' property, extract it
      if (errorOrData.error) {
        if (errorOrData.error instanceof Error) {
          processedError = errorOrData.error;
        } else if (typeof errorOrData.error === 'string') {
          processedError = new Error(errorOrData.error);
        } else {
          // Avoid [object Object] by properly stringifying
          processedError = new Error(JSON.stringify(errorOrData.error));
        }
      }
    } else if (errorOrData !== undefined) {
      // It's a primitive value
      processedError = new Error(String(errorOrData));
    }
    
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category,
      message,
      error: processedError,
      data: additionalData,
      userId: 'SYSTEM',
      sessionId: this.sessionId,
    });
  }

  // API-specific logging methods
  apiRequest(url: string, method: string, data?: any): void {
    this.info(`API Request: ${method} ${url}`, data, 'API');
  }

  apiResponse(url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API Response: ${status} ${url}`;
    
    if (level === LogLevel.ERROR) {
      this.error(message, data, 'API');
    } else {
      this.info(message, data, 'API');
    }
  }

  apiError(url: string, error: Error): void {
    this.error(`API Error: ${url}`, error, 'API');
  }

  // Store-specific logging
  storeAction(storeName: string, action: string, data?: any): void {
    this.debug(`Store Action: ${storeName}.${action}`, data, 'STORE');
  }

  storeError(storeName: string, action: string, error: Error): void {
    this.error(`Store Error: ${storeName}.${action}`, error, 'STORE');
  }

  // Component-specific logging
  componentMount(componentName: string): void {
    this.debug(`Component Mounted: ${componentName}`, undefined, 'COMPONENT');
  }

  componentUnmount(componentName: string): void {
    this.debug(`Component Unmounted: ${componentName}`, undefined, 'COMPONENT');
  }

  componentError(componentName: string, error: Error): void {
    this.error(`Component Error: ${componentName}`, error, 'COMPONENT');
  }

  // Get logs for debugging
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.info('Logs cleared');
  }
}

// Singleton instance
export const logger = new FixedLogger();

// Note: Log level is set by configStore initialization to respect user preferences

// Test log to verify new logger is working
logger.info('NEW Fixed Logger initialized successfully', { 
  timestamp: new Date().toISOString(),
  fix: 'Cache bypass with new module name',
  userId: 'SYSTEM'
});