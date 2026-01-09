// Shared Logger Utility for Edge Functions
// Logs to both console and agent_logs table for admin UI visibility

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type LogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug'

export interface LogContext {
  agent_name: string
  job_id?: string
  city_id?: string
  source_id?: string
  event_id?: string
}

// Simple function-based logger (no class needed)
export async function log(
  supabase: SupabaseClient,
  agentName: string,
  level: LogLevel,
  message: string,
  details?: any,
  context?: { city_id?: string; source_id?: string; event_id?: string; job_id?: string }
) {
  // Console log (for Supabase logs)
  const prefix = getPrefix(level)
  console.log(`${prefix} ${message}`, details ? JSON.stringify(details) : '')

  // Database log (for admin UI) - fire and forget, don't block execution
  try {
    supabase.from('agent_logs').insert({
      agent_name: agentName,
      level,
      message,
      details: details || null,
      city_id: context?.city_id || null,
      source_id: context?.source_id || null,
      event_id: context?.event_id || null,
      job_id: context?.job_id || null,
    }).then() // Don't await - fire and forget
  } catch (error) {
    // Silently fail - logging shouldn't break the agent
  }
}

function getPrefix(level: LogLevel): string {
  switch (level) {
    case 'info': return 'ℹ️'
    case 'success': return '✅'
    case 'warning': return '⚠️'
    case 'error': return '❌'
    case 'debug': return '🔍'
  }
}

// Legacy class for backward compatibility
export class AgentLogger {
  private supabase: SupabaseClient
  private context: LogContext
  private startTime: number

  constructor(supabase: SupabaseClient, context: LogContext) {
    this.supabase = supabase
    this.context = context
    this.startTime = Date.now()
  }

  async log(level: LogLevel, message: string, details?: any) {
    return log(this.supabase, this.context.agent_name, level, message, details, {
      city_id: this.context.city_id,
      source_id: this.context.source_id,
      event_id: this.context.event_id,
      job_id: this.context.job_id,
    })
  }

  info(message: string, details?: any) {
    return this.log('info', message, details)
  }

  success(message: string, details?: any) {
    return this.log('success', message, details)
  }

  warning(message: string, details?: any) {
    return this.log('warning', message, details)
  }

  error(message: string, details?: any) {
    return this.log('error', message, details)
  }

  debug(message: string, details?: any) {
    return this.log('debug', message, details)
  }
}
