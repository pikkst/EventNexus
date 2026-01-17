import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Loader, Search, Filter, ChevronDown, Trash2, Eye } from 'lucide-react';
import { EventReport } from '../types';
import { getAllEventReports, updateReportStatus, getEvents, safeDeleteEvent } from '../services/dbService';

interface AdminEventReportsProps {
  isAdmin: boolean;
}

const AdminEventReports: React.FC<AdminEventReportsProps> = ({ isAdmin }) => {
  const [reports, setReports] = useState<EventReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<EventReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved' | 'dismissed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Map<string, string>>(new Map());
  const [isUpdatingReport, setIsUpdatingReport] = useState<string | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, searchTerm]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await getAllEventReports();
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      );
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredReports(filtered);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: 'acknowledged' | 'resolved' | 'dismissed') => {
    setIsUpdatingReport(reportId);
    const notes = resolutionNotes.get(reportId) || '';
    
    try {
      const success = await updateReportStatus(reportId, newStatus, notes);
      if (success) {
        setReports(prev =>
          prev.map(r =>
            r.id === reportId
              ? { ...r, status: newStatus, resolution_notes: notes, resolved_at: new Date().toISOString() }
              : r
          )
        );
        setResolutionNotes(prev => {
          const newMap = new Map(prev);
          newMap.delete(reportId);
          return newMap;
        });
        setExpandedReportId(null);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    } finally {
      setIsUpdatingReport(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setIsDeletingEvent(eventId);
    try {
      const success = await safeDeleteEvent(eventId);
      if (success) {
        setReports(prev => prev.filter(r => r.event_id !== eventId));
        alert('Event has been deleted');
      } else {
        alert('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    } finally {
      setIsDeletingEvent(null);
      setShowDeleteConfirm(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'acknowledged':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'dismissed':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'wrong_location':
        return '📍';
      case 'wrong_info':
        return '📝';
      case 'duplicate':
        return '🔄';
      case 'spam':
        return '🚫';
      case 'inappropriate':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const reportStats = {
    total: reports.length,
    open: reports.filter(r => r.status === 'open').length,
    acknowledged: reports.filter(r => r.status === 'acknowledged').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400 font-semibold">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Event Reports</h2>
            <p className="text-sm text-slate-400">Monitor and manage user-submitted event reports</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Total Reports</p>
            <p className="text-2xl font-bold text-white">{reportStats.total}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-xs text-red-400 mb-1">Open</p>
            <p className="text-2xl font-bold text-red-400">{reportStats.open}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-xs text-yellow-400 mb-1">Acknowledged</p>
            <p className="text-2xl font-bold text-yellow-400">{reportStats.acknowledged}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-xs text-green-400 mb-1">Resolved</p>
            <p className="text-2xl font-bold text-green-400">{reportStats.resolved}</p>
          </div>
          <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Dismissed</p>
            <p className="text-2xl font-bold text-slate-400">{reportStats.dismissed}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none transition-colors appearance-none pr-10"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
          <p className="text-slate-400 font-semibold">No reports found</p>
          <p className="text-sm text-slate-500 mt-2">
            {searchTerm ? 'Try different search terms' : 'All event reports are resolved!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
              {/* Report Header */}
              <button
                onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex-1 flex items-center gap-4">
                  <div className={`px-3 py-1.5 rounded-lg border ${getStatusBadgeColor(report.status)}`}>
                    <span className="text-xs font-bold uppercase">{report.status}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white flex items-center gap-2">
                      <span>{getReportTypeIcon(report.report_type)}</span>
                      {report.reason}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Reported {new Date(report.created_at).toLocaleDateString()} • {report.reporter_email || 'Anonymous'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${expandedReportId === report.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Report Details (Expanded) */}
              {expandedReportId === report.id && (
                <div className="border-t border-slate-800 p-4 bg-slate-800/30 space-y-4">
                  {/* Description */}
                  {report.description && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                      <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg">{report.description}</p>
                    </div>
                  )}

                  {/* Resolution Notes */}
                  {report.resolution_notes && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resolution Notes</p>
                      <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg">{report.resolution_notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {report.status === 'open' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                          Resolution Notes (Optional)
                        </label>
                        <textarea
                          value={resolutionNotes.get(report.id) || ''}
                          onChange={(e) => {
                            const newMap = new Map(resolutionNotes);
                            newMap.set(report.id, e.target.value);
                            setResolutionNotes(newMap);
                          }}
                          placeholder="Add notes about how this report was handled..."
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 outline-none transition-colors resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(report.id, 'acknowledged')}
                          disabled={isUpdatingReport === report.id}
                          className="flex-1 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 text-yellow-400 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isUpdatingReport === report.id ? <Loader className="w-4 h-4 animate-spin" /> : null}
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(report.id, 'resolved')}
                          disabled={isUpdatingReport === report.id}
                          className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 text-green-400 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isUpdatingReport === report.id ? <Loader className="w-4 h-4 animate-spin" /> : null}
                          Resolved
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                          disabled={isUpdatingReport === report.id}
                          className="flex-1 px-4 py-2 bg-slate-700/20 hover:bg-slate-700/30 border border-slate-600/50 text-slate-400 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isUpdatingReport === report.id ? <Loader className="w-4 h-4 animate-spin" /> : null}
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete Event Option */}
                  {report.status === 'open' && (
                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin Actions</p>
                      {showDeleteConfirm === report.id ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                          <p className="text-sm text-red-400 font-semibold">Are you sure you want to delete this event from the database?</p>
                          <p className="text-xs text-red-300">This action cannot be undone. The event will be completely removed from the map and database.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteEvent(report.event_id)}
                              disabled={isDeletingEvent === report.event_id}
                              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isDeletingEvent === report.event_id ? <Loader className="w-4 h-4 animate-spin" /> : null}
                              Delete Event
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              disabled={isDeletingEvent === report.event_id}
                              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(report.id)}
                          className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Event from Database
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEventReports;
