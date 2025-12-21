/**
 * Ticket Service - Complete ticket creation, QR generation, and verification
 * 
 * Handles:
 * - Secure QR code generation with cryptographic hashing
 * - Ticket creation after successful payment
 * - Ticket validation and scanning
 * - Platform fee calculations
 */

import { supabase } from './supabase';
import QRCode from 'qrcode';

// Access environment variable with proper typing
declare const process: {
  env: {
    VITE_TICKET_HASH_SECRET?: string;
  };
};

const TICKET_HASH_SECRET = process.env.VITE_TICKET_HASH_SECRET || 'eventnexus-production-secret-2025';

/**
 * Generate secure hash for ticket verification
 * Format: SHA-256 hash of ticketId + eventId + userId + secret
 */
export const generateTicketHash = async (
  ticketId: string,
  eventId: string,
  userId: string
): Promise<string> => {
  const data = `${ticketId}-${eventId}-${userId}-${TICKET_HASH_SECRET}`;
  
  // Use Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return first 12 characters for compact QR code
  return hashHex.substring(0, 12);
};

/**
 * Generate QR code data string
 * Format: ENX-{ticketId}-{hash}
 */
export const generateTicketQRData = async (
  ticketId: string,
  eventId: string,
  userId: string
): Promise<string> => {
  const hash = await generateTicketHash(ticketId, eventId, userId);
  return `ENX-${ticketId}-${hash}`;
};

/**
 * Generate QR code as base64 data URL (image)
 * Returns: data:image/png;base64,...
 */
export const generateTicketQRImage = async (
  ticketId: string,
  eventId: string,
  userId: string
): Promise<string> => {
  const qrData = await generateTicketQRData(ticketId, eventId, userId);
  
  // Generate QR code as base64 PNG
  const qrImage = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
  
  return qrImage;
};

/**
 * Verify QR code hash matches expected value
 */
export const verifyTicketHash = async (
  ticketId: string,
  eventId: string,
  userId: string,
  providedHash: string
): Promise<boolean> => {
  const expectedHash = await generateTicketHash(ticketId, eventId, userId);
  return expectedHash === providedHash;
};

/**
 * Parse QR code data and extract components
 * Returns: { ticketId, hash } or null if invalid format
 */
export const parseQRCodeData = (qrData: string): { ticketId: string; hash: string } | null => {
  // Expected format: ENX-{ticketId}-{hash}
  const parts = qrData.split('-');
  
  if (parts.length !== 3 || parts[0] !== 'ENX') {
    return null;
  }
  
  return {
    ticketId: parts[1],
    hash: parts[2],
  };
};

/**
 * Create ticket after successful payment
 * Called by webhook after Stripe payment confirmation
 */
export const createTicketWithQR = async (
  eventId: string,
  userId: string,
  ticketType: string = 'standard',
  price: number,
  stripePaymentId?: string
): Promise<{ id: string; qrCode: string; qrImage: string } | null> => {
  try {
    // Create ticket in database
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        event_id: eventId,
        user_id: userId,
        ticket_type: ticketType,
        price: price,
        status: 'valid',
        qr_code: 'pending', // Temporary, will update immediately
        purchase_date: new Date().toISOString(),
        metadata: {
          stripe_payment_id: stripePaymentId,
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error || !ticket) {
      console.error('Error creating ticket:', error);
      return null;
    }

    // Generate secure QR code
    const qrData = await generateTicketQRData(ticket.id, eventId, userId);
    const qrImage = await generateTicketQRImage(ticket.id, eventId, userId);

    // Update ticket with QR code
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ qr_code: qrData })
      .eq('id', ticket.id);

    if (updateError) {
      console.error('Error updating ticket QR code:', updateError);
      // Still return the ticket data even if update fails
    }

    return {
      id: ticket.id,
      qrCode: qrData,
      qrImage: qrImage,
    };
  } catch (error) {
    console.error('Error in createTicketWithQR:', error);
    return null;
  }
};

/**
 * Validate and scan a ticket
 * Returns: validation result with ticket details
 */
