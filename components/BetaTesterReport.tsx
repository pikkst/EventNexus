import React, { useState } from 'react';
import { Bug, Send, Loader, CheckCircle, AlertCircle, X } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface BetaTesterReportProps {
  user: User;
  onClose?: () => void;
}

export const BetaTesterReport: React.FC<BetaTesterReportProps> = ({ user, onClose }) => {
  const [reportType, setReportType] = useState<'bug' | 'feedback' | 'feature'>('bug');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [consoleLogs, setConsoleLogs] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [environment, setEnvironment] = useState(() => {
    if (typeof navigator !== 'undefined') return navigator.userAgent;
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Insert directly into admin_inbox table
      const { error } = await supabase
        .from('admin_inbox')
        .insert([{
          from_email: user.email,
          from_name: `${user.name} (Beta Tester)`,
          to_email: 'admin@eventnexus.eu',
          subject: `[${reportType.toUpperCase()}] ${subject}`,
          body_text: `
Beta Tester: ${user.name} (${user.email})
User ID: ${user.id}
Priority: ${priority}
Type: ${reportType}

${description}

Repro Steps:
${steps || 'Not provided'}

Console Logs / Errors:
${consoleLogs || 'Not provided'}

Screenshot / Screen recording URL:
${screenshotUrl || 'Not provided'}

Environment:
${environment || 'Not provided'}

---
Submitted via Beta Tester Report Tool
          `.trim(),
          body_html: null,
          attachments: [],
          status: 'unread',
          priority: priority,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: '✅ Thank you! Your report has been sent to the admin team.' 
      });
      
      // Clear form after successful submission
      setTimeout(() => {
        setSubject('');
        setDescription('');
        setSteps('');
        setConsoleLogs('');
        setScreenshotUrl('');
        setReportType('bug');
        setPriority('normal');
        setMessage(null);
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to submit report. Please try again or email support@mail.eventnexus.eu' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/30 rounded-[32px] p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/50 rounded-2xl flex items-center justify-center">
            <Bug className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Beta Tester Report</h3>
            <p className="text-xs text-slate-400 font-semibold">Direct line to the dev team</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Beta Badge */}
      <div className="mb-6 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-indigo-400" />
        <p className="text-xs text-indigo-300 font-semibold">
          You are a verified beta tester. Your feedback helps shape EventNexus!
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex gap-3 ${
          message.type === 'error' 
            ? 'bg-red-500/20 border border-red-500/50 text-red-300' 
            : 'bg-green-500/20 border border-green-500/50 text-green-300'
        }`}>
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Report Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'bug', label: '🐛 Bug', desc: 'Something broken' },
              { value: 'feedback', label: '💬 Feedback', desc: 'General thoughts' },
              { value: 'feature', label: '💡 Feature', desc: 'New idea' }
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setReportType(type.value as any)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  reportType === type.value
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <p className="text-sm font-bold text-white">{type.label}</p>
                <p className="text-xs text-slate-400">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="low">Low - Minor issue</option>
            <option value="normal">Normal - Standard issue</option>
            <option value="high">High - Important issue</option>
            <option value="urgent">Urgent - Critical issue</option>
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of the issue/feedback"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              reportType === 'bug'
                ? 'Steps to reproduce:\n1. Go to...\n2. Click on...\n3. See error...\n\nExpected: ...\nActual: ...'
                : reportType === 'feedback'
                ? 'Share your thoughts about the platform...'
                : 'Describe the feature you\'d like to see...'
            }
            rows={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            required
          />
        </div>

        {/* Steps to Reproduce */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Steps to Reproduce (optional)</label>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder={'1. ...\n2. ...\n3. ...\nExpected: ...\nActual: ...'}
            rows={5}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
        </div>

        {/* Console Logs */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Console errors or logs (optional)</label>
          <textarea
            value={consoleLogs}
            onChange={(e) => setConsoleLogs(e.target.value)}
            placeholder={'Paste relevant console output or stack trace here'}
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none font-mono text-xs"
          />
        </div>

        {/* Screenshot URL */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Screenshot / screen recording URL (optional)</label>
          <input
            type="url"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Environment */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Environment (browser / device)</label>
          <input
            type="text"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="Browser, OS, device"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 px-6 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-xl"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send size={20} />
              Send to Admin Team
            </>
          )}
        </button>
      </form>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">Note:</strong> All beta tester reports are sent directly to the Admin Inbox and reviewed within 24 hours. For urgent issues, you can also email{' '}
          <a href="mailto:support@mail.eventnexus.eu" className="text-indigo-400 hover:text-indigo-300">
            support@mail.eventnexus.eu
          </a>
        </p>
      </div>
    </div>
  );
};

export default BetaTesterReport;

