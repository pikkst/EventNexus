import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Calendar, Clock, DollarSign, Users, Ticket as TicketIcon } from 'lucide-react';
import { TicketTemplate, TicketType } from '../types';

interface TicketBuilderProps {
  eventId: string;
  eventStartDate: string;
  eventEndDate?: string;
  onTicketsChange: (tickets: Partial<TicketTemplate>[]) => void;
  initialTickets?: Partial<TicketTemplate>[];
}

const TICKET_TYPES: { value: TicketType; label: string; icon: string }[] = [
  { value: 'general', label: 'General Admission', icon: '🎫' },
  { value: 'vip', label: 'VIP Pass', icon: '⭐' },
  { value: 'early_bird', label: 'Early Bird', icon: '🐦' },
  { value: 'day_pass', label: 'Day Pass', icon: '☀️' },
  { value: 'multi_day', label: 'Multi-Day Pass', icon: '📅' },
  { value: 'backstage', label: 'Backstage Pass', icon: '🎭' },
  { value: 'student', label: 'Student Discount', icon: '🎓' },
  { value: 'group', label: 'Group Ticket', icon: '👥' }
];

export default function TicketBuilder({
  eventId,
  eventStartDate,
  eventEndDate,
  onTicketsChange,
  initialTickets = []
}: TicketBuilderProps) {
  const [tickets, setTickets] = useState<Partial<TicketTemplate>[]>(
    initialTickets.length > 0 ? initialTickets : [createDefaultTicket()]
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function createDefaultTicket(): Partial<TicketTemplate> {
    return {
      name: 'General Admission',
      type: 'general',
      price: 0,
      quantity_total: 100,
      quantity_available: 100,
      quantity_sold: 0,
      description: '',
      is_active: true,
      includes: []
    };
  }

  const calculateEventDays = () => {
    if (!eventEndDate) return 1;
    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days);
  };

  const eventDays = calculateEventDays();
  const isMultiDay = eventDays > 1;

  const handleAddTicket = () => {
    const newTicket = createDefaultTicket();
    const updated = [...tickets, newTicket];
    setTickets(updated);
    onTicketsChange(updated);
    setEditingIndex(updated.length - 1);
  };

  const handleRemoveTicket = (index: number) => {
    const updated = tickets.filter((_, i) => i !== index);
    setTickets(updated);
    onTicketsChange(updated);
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleUpdateTicket = (index: number, updates: Partial<TicketTemplate>) => {
    const updated = tickets.map((ticket, i) => 
      i === index ? { ...ticket, ...updates } : ticket
    );
    setTickets(updated);
    onTicketsChange(updated);
  };

  const handleToggleIncludes = (index: number, item: string) => {
    const ticket = tickets[index];
    const includes = ticket.includes || [];
    const updated = includes.includes(item)
      ? includes.filter(i => i !== item)
      : [...includes, item];
    handleUpdateTicket(index, { includes: updated });
  };

  const handleAddCustomInclude = (index: number, item: string) => {
    if (!item.trim()) return;
    const ticket = tickets[index];
    const includes = ticket.includes || [];
    if (!includes.includes(item)) {
      handleUpdateTicket(index, { includes: [...includes, item] });
    }
  };

  const getTotalRevenuePotential = () => {
    return tickets.reduce((sum, ticket) => 
      sum + (ticket.price || 0) * (ticket.quantity_total || 0), 0
    );
  };

  const getTotalCapacity = () => {
    return tickets.reduce((sum, ticket) => sum + (ticket.quantity_total || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <TicketIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Ticket Types</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">{tickets.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Total Capacity</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{getTotalCapacity()}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Max Revenue</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">${getTotalRevenuePotential().toFixed(2)}</p>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        {tickets.map((ticket, index) => (
          <div
            key={index}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors"
          >
            {editingIndex === index ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Edit Ticket</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveTicket(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ticket Name
                    </label>
                    <input
                      type="text"
                      value={ticket.name || ''}
                      onChange={(e) => handleUpdateTicket(index, { name: e.target.value })}
                      placeholder="e.g., VIP Pass"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ticket Type
                    </label>
                    <select
                      value={ticket.type || 'general'}
                      onChange={(e) => handleUpdateTicket(index, { type: e.target.value as TicketType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {TICKET_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticket.price || 0}
                      onChange={(e) => handleUpdateTicket(index, { price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity Available
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ticket.quantity_total || 100}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 100;
                        handleUpdateTicket(index, { 
                          quantity_total: qty,
                          quantity_available: qty
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {isMultiDay && (ticket.type === 'day_pass' || ticket.type === 'multi_day') && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valid Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: eventDays }, (_, i) => i + 1).map(day => (
                          <button
                            key={day}
                            onClick={() => {
                              const validDays = ticket.valid_days || [];
                              const updated = validDays.includes(day)
                                ? validDays.filter(d => d !== day)
                                : [...validDays, day];
                              handleUpdateTicket(index, { valid_days: updated });
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              (ticket.valid_days || []).includes(day)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Day {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={ticket.description || ''}
                      onChange={(e) => handleUpdateTicket(index, { description: e.target.value })}
                      placeholder="What's included with this ticket..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Period (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="datetime-local"
                        value={ticket.sale_start || ''}
                        onChange={(e) => handleUpdateTicket(index, { sale_start: e.target.value })}
                        placeholder="Sale starts"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="datetime-local"
                        value={ticket.sale_end || ''}
                        onChange={(e) => handleUpdateTicket(index, { sale_end: e.target.value })}
                        placeholder="Sale ends"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {TICKET_TYPES.find(t => t.value === ticket.type)?.icon || '🎫'}
                      </span>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{ticket.name}</h4>
                        <p className="text-sm text-gray-500">
                          {TICKET_TYPES.find(t => t.value === ticket.type)?.label}
                        </p>
                      </div>
                    </div>
                    
                    {ticket.description && (
                      <p className="text-gray-600 text-sm mt-2">{ticket.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold">${ticket.price?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users className="w-4 h-4" />
                        <span>{ticket.quantity_total} available</span>
                      </div>
                      {ticket.valid_days && ticket.valid_days.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4" />
                          <span>Days: {ticket.valid_days.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingIndex(index)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Ticket Button */}
      <button
        onClick={handleAddTicket}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Another Ticket Type
      </button>
    </div>
  );
}
