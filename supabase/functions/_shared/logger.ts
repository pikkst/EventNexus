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
    // Console log (for Supabase logs)
    const prefix = this.getPrefix(level)
    console.log(`${prefix} ${message}`, details ? JSON.stringify(details) : '')

    // Database log (for admin UI)
    try {
      await this.supabase.from('agent_logs').insert({
        agent_name: this.context.agent_name,
        job_id: this.context.job_id,
        city_id: this.context.city_id,
        source_id: this.context.source_id,
        event_id: this.context.event_id,
        level,
        message,
        details: details || null,
        duration_ms: Date.now() - this.startTime,
      })
    } catch (error) {
      console.error('Failed to write log to database:', error)
    }
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

  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'info': return 'ℹ️'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'debug': return '🔍'
    }
  }
}
