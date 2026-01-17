import { supabase } from './supabase';

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
 */
export const verifyScannerCode = async (code: string): Promise<VerifyScannerCodeResponse> => {
  try {
    const { data, error } = await supabase.rpc('verify_scanner_code', {
      p_code: code
    });

    if (error) {
      console.error('Error verifying scanner code:', error);
      return { valid: false };
    }

    // RPC returns an array with one result
    if (data && data.length > 0) {
      return {
        valid: data[0].valid,
        event_id: data[0].event_id,
        event_name: data[0].event_name,
        scanner_code_id: data[0].scanner_code_id,
        organizer_id: data[0].organizer_id,
        expires_at: data[0].expires_at
      };
    }

    return { valid: false };
  } catch (error) {
    console.error('Error in verifyScannerCode:', error);
    return { valid: false };
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
