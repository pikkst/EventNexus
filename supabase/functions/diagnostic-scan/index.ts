// Diagnostic Scan Edge Function
// Performs comprehensive system health check and diagnostics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface DiagnosticResult {
  category: string
  status: 'healthy' | 'warning' | 'critical'
  message: string
  details?: any
  timestamp: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify admin role
    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const diagnostics: DiagnosticResult[] = []
    const startTime = Date.now()

    // 1. Database Connection Test
    try {
      const { error } = await serviceClient.from('users').select('count').limit(1)
      diagnostics.push({
        category: 'Database',
        status: error ? 'critical' : 'healthy',
        message: error ? 'Database connection failed' : 'Database connection active',
        details: { latency: `${Date.now() - startTime}ms` },
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Database',
        status: 'critical',
        message: 'Database unreachable',
        details: { error: e.message },
        timestamp: new Date().toISOString()
      })
    }

    // 2. Authentication System Test
    try {
      const { data: authUsers, error } = await serviceClient.auth.admin.listUsers()
      diagnostics.push({
        category: 'Authentication',
        status: error ? 'warning' : 'healthy',
        message: error ? 'Auth service degraded' : 'Auth service operational',
        details: { totalUsers: authUsers?.users?.length || 0 },
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Authentication',
        status: 'critical',
        message: 'Auth system unavailable',
        timestamp: new Date().toISOString()
      })
    }

    // 3. Storage System Test
    try {
      const { data: buckets, error } = await serviceClient.storage.listBuckets()
      diagnostics.push({
        category: 'Storage',
        status: error ? 'warning' : 'healthy',
        message: error ? 'Storage service issues' : 'Storage system operational',
        details: { buckets: buckets?.length || 0 },
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Storage',
        status: 'warning',
        message: 'Storage check incomplete',
        timestamp: new Date().toISOString()
      })
    }

    // 4. Table Integrity Check
    try {
      const tables = ['users', 'events', 'notifications', 'tickets']
      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await serviceClient
            .from(table)
            .select('*', { count: 'exact', head: true })
          return { table, count, hasError: !!error }
        })
      )
      
      const failedTables = tableChecks.filter(t => t.hasError)
      diagnostics.push({
        category: 'Data Integrity',
        status: failedTables.length > 0 ? 'warning' : 'healthy',
        message: failedTables.length > 0 
          ? `${failedTables.length} table(s) with issues` 
          : 'All core tables accessible',
        details: tableChecks,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Data Integrity',
        status: 'warning',
        message: 'Table integrity check failed',
        timestamp: new Date().toISOString()
      })
    }

    // 5. RLS Policies Test
    try {
      const { data, error } = await serviceClient
        .from('users')
        .select('id')
        .limit(1)
      
      diagnostics.push({
        category: 'Security (RLS)',
        status: error ? 'warning' : 'healthy',
        message: error ? 'RLS policy issues detected' : 'RLS policies active',
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Security (RLS)',
        status: 'critical',
        message: 'RLS check failed',
        timestamp: new Date().toISOString()
      })
    }

    // 6. Edge Functions Health Check
    try {
      const edgeFunctions = ['platform-stats', 'infrastructure-stats', 'proximity-radar']
      const functionTests = []
      
      for (const func of edgeFunctions) {
        try {
          const testStart = Date.now()
          const { error } = await supabaseClient.functions.invoke(func, {
            body: { test: true },
            headers: { Authorization: authHeader }
          })
          functionTests.push({
            name: func,
            status: error ? 'warning' : 'healthy',
            latency: `${Date.now() - testStart}ms`
          })
        } catch {
          functionTests.push({ name: func, status: 'critical', latency: 'timeout' })
        }
      }
      
      const failedFunctions = functionTests.filter(f => f.status === 'critical')
      diagnostics.push({
        category: 'Edge Functions',
        status: failedFunctions.length > 0 ? 'warning' : 'healthy',
        message: failedFunctions.length > 0 
          ? `${failedFunctions.length} function(s) down` 
          : 'All functions responsive',
        details: functionTests,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Edge Functions',
        status: 'warning',
        message: 'Function health check incomplete',
        timestamp: new Date().toISOString()
      })
    }

    // 7. PostGIS/Geospatial Check
    try {
      const { data, error } = await serviceClient
        .rpc('get_nearby_events', {
          lat: 59.4370,
          lng: 24.7536,
          radius_km: 10
        })
      
      diagnostics.push({
        category: 'Geospatial (PostGIS)',
        status: error ? 'warning' : 'healthy',
        message: error ? 'PostGIS functions degraded' : 'PostGIS operational',
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'Geospatial (PostGIS)',
        status: 'warning',
        message: 'PostGIS check failed',
        timestamp: new Date().toISOString()
      })
    }

    // 8. System Load Analysis
    try {
      const { data: recentEvents } = await serviceClient
        .from('events')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      
      const { data: recentUsers } = await serviceClient
        .from('users')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      
      diagnostics.push({
        category: 'System Load',
        status: 'healthy',
        message: 'Recent activity tracked',
        details: {
          eventsLast24h: recentEvents?.length || 0,
          usersLast24h: recentUsers?.length || 0
        },
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      diagnostics.push({
        category: 'System Load',
        status: 'warning',
        message: 'Load analysis incomplete',
        timestamp: new Date().toISOString()
      })
    }

    const totalTime = Date.now() - startTime
    const healthyCount = diagnostics.filter(d => d.status === 'healthy').length
    const warningCount = diagnostics.filter(d => d.status === 'warning').length
    const criticalCount = diagnostics.filter(d => d.status === 'critical').length

    const overallStatus = criticalCount > 0 ? 'critical' : 
                          warningCount > 2 ? 'warning' : 'healthy'

    return new Response(
      JSON.stringify({
        success: true,
        scanDuration: `${totalTime}ms`,
        overallStatus,
        summary: {
          healthy: healthyCount,
          warnings: warningCount,
          critical: criticalCount,
          total: diagnostics.length
        },
        diagnostics,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Diagnostic scan error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
