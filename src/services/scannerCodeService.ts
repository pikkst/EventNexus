import { supabase } from './supabase';
import { parseQRCodeData } from './ticketService';

export interface ScannerCode {
  id: string;
  event_id: string;
  organizer_id: string;
  code: string;
  name: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
  scan_count: number;
  device_info?: any;
}

export interface ScannerSession {
  id: string;
  scanner_code_id: string;
  event_id: string;
  device_token: string;
  device_info?: any;
  started_at: string;
  last_heartbeat: string;
  ended_at?: string;
  is_active: boolean;
}

export interface VerifyScannerCodeResponse {
  valid: boolean;
  event_id?: string;
  event_name?: string;
  scanner_code_id?: string;
  organizer_id?: string;
  expires_at?: string;
}

export interface ScannerValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
  scanner_code_id?: string;
  event_id?: string;
  ticket?: {
    id: string;
    event_name?: string;
    user_name?: string;
    user_email?: string;
    ticket_type?: string;
    status?: string;
    scanned_at?: string;
  };
}

/**
 * Create a new scanner code for an event
 */
export const createScannerCode = async (
  eventId: string,
  organizerId: string,
  name: string,
  expiresAt?: string
): Promise<ScannerCode | null> => {
  try {
    const { data, error } = await supabase.rpc('create_scanner_code', {
      p_event_id: eventId,
      p_organizer_id: organizerId,
      p_name: name,
      p_expires_at: expiresAt || null
    });

    if (error) {
      console.error('Error creating scanner code:', error);
      return null;
    }

    // The RPC returns an array with one row
    return data && data.length > 0 ? {
      id: data[0].id,
      event_id: data[0].event_id,
      organizer_id: organizerId,
      code: data[0].code,
      name: data[0].name,
      is_active: true,
      created_at: new Date().toISOString(),
      scan_count: 0
    } : null;
  } catch (error) {
    console.error('Error in createScannerCode:', error);
    return null;
  }
};

/**
 * Get all scanner codes for an event
 */
export const getEventScannerCodes = async (eventId: string): Promise<ScannerCode[]> => {
  try {
    const { data, error } = await supabase
      .from('scanner_codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scanner codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getEventScannerCodes:', error);
    return [];
  }
};

/**
 * Get all scanner codes for an organizer
 */
export const getOrganizerScannerCodes = async (organizerId: string): Promise<ScannerCode[]> => {
  try {
    const { data, error } = await supabase
      .from('scanner_codes')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizer scanner codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOrganizerScannerCodes:', error);
    return [];
  }
};

/**
 * Verify a scanner code (used by mobile apps)
 * Falls back to direct table query if RPC fails
 */
export const verifyScannerCode = async (code: string): Promise<VerifyScannerCodeResponse> => {
  try {
    const normalizedCode = code.toUpperCase(); // Normalize input
    
    console.log('Verifying scanner code:', { original: code, normalized: normalizedCode });
    
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('verify_scanner_code', {
      p_code: normalizedCode
    });

    console.log('RPC response:', { rpcData, rpcError });

    // If RPC works, use it
    if (!rpcError) {
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (result) {
        return {
          valid: result.valid,
          event_id: result.event_id,
          event_name: result.event_name,
          scanner_code_id: result.scanner_code_id,
          organizer_id: result.organizer_id,
          expires_at: result.expires_at
        };
      }
    }

    // Fallback: Direct table query
    console.log('RPC failed, trying direct query...', rpcError?.message);
    
    const { data: scannerRow, error: dbError } = await supabase
      .from('scanner_codes')
      .select('id, event_id, is_active, expires_at, organizer_id')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    console.log('Direct query result:', { scannerRow, dbError });

    if (dbError || !scannerRow) {
      console.error('Scanner code not found or inactive:', dbError?.message || 'not found');
      return { valid: false };
    }

    // Check expiration
    if (scannerRow.expires_at) {
      const expiresAt = new Date(scannerRow.expires_at);
      if (new Date() > expiresAt) {
        console.log('Scanner code expired');
        return { valid: false };
      }
    }

    // Get event details
    const { data: eventData } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', scannerRow.event_id)
      .maybeSingle();

    return {
      valid: true,
      event_id: scannerRow.event_id,
      event_name: eventData?.name,
      scanner_code_id: scannerRow.id,
      organizer_id: scannerRow.organizer_id,
      expires_at: scannerRow.expires_at
    };
  } catch (error) {
    console.error('Error in verifyScannerCode:', error);
    return { valid: false };
  }
};

