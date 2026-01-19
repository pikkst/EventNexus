import React from 'react';
import { VenueItem, ItemShape } from './types';

interface EditorSidebarProps {
  selectedItem: VenueItem | null;
  selectedCount: number;
  onUpdate: (updates: Partial<VenueItem>) => void;
  onDelete: (id: string) => void;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (width: number, height: number) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgClear: () => void;
  hasBg: boolean;
}

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'
];

const EditorSidebar: React.FC<EditorSidebarProps> = ({ 
  selectedItem, 
  selectedCount,
  onUpdate, 
  onDelete,
  canvasSize,
  onCanvasSizeChange,
  onBgUpload,
  onBgClear,
  hasBg
}) => {
  return (
    <div className="w-80 border-l bg-slate-50 p-6 shadow-xl flex flex-col overflow-y-auto">
      <h3 className="text-lg font-bold mb-6 text-slate-900">Venue Designer</h3>
      
      {selectedCount === 0 ? (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Canvas Settings</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-700 uppercase font-bold">Width (px)</label>
                <input
                  type="number"
                  value={canvasSize.width}
                  onChange={(e) => onCanvasSizeChange(Number(e.target.value), canvasSize.height)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-700 uppercase font-bold">Height (px)</label>
                <input
                  type="number"
                  value={canvasSize.height}
                  onChange={(e) => onCanvasSizeChange(canvasSize.width, Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Floor Plan Background</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={onBgUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="text-[10px] text-slate-400">Supports JPG, PNG, PDF</p>
              {hasBg && (
                <button 
                  onClick={onBgClear}
                  className="text-xs text-rose-500 font-bold hover:underline self-start"
                >
                  Remove Background
                </button>
              )}
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-700 text-sm">
            <h4 className="font-bold mb-1 text-slate-900">Quick Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
              <li>Drag background to select multiple</li>
              <li>Hold Shift to multi-select items</li>
              <li>Use arrow keys to nudge selection</li>
              <li>Press Delete to remove selected</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-2">
             <h4 className="font-bold text-indigo-600 uppercase text-xs tracking-wider">
               {selectedCount > 1 ? `Bulk Editing ${selectedCount} items` : `Editing: ${selectedItem?.type}`}
             </h4>
             <button onClick={() => onDelete(selectedItem?.id || '')} className="text-rose-500 hover:text-rose-700 p-1">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          </div>

          {selectedCount === 1 && selectedItem && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Name</label>
              <input
                type="text"
                value={selectedItem.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Ticket Price ($) {selectedCount > 1 && '(apply to all)'}
            </label>
            <input
              type="number"
              value={selectedItem?.price ?? 0}
              onChange={(e) => onUpdate({ price: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color {selectedCount > 1 && '(apply to all)'}</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onUpdate({ color })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${selectedItem?.color === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input 
                type="color" 
                value={selectedItem?.color || '#6366f1'} 
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
              />
            </div>
          </div>

          {selectedCount === 1 && selectedItem && (selectedItem.type === 'zone' || selectedItem.type === 'stage') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Shape</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate({ shape: 'rect' })}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${selectedItem.shape === 'rect' || !selectedItem.shape ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  Rectangle
                </button>
                <button
                  onClick={() => onUpdate({ shape: 'circle' })}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${selectedItem.shape === 'circle' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  Round / Circle
                </button>
              </div>
            </div>
          )}

          {selectedCount === 1 && selectedItem && selectedItem.type === 'seat' && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Seat Number</label>
              <input
                type="number"
                value={selectedItem.seatNumber || 0}
                onChange={(e) => onUpdate({ seatNumber: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
              />
            </div>
          )}

          {selectedCount === 1 && selectedItem && (selectedItem.type === 'zone' || selectedItem.type === 'stage') && (
            <>
              {selectedItem.type === 'zone' && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={selectedItem.capacity || 0}
                    onChange={(e) => onUpdate({ capacity: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Width</label>
                  <input
                    type="number"
                    value={selectedItem.width}
                    onChange={(e) => onUpdate({ width: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height</label>
                  <input
                    type="number"
                    value={selectedItem.height}
                    onChange={(e) => onUpdate({ height: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-6 border-t mt-6">
            <button
              onClick={() => onDelete(selectedItem?.id || '')}
              className="w-full bg-rose-50 text-rose-600 border border-rose-200 rounded-lg py-2 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 font-bold"
            >
              Delete {selectedCount > 1 ? `${selectedCount} items` : selectedItem?.type}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
