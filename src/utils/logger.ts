/**
 * Secure Logging Utility for EventNexus
 * 
 * Prevents sensitive data from being logged in production
 * All console.log calls should be replaced with logger.log
 * Centralized logging with in-memory storage for admin monitoring
 */

const isDev = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';

// In-memory log storage for admin console monitor
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  data?: any;
}

let logStore: LogEntry[] = [];
let logListeners: Array<(log: LogEntry) => void> = [];
const MAX_LOGS = 500; // Keep last 500 logs in memory

/**
 * Sanitizes data before logging to prevent sensitive info leakage
 */
const sanitizeData = (data: any): any => {
  if (!data) return data;
  
  // Don't sanitize in development
  if (isDev) return data;
  
  // For production, redact sensitive fields
  if (typeof data === 'object') {
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'email', 'phone', 'ssn'];
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * Add log entry to in-memory store and notify listeners
 */
const addLogEntry = (level: LogEntry['level'], args: any[]) => {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    message: args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(sanitizeData(arg))
    ).join(' '),
    data: args.length > 1 ? sanitizeData(args.slice(1)) : undefined
  };
  
  logStore.push(entry);
  
  // Keep only last MAX_LOGS entries
  if (logStore.length > MAX_LOGS) {
    logStore = logStore.slice(-MAX_LOGS);
  }
  
  // Notify all listeners
  logListeners.forEach(listener => listener(entry));
};

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: any[]) => {
    addLogEntry('log', args);
    if (isDev) {
      console.log(...args.map(sanitizeData));
    }
  },

  /**
   * Log errors (always logged, but sanitized in production)
   */
  error: (...args: any[]) => {
    addLogEntry('error', args);
    console.error(...args.map(sanitizeData));
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]) => {
    addLogEntry('warn', args);
    if (isDev) {
      console.warn(...args.map(sanitizeData));
    }
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: any[]) => {
    addLogEntry('debug', args);
    if (isDev || isTest) {
      console.debug(...args.map(sanitizeData));
    }
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: any[]) => {
    addLogEntry('info', args);
    if (isDev) {
      console.info(...args.map(sanitizeData));
    }
  },
  
  /**
   * Get all stored logs
   */
  getLogs: (level?: LogEntry['level']): LogEntry[] => {
    if (level) {
      return logStore.filter(log => log.level === level);
    }
    return [...logStore];
  },
  
  /**
   * Subscribe to new log entries
   */
  subscribe: (callback: (log: LogEntry) => void): (() => void) => {
    logListeners.push(callback);
    // Return unsubscribe function
    return () => {
      logListeners = logListeners.filter(l => l !== callback);
    };
  },
  
  /**
   * Clear all logs
   */
  clearLogs: () => {
    logStore = [];
  },

  /**
   * Force log (bypasses environment check - use sparingly)
   */
  force: (...args: any[]) => {
    console.log(...args.map(sanitizeData));
  }
};

// Re-export for convenience
export default logger;
