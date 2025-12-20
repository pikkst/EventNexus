// Resend Email Service for Brand Monitoring Alerts
// Sends critical alert notifications to admin

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'alerts@mail.eventnexus.eu';
const TO_EMAIL = 'admin@mail.eventnexus.eu'; // Configure with actual admin email

interface Alert {
  id?: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  url?: string;
  timestamp: string;
  status: string;
  detected_by?: string;
}

export async function sendAlertEmail(alert: Alert): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return;
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-critical { background: #fecaca; color: #991b1b; }
    .badge-warning { background: #fed7aa; color: #9a3412; }
    .alert-detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .alert-detail strong { color: #667eea; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🚨 Brand Protection Alert</h1>
    </div>
    <div class="content">
      <div style="margin-bottom: 20px;">
        <span class="badge badge-${alert.severity}">${alert.severity}</span>
      </div>
      
      <h2 style="color: #1f2937; margin: 10px 0;">${alert.title}</h2>
      
      <div class="alert-detail">
        <strong>Type:</strong> ${alert.type}
      </div>
      
      <div class="alert-detail">
        <strong>Description:</strong><br/>
        ${alert.description}
      </div>
      
      ${alert.url ? `
      <div class="alert-detail">
        <strong>URL:</strong><br/>
        <a href="${alert.url}" style="color: #667eea; word-break: break-all;">${alert.url}</a>
      </div>
      ` : ''}
      
      <div class="alert-detail">
        <strong>Detected:</strong> ${new Date(alert.timestamp).toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}
      </div>
      
      ${alert.detected_by ? `
      <div class="alert-detail">
        <strong>Detection Method:</strong> ${alert.detected_by}
      </div>
      ` : ''}
      
      <a href="https://www.eventnexus.eu/#/admin" class="button">
        View in Admin Dashboard →
      </a>
      
      <div class="footer">
        <p><strong>Legal Framework References:</strong></p>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li>Trademark Protection: 15 U.S.C. § 1114 (EU: EUTMR)</li>
          <li>Copyright: 17 U.S.C. § 501 (EU: InfoSoc Directive 2001/29/EC)</li>
          <li>Cybersquatting: 15 U.S.C. § 1125(d) (ACPA)</li>
          <li>False Advertising: 15 U.S.C. § 1125(a) (Lanham Act)</li>
        </ul>
        <p style="margin-top: 15px;">
          This is an automated alert from EventNexus Brand Protection System.<br/>
          Do not reply to this email. Manage alerts in the Admin Dashboard.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: `🚨 CRITICAL: Brand Protection Alert - ${alert.title}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      throw new Error(`Email send failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result.id);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendWeeklySummary(stats: any): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return;
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .stat-card { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
    .stat-number { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { color: #6b7280; font-size: 14px; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📊 Weekly Brand Monitoring Summary</h1>
    </div>
    <div class="content">
      <p>Here's your brand protection activity for the past 7 days:</p>
      
      <div class="stat-card">
        <div class="stat-number">${stats.criticalAlerts + stats.warningAlerts + stats.infoAlerts}</div>
        <div class="stat-label">Total Alerts Detected</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">${stats.codeScans}</div>
        <div class="stat-label">Code Repository Scans</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">${stats.domainChecks}</div>
        <div class="stat-label">Domain Checks</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">${stats.brandMentions}</div>
        <div class="stat-label">Brand Mentions Monitored</div>
      </div>
      
      <h3>Alert Breakdown:</h3>
      <ul>
        <li>🔴 Critical: ${stats.criticalAlerts}</li>
        <li>🟡 Warning: ${stats.warningAlerts}</li>
        <li>🔵 Info: ${stats.infoAlerts}</li>
      </ul>
      
      <a href="https://www.eventnexus.eu/#/admin" class="button">
        View Full Report →
      </a>
      
      <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
        Last scan: ${new Date(stats.lastScanTime).toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: '📊 Weekly Brand Monitoring Summary',
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      throw new Error(`Email send failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Weekly summary email sent:', result.id);
  } catch (error) {
    console.error('Error sending weekly summary:', error);
    throw error;
  }
}
