/**
 * Resend Email Service
 * Sends email notifications for critical brand protection alerts
 * Uses eventnexus.eu domain for professional branding
 */

import { supabase } from './supabase';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'alerts@eventnexus.eu';
const ADMIN_EMAIL = 'huntersest@gmail.com';

export interface EmailAlert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  url?: string;
  type: string;
  timestamp: Date;
}

/**
 * Send email notification for critical alerts
 */
export async function sendAlertEmail(alert: EmailAlert): Promise<boolean> {
  try {
    // Only send for critical alerts
    if (alert.severity !== 'critical') {
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `🚨 Critical Brand Alert: ${alert.title}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ EventNexus Brand Protection</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Critical Alert Detected</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    
    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 18px;">⚠️ ${alert.title}</h2>
      <p style="color: #7f1d1d; margin: 0;">${alert.description}</p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Type:</td>
          <td style="padding: 8px 0; text-align: right;"><span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px;">${alert.type.toUpperCase()}</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Severity:</td>
          <td style="padding: 8px 0; text-align: right;"><span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 14px;">CRITICAL</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Detected:</td>
          <td style="padding: 8px 0; text-align: right; color: #111827;">${alert.timestamp.toLocaleString()}</td>
        </tr>
        ${alert.url ? `
        <tr>
          <td colspan="2" style="padding: 12px 0;">
            <a href="${alert.url}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px;">View Alert →</a>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">⚡ Recommended Actions</h3>
      <ul style="color: #78350f; margin: 0; padding-left: 20px;">
        <li>Review the alert in the admin dashboard</li>
        <li>Assess potential legal violations</li>
        <li>Document findings and actions taken</li>
        <li>Consider DMCA/ICANN UDRP if applicable</li>
      </ul>
    </div>

    <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 20px;">
      <a href="https://www.eventnexus.eu/#/admin" style="display: inline-block; background: #111827; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 15px;">Go to Admin Dashboard →</a>
      <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0;">
        This is an automated alert from EventNexus Brand Protection Monitor<br>
        <a href="https://www.eventnexus.eu" style="color: #8b5cf6; text-decoration: none;">eventnexus.eu</a> • 
        <a href="mailto:${FROM_EMAIL}" style="color: #8b5cf6; text-decoration: none;">${FROM_EMAIL}</a>
      </p>
    </div>

  </div>

</body>
</html>
        `
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return false;
    }

    const data = await response.json();
    console.log('Alert email sent:', data.id);
    return true;
  } catch (error) {
    console.error('Failed to send alert email:', error);
    return false;
  }
}

/**
 * Send weekly summary email
 */
export async function sendWeeklySummary(stats: {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  newThisWeek: number;
  resolvedThisWeek: number;
}): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: '📊 EventNexus Weekly Brand Protection Summary',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📊 Weekly Summary</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">EventNexus Brand Protection</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
      
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${stats.totalAlerts}</div>
        <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Total Active Alerts</div>
      </div>

      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${stats.criticalAlerts}</div>
        <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Critical</div>
      </div>

      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #10b981;">+${stats.newThisWeek}</div>
        <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">New This Week</div>
      </div>

      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #10b981;">${stats.resolvedThisWeek}</div>
        <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Resolved</div>
      </div>

    </div>

    <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb;">
      <a href="https://www.eventnexus.eu/#/admin" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Full Dashboard →</a>
      <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0;">
        Weekly summary from EventNexus Brand Protection Monitor
      </p>
    </div>

  </div>

</body>
</html>
        `
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send weekly summary:', error);
    return false;
  }
}