/**
 * Validate a ticket using a scanner code (no user auth required)
 */
export const validateTicketWithScannerCode = async (
  qrCodeData: string,
  scannerCode: string,
  deviceInfo?: Record<string, unknown>
): Promise<ScannerValidationResult> => {
  try {
    // Ensure QR is in expected format before calling edge function
    const parsed = parseQRCodeData(qrCodeData);
    if (!parsed?.ticketId) {
      return { valid: false, error: 'INVALID_QR_FORMAT', message: 'Invalid QR code' };
    }

    // Normalize scanner code to uppercase
    const normalizedCode = scannerCode.toUpperCase();

    const { data, error } = await supabase.functions.invoke('scanner-validate-ticket', {
      body: { qrCode: qrCodeData, scannerCode: normalizedCode, deviceInfo }
    });

    if (error) {
      console.error('scanner-validate-ticket error:', error);
      return { valid: false, error: error.message || 'VALIDATION_FAILED', message: 'Validation failed' };
    }

    return data as ScannerValidationResult;
  } catch (error: any) {
    console.error('Error in validateTicketWithScannerCode:', error);
    return { valid: false, error: error.message || 'VALIDATION_FAILED', message: 'Validation failed' };
  }
};

/**
 * Toggle scanner code active status
 */
export const toggleScannerCodeStatus = async (
  scannerCodeId: string,
  isActive: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scanner_codes')
      .update({ is_active: isActive })
      .eq('id', scannerCodeId);

    if (error) {
      console.error('Error toggling scanner code:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in toggleScannerCodeStatus:', error);
    return false;
  }
};

/**
 * Delete a scanner code
 */
export const deleteScannerCode = async (scannerCodeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scanner_codes')
      .delete()
      .eq('id', scannerCodeId);

    if (error) {
      console.error('Error deleting scanner code:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteScannerCode:', error);
    return false;
  }
};

/**
 * Record scanner code usage (called after each scan)
 */
export const recordScannerUsage = async (
  scannerCodeId: string,
  location?: { lat: number; lng: number }
): Promise<void> => {
  try {
    const geoLocation = location 
      ? `SRID=4326;POINT(${location.lng} ${location.lat})`
      : null;

    await supabase.rpc('record_scanner_usage', {
      p_scanner_code_id: scannerCodeId,
      p_location: geoLocation
    });
  } catch (error) {
    console.error('Error recording scanner usage:', error);
  }
};

/**
 * Create a scanner session (when mobile app logs in)
 */
export const createScannerSession = async (
  scannerCodeId: string,
  eventId: string,
  deviceToken: string,
  deviceInfo: any
): Promise<ScannerSession | null> => {
  try {
    const { data, error } = await supabase
      .from('scanner_sessions')
      .insert({
        scanner_code_id: scannerCodeId,
        event_id: eventId,
        device_token: deviceToken,
        device_info: deviceInfo,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scanner session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createScannerSession:', error);
    return null;
  }
};

/**
 * Update scanner session heartbeat
 */
export const updateScannerHeartbeat = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scanner_sessions')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating heartbeat:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateScannerHeartbeat:', error);
    return false;
  }
};

/**
 * End scanner session
 */
export const endScannerSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scanner_sessions')
      .update({ 
        ended_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending scanner session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in endScannerSession:', error);
    return false;
  }
};

/**
 * Get active scanner sessions for an event
 */
export const getActiveScannerSessions = async (eventId: string): Promise<ScannerSession[]> => {
  try {
    const { data, error } = await supabase
      .from('scanner_sessions')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveScannerSessions:', error);
    return [];
  }
};
