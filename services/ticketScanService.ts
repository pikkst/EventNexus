/**
 * Ticket Scanning & Verification Service
 * 
 * Allows event organizers to verify ticket authenticity using QR codes
 * Free tier: 50 credits for 30 days access
 * Premium+ tiers: Included by default
 */

import { supabase } from './supabase';
import { hasFeatureAccess } from './featureUnlockService';

export interface TicketScanResult {
  valid: boolean;
  ticket?: {
    id: string;
    eventId: string;
    eventName: string;
    userId: string;
    userName: string;
    userEmail: string;
    purchasedAt: string;
    ticketType: string;
    price: number;
    qrCode: string;
    status: 'valid' | 'used' | 'cancelled' | 'expired';
    scannedAt?: string;
    scannedBy?: string;
  };
  message: string;
  error?: string;
}

/**
 * Scan and verify a ticket QR code
 */
export const scanTicket = async (
  qrCodeData: string,
  scannerId: string,
  scannerTier: string
): Promise<TicketScanResult> => {
  try {
    // Check if scanner has access to ticket scanning feature
    const hasAccess = await hasFeatureAccess(
      scannerId,
      scannerTier,
      'TICKET_SCANNING_30_DAYS'
    );

    if (!hasAccess) {
      return {
        valid: false,
        message: 'Ticket scanning feature not available. Unlock for 50 credits (€25) for 30 days.',
        error: 'FEATURE_NOT_UNLOCKED'
      };
    }

    // Parse QR code data (format: "ENX-{ticketId}-{hash}")
    const qrParts = qrCodeData.split('-');
    if (qrParts.length !== 3 || qrParts[0] !== 'ENX') {
      return {
        valid: false,
        message: 'Invalid QR code format',
        error: 'INVALID_QR_FORMAT'
      };
    }

    const ticketId = qrParts[1];
    const hash = qrParts[2];

    // Fetch ticket from database
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events(id, name, date, organizer_id),
        user:users(id, name, email, avatar)
      `)
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return {
        valid: false,
        message: 'Ticket not found in system',
        error: 'TICKET_NOT_FOUND'
      };
    }

    // Verify scanner is the event organizer
    if (ticket.event.organizer_id !== scannerId) {
      return {
        valid: false,
        message: 'You are not authorized to scan tickets for this event',
        error: 'UNAUTHORIZED'
      };
    }

    // Verify QR code hash
    const expectedHash = await generateTicketHash(ticketId, ticket.event.id, ticket.user_id);
    if (hash !== expectedHash) {
      return {
        valid: false,
        message: 'QR code verification failed - possible counterfeit ticket',
        error: 'HASH_MISMATCH'
      };
    }

    // Check ticket status
    if (ticket.status === 'cancelled') {
      return {
        valid: false,
        ticket: {
          id: ticket.id,
          eventId: ticket.event.id,
          eventName: ticket.event.name,
          userId: ticket.user.id,
          userName: ticket.user.name,
          userEmail: ticket.user.email,
          purchasedAt: ticket.purchased_at,
          ticketType: ticket.ticket_type || 'general',
          price: ticket.price,
          qrCode: ticket.qr_code,
          status: ticket.status,
          scannedAt: ticket.scanned_at,
          scannedBy: ticket.scanned_by
        },
        message: 'Ticket has been cancelled',
        error: 'TICKET_CANCELLED'
      };
    }

    if (ticket.status === 'used') {
      return {
        valid: false,
        ticket: {
          id: ticket.id,
          eventId: ticket.event.id,
          eventName: ticket.event.name,
          userId: ticket.user.id,
          userName: ticket.user.name,
          userEmail: ticket.user.email,
          purchasedAt: ticket.purchased_at,
          ticketType: ticket.ticket_type || 'general',
          price: ticket.price,
          qrCode: ticket.qr_code,
          status: ticket.status,
          scannedAt: ticket.scanned_at,
          scannedBy: ticket.scanned_by
        },
        message: `Ticket already used - Scanned at ${new Date(ticket.scanned_at).toLocaleString()}`,
        error: 'TICKET_ALREADY_USED'
      };
    }

    // Check if event has passed
    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    const oneDayAfterEvent = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (now > oneDayAfterEvent) {
      return {
        valid: false,
        ticket: {
          id: ticket.id,
          eventId: ticket.event.id,
          eventName: ticket.event.name,
          userId: ticket.user.id,
          userName: ticket.user.name,
          userEmail: ticket.user.email,
          purchasedAt: ticket.purchased_at,
          ticketType: ticket.ticket_type || 'general',
          price: ticket.price,
          qrCode: ticket.qr_code,
          status: 'expired',
          scannedAt: ticket.scanned_at,
          scannedBy: ticket.scanned_by
        },
        message: 'Ticket expired - Event has passed',
        error: 'TICKET_EXPIRED'
      };
    }

    // Mark ticket as used
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        scanned_at: new Date().toISOString(),
        scanned_by: scannerId
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating ticket status:', updateError);
    }

    // Record scan in scan history
    await supabase
      .from('ticket_scans')
      .insert({
        ticket_id: ticketId,
        event_id: ticket.event.id,
        scanned_by: scannerId,
        scanned_at: new Date().toISOString(),
        scan_result: 'valid'
      });

    return {
      valid: true,
      ticket: {
        id: ticket.id,
        eventId: ticket.event.id,
        eventName: ticket.event.name,
        userId: ticket.user.id,
        userName: ticket.user.name,
        userEmail: ticket.user.email,
        purchasedAt: ticket.purchased_at,
        ticketType: ticket.ticket_type || 'general',
        price: ticket.price,
        qrCode: ticket.qr_code,
        status: 'used',
        scannedAt: new Date().toISOString(),
        scannedBy: scannerId
      },
      message: 'Valid ticket - Entry granted! ✅'
    };
  } catch (error) {
    console.error('Ticket scan error:', error);
    return {
      valid: false,
      message: 'System error during ticket verification',
      error: 'SYSTEM_ERROR'
    };
  }
};

/**
 * Generate secure hash for ticket QR code
 */
export const generateTicketHash = async (
  ticketId: string,
  eventId: string,
  userId: string
): Promise<string> => {
  const data = `${ticketId}-${eventId}-${userId}-${process.env.TICKET_HASH_SECRET || 'eventnexus-secret'}`;
  
  // Use Web Crypto API for hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return first 12 characters for QR code
  return hashHex.substring(0, 12);
};

/**
 * Generate QR code data for a ticket
 */
export const generateTicketQRCode = async (
  ticketId: string,
  eventId: string,
  userId: string
): Promise<string> => {
  const hash = await generateTicketHash(ticketId, eventId, userId);
  return `ENX-${ticketId}-${hash}`;
};

/**
 * Get ticket scan history for an event
 */
export const getEventScanHistory = async (
  eventId: string,
  organizerId: string
): Promise<any[]> => {
  try {
    // Verify organizer owns the event
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (!event || event.organizer_id !== organizerId) {
      throw new Error('Unauthorized');
    }

    const { data, error } = await supabase
      .from('ticket_scans')
      .select(`
        *,
        ticket:tickets(id, qr_code, price, ticket_type),
        user:tickets(user:users(name, email, avatar))
      `)
      .eq('event_id', eventId)
      .order('scanned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return [];
  }
};

/**
 * Get ticket scan statistics for an event
 */
export const getEventScanStats = async (
  eventId: string,
  organizerId: string
): Promise<{
  totalTickets: number;
  scannedTickets: number;
  pendingTickets: number;
  scanRate: number;
  lastScanTime?: string;
}> => {
  try {
    // Verify organizer owns the event
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (!event || event.organizer_id !== organizerId) {
      throw new Error('Unauthorized');
    }

    // Get total tickets
    const { count: totalTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .neq('status', 'cancelled');

    // Get scanned tickets
    const { count: scannedTickets, data: scans } = await supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('status', 'used');

    const total = totalTickets || 0;
    const scanned = scannedTickets || 0;
    const pending = total - scanned;
    const scanRate = total > 0 ? (scanned / total) * 100 : 0;

    // Get last scan time
    const lastScanTime = scans && scans.length > 0 
      ? scans[0].scanned_at 
      : undefined;

    return {
      totalTickets: total,
      scannedTickets: scanned,
      pendingTickets: pending,
      scanRate: Math.round(scanRate),
      lastScanTime
    };
  } catch (error) {
    console.error('Error fetching scan stats:', error);
    return {
      totalTickets: 0,
      scannedTickets: 0,
      pendingTickets: 0,
      scanRate: 0
    };
  }
};

/**
 * Manually validate a ticket (without scanning)
 */
export const manuallyValidateTicket = async (
  ticketId: string,
  organizerId: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Fetch ticket and verify organizer
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, event:events(organizer_id)')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return { success: false, message: 'Ticket not found' };
    }

    if (ticket.event.organizer_id !== organizerId) {
      return { success: false, message: 'Unauthorized' };
    }

    if (ticket.status === 'used') {
      return { success: false, message: 'Ticket already used' };
    }

    // Mark as used
    await supabase
      .from('tickets')
      .update({
        status: 'used',
        scanned_at: new Date().toISOString(),
        scanned_by: organizerId
      })
      .eq('id', ticketId);

    // Record manual validation
    await supabase
      .from('ticket_scans')
      .insert({
        ticket_id: ticketId,
        event_id: ticket.event_id,
        scanned_by: organizerId,
        scanned_at: new Date().toISOString(),
        scan_result: 'manual_validation',
        notes: reason
      });

    return { success: true, message: 'Ticket manually validated' };
  } catch (error) {
    console.error('Error validating ticket:', error);
    return { success: false, message: 'Validation failed' };
  }
};
