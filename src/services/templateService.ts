/**
 * Template Service
 * Handles ticket templates and event marker templates
 */

import { supabase } from './supabase';
import type {
  TicketTemplate,
  EventMarkerTemplate,
  UserAvailableTemplate,
  EventTemplateSelection,
  UserPurchasedTemplate
} from '../types';

// ============================================================================
// TICKET TEMPLATES
// ============================================================================

/**
 * Get all available ticket templates for a user
 * Takes into account tier access and purchased templates
 */
export async function getUserAvailableTicketTemplates(
  userId: string
): Promise<UserAvailableTemplate[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_available_templates', {
        p_user_id: userId,
        p_template_type: 'ticket'
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user ticket templates:', error);
    return [];
  }
}

/**
 * Get specific ticket template by ID with full details
 */
export async function getTicketTemplate(
  templateId: string
): Promise<TicketTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching ticket template:', error);
    return null;
  }
}

/**
 * Get all ticket templates (admin use)
 */
export async function getAllTicketTemplates(): Promise<TicketTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all ticket templates:', error);
    return [];
  }
}

// ============================================================================
// EVENT MARKER TEMPLATES
// ============================================================================

/**
 * Get all available marker templates for a user
 * Takes into account tier access and purchased templates
 */
export async function getUserAvailableMarkerTemplates(
  userId: string
): Promise<UserAvailableTemplate[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_available_templates', {
        p_user_id: userId,
        p_template_type: 'marker'
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user marker templates:', error);
    return [];
  }
}

/**
 * Get specific marker template by ID with full details
 */
export async function getMarkerTemplate(
  templateId: string
): Promise<EventMarkerTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('event_marker_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching marker template:', error);
    return null;
  }
}

/**
 * Get all marker templates (admin use)
 */
export async function getAllMarkerTemplates(): Promise<EventMarkerTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('event_marker_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all marker templates:', error);
    return [];
  }
}

// ============================================================================
// EVENT TEMPLATE SELECTIONS
// ============================================================================

/**
 * Get template selections for an event
 */
export async function getEventTemplateSelections(
  eventId: string
): Promise<EventTemplateSelection | null> {
  try {
    const { data, error } = await supabase
      .from('event_template_selections')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found"
    return data;
  } catch (error) {
    console.error('Error fetching event template selections:', error);
    return null;
  }
}

/**
 * Save template selections for an event
 */
export async function saveEventTemplateSelections(
  eventId: string,
  selections: {
    standard_ticket_template_id?: string;
    vip_ticket_template_id?: string;
    early_bird_ticket_template_id?: string;
    marker_template_id?: string;
  }
): Promise<EventTemplateSelection | null> {
  try {
    const { data, error } = await supabase
      .from('event_template_selections')
      .upsert({
        event_id: eventId,
        ...selections,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving event template selections:', error);
    return null;
  }
}

// ============================================================================
// TEMPLATE PURCHASES
// ============================================================================

/**
 * Purchase a premium template with credits
 * This should typically be called via an Edge Function for validation
 */
export async function purchaseTemplate(
  userId: string,
  templateType: 'ticket' | 'marker',
  templateId: string,
  creditsSpent: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_purchased_templates')
      .insert({
        user_id: userId,
        template_type: templateType,
        template_id: templateId,
        credits_spent: creditsSpent
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error purchasing template:', error);
    return false;
  }
}

/**
 * Get user's purchased templates
 */
export async function getUserPurchasedTemplates(
  userId: string
): Promise<UserPurchasedTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('user_purchased_templates')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching purchased templates:', error);
    return [];
  }
}

/**
 * Check if user has access to a specific template
 * (via tier or purchase)
 */
export async function checkTemplateAccess(
  userId: string,
  templateType: 'ticket' | 'marker',
  templateId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('user_has_template_access', {
        p_user_id: userId,
        p_template_type: templateType,
        p_template_id: templateId
      });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking template access:', error);
    return false;
  }
}

// ============================================================================
// TEMPLATE RENDERING HELPERS
// ============================================================================

/**
 * Generate CSS styles from ticket template
 */
export function getTicketTemplateStyles(template: TicketTemplate): React.CSSProperties {
  const styles: React.CSSProperties = {
    color: template.text_color,
    fontFamily: template.font_family,
    borderRadius: `${template.corner_radius}px`,
  };

  // Border
  if (template.border_style !== 'none') {
    if (template.border_style === 'gradient') {
      styles.border = '2px solid transparent';
      styles.backgroundImage = `linear-gradient(white, white), linear-gradient(135deg, ${template.border_color || '#FFD700'}, ${template.accent_color})`;
      styles.backgroundOrigin = 'border-box';
      styles.backgroundClip = 'padding-box, border-box';
    } else if (template.border_style === 'animated') {
      styles.border = `2px solid ${template.border_color || template.accent_color}`;
      styles.animation = 'borderPulse 2s ease-in-out infinite';
    } else {
      styles.border = `2px solid ${template.border_color || template.accent_color}`;
    }
  }

  // Background
  if (template.background_style === 'gradient' && template.background_colors) {
    styles.background = `linear-gradient(135deg, ${template.background_colors.join(', ')})`;
  } else if (template.background_style === 'pattern') {
    // Pattern backgrounds would be handled via CSS classes
    styles.backgroundColor = '#ffffff';
  } else if (template.background_style === 'image' && template.background_image_url) {
    styles.backgroundImage = `url(${template.background_image_url})`;
    styles.backgroundSize = 'cover';
    styles.backgroundPosition = 'center';
  } else {
    styles.backgroundColor = template.background_colors?.[0] || '#ffffff';
  }

  // Shadow
  if (template.shadow_effect === 'light') {
    styles.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
  } else if (template.shadow_effect === 'medium') {
    styles.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  } else if (template.shadow_effect === 'heavy') {
    styles.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.2)';
  } else if (template.shadow_effect === 'glow') {
    styles.boxShadow = `0 0 20px ${template.accent_color}40`;
  }

  // Overlay effects (handled via pseudo-elements in component)
  
  return styles;
}

/**
 * Get CSS class for ticket template pattern
 */
export function getTicketPatternClass(template: TicketTemplate): string {
  if (template.background_style !== 'pattern' || !template.background_pattern) {
    return '';
  }

  return `ticket-pattern-${template.background_pattern}`;
}

/**
 * Get marker icon component props
 */
export function getMarkerIconProps(template: EventMarkerTemplate) {
  return {
    color: template.marker_color,
    size: template.marker_size === 'small' ? 20 : 
          template.marker_size === 'medium' ? 24 :
          template.marker_size === 'large' ? 32 : 40,
    strokeWidth: template.border_width,
  };
}

/**
 * Get marker container styles
 */
export function getMarkerContainerStyles(template: EventMarkerTemplate): React.CSSProperties {
  const styles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (template.pulse_effect) {
    styles.animation = 'markerPulse 2s ease-in-out infinite';
  }

  if (template.glow_effect) {
    styles.filter = `drop-shadow(0 0 8px ${template.marker_color})`;
  }

  if (template.shadow_style === 'light') {
    styles.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))';
  } else if (template.shadow_style === 'medium') {
    styles.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))';
  } else if (template.shadow_style === 'heavy') {
    styles.filter = 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4))';
  }

  return styles;
}
