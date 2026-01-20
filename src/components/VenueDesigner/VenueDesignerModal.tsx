import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Undo, Redo, Plus, Save, FolderOpen } from 'lucide-react';
import { VenueItem, VenueLayout } from './types';
import LayoutItem from './LayoutItem';
import EditorSidebar from './EditorSidebar';
import { saveVenueTemplate, getUserVenueTemplates, deleteVenueTemplate } from '../../services/dbService';

const SNAP_GRID = 20;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

interface VenueDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (layout: VenueLayout) => void;
  initialLayout?: VenueLayout;
  userId: string; // User ID for template management
}

const VenueDesignerModal: React.FC<VenueDesignerModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialLayout,
  userId
}) => {
  const [items, setItems] = useState<VenueItem[]>(initialLayout?.items || []);
  const [canvasSize, setCanvasSize] = useState({ 
    width: initialLayout?.canvasWidth || DEFAULT_WIDTH, 
    height: initialLayout?.canvasHeight || DEFAULT_HEIGHT 
  });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialLayout?.backgroundImage || null);
  
  // Template management state
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // History state for Undo/Redo
  const [past, setPast] = useState<VenueItem[][]>([]);
  const [future, setFuture] = useState<VenueItem[][]>([]);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Drag and Marquee states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  
  const canvasRef = useRef<SVGSVGElement>(null);

  // Load user templates on mount
  useEffect(() => {
    if (isOpen && userId) {
      loadTemplates();
    }
  }, [isOpen, userId]);

  const loadTemplates = async () => {
    const userTemplates = await getUserVenueTemplates(userId);
    setTemplates(userTemplates);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const result = await saveVenueTemplate(userId, templateName, {
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      items,
      backgroundImage: backgroundImage || undefined
    });

    if (result) {
      alert('Template saved successfully!');
      setTemplateName('');
      setShowSaveTemplateModal(false);
      loadTemplates();
    } else {
      alert('Failed to save template');
    }
  };

  const handleLoadTemplate = (template: any) => {
    setItems(template.items || []);
    setCanvasSize({
      width: template.canvas_width || DEFAULT_WIDTH,
      height: template.canvas_height || DEFAULT_HEIGHT
    });
    setBackgroundImage(template.background_image || null);
    setShowTemplateModal(false);
    commitToHistory(template.items || []);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    const success = await deleteVenueTemplate(templateId);
    if (success) {
      loadTemplates();
    } else {
      alert('Failed to delete template');
    }
  };

  // Helper to commit current state to history
  const commitToHistory = useCallback((newItems: VenueItem[]) => {
    setPast(prev => [...prev.slice(-49), items]); // Keep last 50 states
    setItems(newItems);
    setFuture([]);
  }, [items]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture(prev => [items, ...prev]);
    setItems(previous);
    setPast(newPast);
    setSelectedIds([]);
  }, [past, items]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast(prev => [...prev, items]);
    setItems(next);
    setFuture(newFuture);
    setSelectedIds([]);
  }, [future, items]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      if (selectedIds.length === 0) return;

      const step = e.shiftKey ? 1 : SNAP_GRID;
      
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const nextItems = items.map(item => {
          if (!selectedIds.includes(item.id)) return item;
          let newX = item.x;
          let newY = item.y;
          if (e.key === 'ArrowUp') newY -= step;
          if (e.key === 'ArrowDown') newY += step;
          if (e.key === 'ArrowLeft') newX -= step;
          if (e.key === 'ArrowRight') newX += step;
          return { ...item, x: newX, y: newY };
        });
        commitToHistory(nextItems);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const nextItems = items.filter(i => !selectedIds.includes(i.id));
        commitToHistory(nextItems);
        setSelectedIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIds, items, undo, redo, commitToHistory]);

  const addItem = (type: 'seat' | 'zone' | 'stage') => {
    const id = Math.random().toString(36).substr(2, 9);
    let newItem: VenueItem;
    
    if (type === 'seat') {
      newItem = { 
        id, 
        type, 
        x: canvasSize.width / 2, 
        y: canvasSize.height / 2, 
        name: 'New Seat', 
        price: 20, 
        seatNumber: items.filter(i => i.type === 'seat').length + 1 
      };
    } else if (type === 'zone') {
      newItem = { 
        id, 
        type, 
        x: canvasSize.width / 2, 
        y: canvasSize.height / 2, 
        width: 200, 
        height: 100, 
        name: 'New Zone', 
        price: 50, 
        capacity: 100, 
        color: '#6366f1', 
        shape: 'rect' 
      };
    } else {
      newItem = { 
        id, 
        type, 
        x: canvasSize.width / 2, 
        y: 40, 
        width: 400, 
        height: 60, 
        name: 'Main Stage', 
        price: 0, 
        shape: 'rect' 
      };
    }
    
    const nextItems = [...items, newItem];
    commitToHistory(nextItems);
    setSelectedIds([id]);
  };

  const updateItem = (id: string, updates: Partial<VenueItem>) => {
    const nextItems = items.map(item => item.id === id ? { ...item, ...updates } : item);
    commitToHistory(nextItems);
  };

  const bulkUpdate = (u: Partial<VenueItem>) => {
    const nextItems = items.map(item => 
      selectedIds.includes(item.id) ? { ...item, ...u } : item
    );
    commitToHistory(nextItems);
  };

  const deleteItem = (id: string) => {
    const next = items.filter(i => i.id !== id);
    commitToHistory(next);
    setSelectedIds([]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const target = e.target as SVGElement;
    const itemElement = target.closest('[data-item-id]');
    
    if (itemElement) {
      const id = itemElement.getAttribute('data-item-id')!;
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
      } else {
        if (!selectedIds.includes(id)) {
          setSelectedIds([id]);
        }
      }
      setIsDragging(true);
      setDragStart({ x, y });
    } else {
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
        setSelectedIds([]);
      }
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragStart && selectedIds.length > 0) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        setItems(prev => prev.map(item => {
          if (!selectedIds.includes(item.id)) return item;
          let newX = item.x + dx;
          let newY = item.y + dy;
          if (selectedIds.length === 1) {
            newX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
            newY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
          }
          return { ...item, x: newX, y: newY };
        }));
        setDragStart({ x, y });
      }
    } else if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      commitToHistory(items);
    }

    if (selectionBox) {
      const xMin = Math.min(selectionBox.x1, selectionBox.x2);
      const xMax = Math.max(selectionBox.x1, selectionBox.x2);
      const yMin = Math.min(selectionBox.y1, selectionBox.y2);
      const yMax = Math.max(selectionBox.y1, selectionBox.y2);

      const newlySelected = items.filter(item => {
        return item.x >= xMin && item.x <= xMax && item.y >= yMin && item.y <= yMax;
      }).map(i => i.id);

      if (newlySelected.length > 0) {
        setSelectedIds(prev => Array.from(new Set([...prev, ...newlySelected])));
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setSelectionBox(null);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Check if it's a PDF
        if (file.type === 'application/pdf') {
          // For PDFs, we need to convert to image first
          // Using canvas to render PDF (requires pdf.js)
          alert('PDF floor plans: Please convert your PDF to PNG/JPG first using an online converter (e.g., pdf2png.com). This will give you better control over the image quality.');
          e.target.value = ''; // Reset input
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setBackgroundImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Background upload error:", err);
        alert("Could not process background file.");
      }
    }
  };

  const handleSave = () => {
    const layout: VenueLayout = {
      name: 'Venue Layout',
      items,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      backgroundImage: backgroundImage || undefined
    };
    onSave(layout);
    onClose();
  };

  const selectedItem = selectedIds.length === 1 ? items.find(i => i.id === selectedIds[0]) || null : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Venue Designer</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 font-medium text-sm"
              title="Load Template"
            >
              <FolderOpen className="h-4 w-4" />
              Load Template
            </button>
            <button 
              onClick={() => setShowSaveTemplateModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 font-medium text-sm"
              title="Save as Template"
            >
              <Save className="h-4 w-4" />
              Save as Template
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <button 
              onClick={undo}
              disabled={past.length === 0}
              className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-5 w-5" />
            </button>
            <button 
              onClick={redo}
              disabled={future.length === 0}
              className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 border-r bg-white p-6 flex flex-col gap-6 overflow-y-auto">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Venue Elements</h3>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => addItem('seat')}
                  className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-sm font-semibold text-slate-900"
                >
                  <div className="bg-indigo-100 p-2 rounded text-indigo-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  Place New Seat
                </button>
                <button 
                  onClick={() => addItem('zone')}
                  className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-sm font-semibold text-slate-900"
                >
                   <div className="bg-indigo-100 p-2 rounded text-indigo-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  Define Zone
                </button>
                <button 
                  onClick={() => addItem('stage')}
                  className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-sm font-semibold text-slate-900"
                >
                   <div className="bg-indigo-100 p-2 rounded text-indigo-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  Add Stage
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <main className="flex-1 overflow-auto bg-slate-100 p-8 flex justify-center items-center">
            <div className="relative shadow-2xl rounded-xl bg-white border border-slate-200">
              <svg
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="block cursor-crosshair overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid Lines */}
                <defs>
                  <pattern id="grid" width={SNAP_GRID} height={SNAP_GRID} patternUnits="userSpaceOnUse">
                    <path d={`M ${SNAP_GRID} 0 L 0 0 0 ${SNAP_GRID}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width={canvasSize.width} height={canvasSize.height} fill="url(#grid)" />
                
                {backgroundImage && (
                  <image 
                    href={backgroundImage} 
                    width={canvasSize.width} 
                    height={canvasSize.height} 
                    preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: 0.5, pointerEvents: 'none' }}
                  />
                )}

                {/* Selection Box UI */}
                {selectionBox && (
                  <rect
                    x={Math.min(selectionBox.x1, selectionBox.x2)}
                    y={Math.min(selectionBox.y1, selectionBox.y2)}
                    width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                    height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                    fill="rgba(99, 102, 241, 0.1)"
                    stroke="#6366f1"
                    strokeWidth="1"
                    strokeDasharray="4"
                  />
                )}

                {items.map(item => (
                  <LayoutItem 
                    key={item.id} 
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    onSelect={(id) => {}}
                  />
                ))}
              </svg>
              
              <div className="absolute bottom-4 right-4 flex gap-4 bg-white/80 backdrop-blur p-2 rounded-lg border text-[10px] font-bold text-slate-400 uppercase tracking-tight pointer-events-none">
                <span>{canvasSize.width}x{canvasSize.height}px</span>
                {selectedIds.length > 0 && (
                  <span className="text-indigo-600 ml-2">Selected: {selectedIds.length}</span>
                )}
              </div>
            </div>
          </main>

          {/* Editor Sidebar */}
          <EditorSidebar 
            selectedItem={selectedItem} 
            selectedCount={selectedIds.length}
            onUpdate={(u) => {
              if (selectedIds.length === 1) {
                updateItem(selectedIds[0], u);
              } else if (selectedIds.length > 1) {
                bulkUpdate(u);
              }
            }}
            onDelete={(id) => {
              if (selectedIds.length > 1) {
                const nextItems = items.filter(i => !selectedIds.includes(i.id));
                commitToHistory(nextItems);
                setSelectedIds([]);
              } else {
                deleteItem(id);
              }
            }}
            canvasSize={canvasSize}
            onCanvasSizeChange={(w, h) => {
              setCanvasSize({ width: w, height: h });
            }}
            onBgUpload={handleBgUpload}
            onBgClear={() => setBackgroundImage(null)}
            hasBg={!!backgroundImage}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-slate-50">
          <p className="text-sm text-slate-600">
            {items.length} items • {items.filter(i => i.type === 'seat').length} seats • {items.filter(i => i.type === 'zone').length} zones
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>

      {/* Load Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-slate-900">Load Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-2">No templates yet</p>
                  <p className="text-sm">Create your first template by clicking "Save as Template"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:border-indigo-400 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900">{template.template_name}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {template.canvas_width}x{template.canvas_height}px • {template.items?.length || 0} items
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleLoadTemplate(template)}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        Load Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-slate-900">Save as Template</h3>
              <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-900 mb-2">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Theater Layout, Concert Hall, Conference Room"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              />
              <p className="text-xs text-slate-500 mt-2">
                This template will be saved and available for future events
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueDesignerModal;