export const validateAndScanTicket = async (
  qrCodeData: string,
  scannerId: string
): Promise<{
  valid: boolean;
  message: string;
  ticket?: any;
  error?: string;
}> => {
  try {
    // Parse QR code
    const parsed = parseQRCodeData(qrCodeData);
    if (!parsed) {
      return {
        valid: false,
        message: 'Invalid QR code format',
        error: 'INVALID_FORMAT',
      };
    }

    // Fetch ticket from database
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events!tickets_event_id_fkey(
          id,
          name,
          date,
          time,
          organizer_id
        ),
        user:users!tickets_user_id_fkey(
          id,
          name,
          email,
          avatar
        )
      `)
      .eq('id', parsed.ticketId)
      .single();

    if (error || !ticket) {
      return {
        valid: false,
        message: 'Ticket not found',
        error: 'TICKET_NOT_FOUND',
      };
    }

    // Verify scanner is authorized (event organizer or admin)
    if (ticket.event.organizer_id !== scannerId) {
      // Check if scanner is admin
      const { data: scannerUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', scannerId)
        .single();

      if (!scannerUser || scannerUser.role !== 'admin') {
        return {
          valid: false,
          message: 'Unauthorized - You cannot scan tickets for this event',
          error: 'UNAUTHORIZED',
        };
      }
    }

    // Verify QR code hash
    const isValidHash = await verifyTicketHash(
      ticket.id,
      ticket.event.id,
      ticket.user.id,
      parsed.hash
    );

    if (!isValidHash) {
      return {
        valid: false,
        message: 'Invalid QR code - Possible counterfeit',
        error: 'INVALID_HASH',
      };
    }

    // Check ticket status
    if (ticket.status === 'cancelled') {
      return {
        valid: false,
        message: 'Ticket has been cancelled',
        ticket: ticket,
        error: 'CANCELLED',
      };
    }

    if (ticket.status === 'used') {
      return {
        valid: false,
        message: `Ticket already used at ${new Date(ticket.used_at).toLocaleString()}`,
        ticket: ticket,
        error: 'ALREADY_USED',
      };
    }

    // Check if event has expired (1 day after event date)
    const eventDateTime = new Date(`${ticket.event.date} ${ticket.event.time}`);
    const expiryTime = new Date(eventDateTime.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      return {
        valid: false,
        message: 'Ticket expired - Event has ended',
        ticket: ticket,
        error: 'EXPIRED',
      };
    }

    // Mark ticket as used
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        metadata: {
          ...ticket.metadata,
          scanned_by: scannerId,
          scanned_at: new Date().toISOString(),
        },
      })
      .eq('id', ticket.id);

    if (updateError) {
      console.error('Error updating ticket status:', updateError);
      return {
        valid: false,
        message: 'Database error - Please try again',
        error: 'DATABASE_ERROR',
      };
    }

    // Create notification for ticket holder
    await supabase.from('notifications').insert({
      user_id: ticket.user.id,
      title: 'Ticket Scanned',
      message: `Your ticket for "${ticket.event.name}" was scanned successfully. Enjoy the event!`,
      type: 'update',
      event_id: ticket.event.id,
      sender_name: 'EventNexus',
      isRead: false,
    });

    return {
      valid: true,
      message: '✓ Valid ticket - Entry granted',
      ticket: {
        ...ticket,
        status: 'used',
        used_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error validating ticket:', error);
    return {
      valid: false,
      message: 'System error during validation',
      error: 'SYSTEM_ERROR',
    };
  }
};

/**
 * Get user's tickets with QR images
 */
export const getUserTicketsWithQR = async (userId: string): Promise<any[]> => {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events!tickets_event_id_fkey(
          id,
          name,
          date,
          time,
          location,
          imageUrl:image_url
        )
      `)
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false });

    if (error || !tickets) {
      console.error('Error fetching tickets:', error);
      return [];
    }

    // Generate QR images for each ticket
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const qrImage = await generateTicketQRImage(
            ticket.id,
            ticket.event.id,
            userId
          );
          return {
            ...ticket,
            qrImage,
          };
        } catch (error) {
          console.error('Error generating QR for ticket:', ticket.id, error);
          return {
            ...ticket,
            qrImage: null,
          };
        }
      })
    );

    return ticketsWithQR;
  } catch (error) {
    console.error('Error in getUserTicketsWithQR:', error);
    return [];
  }
};

/**
 * Calculate platform fees based on subscription tier
 */
export const calculatePlatformFee = (
  totalAmount: number,
  organizerTier: string
): { totalAmount: number; platformFee: number; organizerNet: number } => {
  const COMMISSION_RATES: Record<string, number> = {
    free: 0.05,        // 5%
    pro: 0.03,         // 3%
    premium: 0.025,    // 2.5%
    enterprise: 0.015, // 1.5%
  };

  const rate = COMMISSION_RATES[organizerTier] || COMMISSION_RATES.free;
  const platformFee = totalAmount * rate;
  const organizerNet = totalAmount - platformFee;

  return {
    totalAmount,
    platformFee,
    organizerNet,
  };
};

/**
 * Get ticket statistics for an event (organizer view)
 */
export const getEventTicketStats = async (
  eventId: string,
  organizerId: string
): Promise<{
  totalSold: number;
  totalRevenue: number;
  platformFees: number;
  netRevenue: number;
  validTickets: number;
  usedTickets: number;
  cancelledTickets: number;
} | null> => {
  try {
    // Verify organizer owns the event
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id, name')
      .eq('id', eventId)
      .single();

    if (!event || event.organizer_id !== organizerId) {
      return null;
    }

    // Get all tickets for event
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('price, status')
      .eq('event_id', eventId);

    if (error || !tickets) {
      return null;
    }

    const totalSold = tickets.length;
    const totalRevenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);
    
    // Get organizer's tier for fee calculation
    const { data: organizer } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', organizerId)
      .single();

    const feeCalc = calculatePlatformFee(
      totalRevenue,
      organizer?.subscription_tier || 'free'
    );

    return {
      totalSold,
      totalRevenue: feeCalc.totalAmount,
      platformFees: feeCalc.platformFee,
      netRevenue: feeCalc.organizerNet,
      validTickets: tickets.filter(t => t.status === 'valid').length,
      usedTickets: tickets.filter(t => t.status === 'used').length,
      cancelledTickets: tickets.filter(t => t.status === 'cancelled').length,
    };
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    return null;
  }
};
