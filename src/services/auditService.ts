/**
 * Audit Logging Service
 * Tracks user actions and application events for security and debugging
 * Stores logs in browser localStorage and can be sent to server
 */

export type AuditEventType =
  | 'user_login'
  | 'user_logout'
  | 'user_signup'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'event_publish'
  | 'ticket_purchase'
  | 'payment_success'
  | 'payment_failed'
  | 'credit_deduction'
  | 'ai_generation'
  | 'geocoding'
  | 'search'
  | 'profile_update'
  | 'settings_change'
  | 'admin_action'
  | 'error';

export interface AuditLog {
  id: string;
  timestamp: number; // Unix timestamp
  eventType: AuditEventType;
  userId?: string;
  username?: string;
  action: string; // Human-readable description
  details: Record<string, any>; // Additional context
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: 'client' | 'server'; // Where event originated
  userAgent: string;
  ipAddress?: string; // Server-provided only
}

const STORAGE_KEY = 'audit_logs';
const MAX_LOCAL_LOGS = 1000; // Keep last 1000 logs
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get all audit logs from localStorage
 */
function getLogs(): AuditLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save logs to localStorage
 */
function saveLogs(logs: AuditLog[]): void {
  try {
    // Keep only recent logs and respect max size
    const filtered = logs
      .filter(log => Date.now() - log.timestamp < LOG_RETENTION_MS)
      .slice(-MAX_LOCAL_LOGS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save audit logs:', error);
  }
}

/**
 * Log an event
 */
export function logEvent(
  eventType: AuditEventType,
  action: string,
  details: Record<string, any> = {},
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info',
  userId?: string,
  username?: string
): AuditLog {
  const log: AuditLog = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    eventType,
    userId,
    username,
    action,
    details,
    severity,
    source: 'client',
    userAgent: navigator.userAgent
  };

  // Save to localStorage
  const logs = getLogs();
  logs.push(log);
  saveLogs(logs);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const level = severity === 'error' || severity === 'critical' ? 'error' : 'log';
    console[level as 'error' | 'log'](
      `[${severity.toUpperCase()}] ${eventType}: ${action}`,
      details
    );
  }

  return log;
}

/**
 * Log user authentication event
 */
export function logAuth(
  type: 'login' | 'logout' | 'signup',
  userId: string,
  username: string,
  details: Record<string, any> = {}
): AuditLog {
  return logEvent(
    `user_${type}` as AuditEventType,
    `User ${type}: ${username}`,
    { userId, username, ...details },
    'info',
    userId,
    username
  );
}

/**
 * Log event creation/modification
 */
export function logEventAction(
  action: 'create' | 'update' | 'delete' | 'publish',
  eventId: string,
  eventName: string,
  userId: string,
  username: string,
  details: Record<string, any> = {}
): AuditLog {
  return logEvent(
    `event_${action}` as AuditEventType,
    `Event ${action}: ${eventName}`,
    { eventId, eventName, userId, username, ...details },
    'info',
    userId,
    username
  );
}

/**
 * Log financial transaction
 */
export function logTransaction(
  type: 'payment' | 'credit_deduction',
  userId: string,
  username: string,
  amount: number,
  status: 'success' | 'failed',
  details: Record<string, any> = {}
): AuditLog {
  const eventType =
    type === 'payment'
      ? status === 'success'
        ? 'payment_success'
        : 'payment_failed'
      : 'credit_deduction';

  return logEvent(
    eventType as AuditEventType,
    `${type === 'payment' ? 'Payment' : 'Credit deduction'} ${status}: ${amount}`,
    { userId, username, amount, status, ...details },
    status === 'failed' ? 'warning' : 'info',
    userId,
    username
  );
}

/**
 * Log AI operation
 */
export function logAIOperation(
  operation: string,
  userId: string,
  username: string,
  status: 'success' | 'failed',
  costCredits?: number,
  details: Record<string, any> = {}
): AuditLog {
  return logEvent(
    'ai_generation',
    `AI operation: ${operation} - ${status}`,
    { userId, username, operation, status, costCredits, ...details },
    status === 'failed' ? 'warning' : 'info',
    userId,
    username
  );
}

/**
 * Log error event
 */
export function logError(
  error: Error | string,
  context: string,
  userId?: string,
  username?: string,
  details: Record<string, any> = {}
): AuditLog {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return logEvent(
    'error',
    `Error in ${context}: ${errorMessage}`,
    { context, errorStack, ...details },
    'critical',
    userId,
    username
  );
}

/**
 * Get logs for specific user
 */
export function getUserLogs(userId: string): AuditLog[] {
  return getLogs().filter(log => log.userId === userId);
}

/**
 * Get logs of specific type
 */
export function getLogsByType(eventType: AuditEventType): AuditLog[] {
  return getLogs().filter(log => log.eventType === eventType);
}

/**
 * Get logs within date range
 */
export function getLogsByDateRange(startMs: number, endMs: number): AuditLog[] {
  return getLogs().filter(
    log => log.timestamp >= startMs && log.timestamp <= endMs
  );
}

/**
 * Get recent logs (last N)
 */
export function getRecentLogs(count: number = 50): AuditLog[] {
  return getLogs().slice(-count).reverse();
}

/**
 * Export logs as JSON (for admin download)
 */
export function exportLogs(filters?: {
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditLog['severity'];
}): string {
  let logs = getLogs();

  if (filters?.userId) {
    logs = logs.filter(log => log.userId === filters.userId);
  }

  if (filters?.eventType) {
    logs = logs.filter(log => log.eventType === filters.eventType);
  }

  if (filters?.severity) {
    logs = logs.filter(log => log.severity === filters.severity);
  }

  return JSON.stringify(logs, null, 2);
}

/**
 * Clear all audit logs
 * Should require admin confirmation
 */
export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Audit logs cleared');
  } catch (error) {
    console.error('Failed to clear audit logs:', error);
  }
}

/**
 * Get statistics about logged events
 */
export function getLogStats(): {
  total: number;
  byType: Record<AuditEventType, number>;
  bySeverity: Record<string, number>;
  oldestLog: AuditLog | null;
  newestLog: AuditLog | null;
} {
  const logs = getLogs();

  const byType: Record<AuditEventType, number> = {} as any;
  const bySeverity: Record<string, number> = {};
  let oldestLog: AuditLog | null = null;
  let newestLog: AuditLog | null = null;

  logs.forEach(log => {
    // By type
    byType[log.eventType] = (byType[log.eventType] || 0) + 1;

    // By severity
    bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;

    // Track oldest/newest
    if (!oldestLog || log.timestamp < oldestLog.timestamp) oldestLog = log;
    if (!newestLog || log.timestamp > newestLog.timestamp) newestLog = log;
  });

  return {
    total: logs.length,
    byType,
    bySeverity,
    oldestLog,
    newestLog
  };
}
