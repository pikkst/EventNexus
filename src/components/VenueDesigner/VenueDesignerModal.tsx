import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Undo, Redo, Plus, Save, FolderOpen, Maximize2, Minimize2, ZoomIn, ZoomOut, Move, Grid3x3, Lock, Unlock, Eye, Layers } from 'lucide-react';
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
  
  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<VenueItem[]>([]);
  
  // Fullscreen and view controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number, y: number } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Drag and Marquee states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ screenX: number, screenY: number } | null>(null);
  const [draggedItemsStart, setDraggedItemsStart] = useState<Map<string, { x: number, y: number }>>(new Map());
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

      // Copy/Paste/Duplicate shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIds.length > 0) {
        e.preventDefault();
        const copiedItems = items.filter(i => selectedIds.includes(i.id));
        setClipboard(copiedItems);
        console.log(`Copied ${copiedItems.length} item(s) to clipboard`);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard.length > 0) {
        e.preventDefault();
        // Get the highest seat number currently in use
        const maxSeatNumber = Math.max(0, ...items.filter(i => i.type === 'seat' && i.seatNumber).map(i => i.seatNumber || 0));
        let seatCounter = maxSeatNumber + 1;
        
        const newItems = clipboard.map(item => {
          const newItem = {
            ...item,
            id: Math.random().toString(36).substr(2, 9),
            x: item.x + 40,
            y: item.y + 40
          };
          
          // Auto-increment seat numbers for seats
          if (item.type === 'seat') {
            newItem.seatNumber = seatCounter++;
            newItem.name = `Seat ${newItem.seatNumber}`;
          }
          
          return newItem;
        });
        const nextItems = [...items, ...newItems];
        commitToHistory(nextItems);
        setSelectedIds(newItems.map(i => i.id));
        console.log(`Pasted ${newItems.length} item(s)`);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.length > 0) {
        e.preventDefault();
        // Get the highest seat number currently in use
        const maxSeatNumber = Math.max(0, ...items.filter(i => i.type === 'seat' && i.seatNumber).map(i => i.seatNumber || 0));
        let seatCounter = maxSeatNumber + 1;
        
        const duplicatedItems = items.filter(i => selectedIds.includes(i.id)).map(item => {
          const newItem = {
            ...item,
            id: Math.random().toString(36).substr(2, 9),
            x: item.x + 40,
            y: item.y + 40
          };
          
          // Auto-increment seat numbers for seats
          if (item.type === 'seat') {
            newItem.seatNumber = seatCounter++;
            newItem.name = `Seat ${newItem.seatNumber}`;
          }
          
          return newItem;
        });
        const nextItems = [...items, ...duplicatedItems];
        commitToHistory(nextItems);
        setSelectedIds(duplicatedItems.map(i => i.id));
        console.log(`Duplicated ${duplicatedItems.length} item(s)`);
      }
      // Select All shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(items.map(i => i.id));
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

  const addItem = (type: 'seat' | 'zone' | 'stage' | 'wall' | 'decoration') => {
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
        seatNumber: items.filter(i => i.type === 'seat').length + 1,
        color: '#6366f1' // Default indigo color
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
    } else if (type === 'wall') {
      newItem = { 
        id, 
        type, 
        x: canvasSize.width / 2 - 100, 
        y: canvasSize.height / 2, 
        width: 200, 
        height: 10, 
        name: 'Wall', 
        price: 0, 
        color: '#64748b', 
        shape: 'rect' 
      };
    } else if (type === 'decoration') {
      newItem = { 
        id, 
        type, 
        x: canvasSize.width / 2, 
        y: canvasSize.height / 2, 
        width: 100, 
        height: 100, 
        name: 'Decoration', 
        price: 0, 
        color: '#10b981', 
        shape: 'circle' 
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
    if (previewMode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;

    const target = e.target as SVGElement;
    const itemElement = target.closest('[data-item-id]');
    
    // Pan with spacebar or middle mouse
    if (e.button === 1 || (e.button === 0 && e.shiftKey && !itemElement)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    
    if (itemElement) {
      const id = itemElement.getAttribute('data-item-id')!;
      if (lockedIds.includes(id)) return; // Don't select locked items
      
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
      } else {
        if (!selectedIds.includes(id)) {
          setSelectedIds([id]);
        }
      }
      
      // Store initial positions of all selected items
      const initialPositions = new Map<string, { x: number, y: number }>();
      items.forEach(item => {
        if (selectedIds.includes(item.id) || item.id === id) {
          initialPositions.set(item.id, { x: item.x, y: item.y });
        }
      });
      
      setIsDragging(true);
      setDragStart({ screenX: e.clientX, screenY: e.clientY });
      setDraggedItemsStart(initialPositions);
    } else {
      if (!(e.ctrlKey || e.metaKey)) {
        setSelectedIds([]);
      }
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (previewMode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;

    if (isPanning && panStart) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isDragging && dragStart && selectedIds.length > 0) {
      // Calculate delta using screen coordinates divided by zoom
      const dx = (e.clientX - dragStart.screenX) / zoom;
      const dy = (e.clientY - dragStart.screenY) / zoom;

      if (Math.abs(dx) >= 0.1 || Math.abs(dy) >= 0.1) {
        setItems(prev => prev.map(item => {
          if (!selectedIds.includes(item.id) || lockedIds.includes(item.id)) return item;
          
          const startPos = draggedItemsStart.get(item.id);
          if (!startPos) return item;
          
          let newX = startPos.x + dx;
          let newY = startPos.y + dy;
          
          if (snapToGrid && selectedIds.length === 1) {
            newX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
            newY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
          }
          
          return { ...item, x: newX, y: newY };
        }));
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
        return item.x >= xMin && item.x <= xMax && item.y >= yMin && item.y <= yMax && !lockedIds.includes(item.id);
      }).map(i => i.id);

      if (newlySelected.length > 0) {
        setSelectedIds(prev => Array.from(new Set([...prev, ...newlySelected])));
      }
    }

    setIsDragging(false);
    setIsPanning(false);
    setDragStart(null);
    setDraggedItemsStart(new Map());
    setPanStart(null);
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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleZoomReset = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };
  const handleZoomFit = () => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const scaleX = (containerRect.width - 100) / canvasSize.width;
    const scaleY = (containerRect.height - 100) / canvasSize.height;
    setZoom(Math.min(scaleX, scaleY, 1));
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleLockSelected = () => {
    const newLocked = selectedIds.some(id => !lockedIds.includes(id))
      ? [...lockedIds, ...selectedIds.filter(id => !lockedIds.includes(id))]
      : lockedIds.filter(id => !selectedIds.includes(id));
    setLockedIds(newLocked);
  };

  const addSeatRow = () => {
    const seatsCount = parseInt(prompt('How many seats in a row?') || '10');
    const spacing = 40;
    const startX = canvasSize.width / 2 - (seatsCount * spacing) / 2;
    const startY = canvasSize.height / 2;
    const rowItems: VenueItem[] = [];
    for (let i = 0; i < seatsCount; i++) {
      rowItems.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'seat',
        x: startX + i * spacing,
        y: startY,
        name: `Seat ${i + 1}`,
        price: 20,
        seatNumber: items.filter(item => item.type === 'seat').length + i + 1,
        color: '#6366f1' // Default indigo color
      });
    }
    const nextItems = [...items, ...rowItems];
    commitToHistory(nextItems);
  };

  const selectedItem = selectedIds.length === 1 ? items.find(i => i.id === selectedIds[0]) || null : null;

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white shadow-2xl ${isFullscreen ? 'w-full h-full' : 'rounded-lg w-full max-w-7xl h-[90vh]'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Venue Designer</h2>
            {previewMode && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">PREVIEW MODE</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Controls */}
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-slate-200">
              <button 
                onClick={handleZoomOut}
                disabled={zoom <= 0.3}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors text-slate-600"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono text-slate-600 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors text-slate-600"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button 
                onClick={handleZoomReset}
                className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-600 text-xs font-medium"
                title="Reset Zoom (100%)"
              >
                1:1
              </button>
              <button 
                onClick={handleZoomFit}
                className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-600"
                title="Fit to Screen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Tools */}
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-slate-200">
              <button 
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`}
                title={`Grid: ${showGrid ? 'On' : 'Off'}`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-1.5 rounded transition-colors ${snapToGrid ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`}
                title={`Snap to Grid: ${snapToGrid ? 'On' : 'Off'}`}
              >
                <Move className="h-4 w-4" />
              </button>
              <button 
                onClick={toggleLockSelected}
                disabled={selectedIds.length === 0}
                className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
                  selectedIds.some(id => lockedIds.includes(id)) ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Lock/Unlock Selected"
              >
                {selectedIds.some(id => lockedIds.includes(id)) ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => setPreviewMode(!previewMode)}
                className={`p-1.5 rounded transition-colors ${previewMode ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`}
                title="Toggle Preview Mode"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button 
                onClick={addSeatRow}
                className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-600"
                title="Quick Add Seat Row"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-300" />
            
            <button 
              onClick={() => setShowTemplateModal(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              title="Load Template"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setShowSaveTemplateModal(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              title="Save as Template"
            >
              <Save className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <button 
              onClick={undo}
              disabled={past.length === 0}
              className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-5 w-5" />
            </button>
            <button 
              onClick={redo}
              disabled={future.length === 0}
              className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              <X className="h-5 w-5" />
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

            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Design Elements</h3>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => addItem('wall')}
                  className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all text-sm font-semibold text-slate-900"
                >
                  <div className="bg-green-100 p-2 rounded text-green-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  Add Wall/Line
                </button>
                <button 
                  onClick={() => addItem('decoration')}
                  className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all text-sm font-semibold text-slate-900"
                >
                   <div className="bg-green-100 p-2 rounded text-green-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  Add Decoration
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Keyboard Shortcuts</h3>
              <div className="text-xs text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span>Copy</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Ctrl+C</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Paste</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Ctrl+V</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Duplicate</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Ctrl+D</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Select All</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Ctrl+A</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Delete</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Del</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Move</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Arrows</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Nudge 1px</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">Shift+↑↓←→</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <main className="flex-1 overflow-hidden bg-slate-100 p-8 flex justify-center items-center relative">
            <div 
              className="relative shadow-2xl rounded-xl bg-white border border-slate-200"
              style={{
                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <svg
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className={`block overflow-hidden ${previewMode ? 'cursor-default' : isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid Lines */}
                {showGrid && (
                  <>
                    <defs>
                      <pattern id="grid" width={SNAP_GRID} height={SNAP_GRID} patternUnits="userSpaceOnUse">
                        <path d={`M ${SNAP_GRID} 0 L 0 0 0 ${SNAP_GRID}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width={canvasSize.width} height={canvasSize.height} fill="url(#grid)" />
                  </>
                )}
                
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

                {items.map(item => {
                  const isLocked = lockedIds.includes(item.id);
                  return (
                    <g key={item.id}>
                      <LayoutItem 
                        item={item}
                        isSelected={selectedIds.includes(item.id)}
                        onSelect={(id) => {}}
                      />
                      {isLocked && !previewMode && (
                        <g transform={`translate(${item.x + 15}, ${item.y - 15})`}>
                          <circle cx="0" cy="0" r="8" fill="#f59e0b" />
                          <Lock className="h-3 w-3" style={{ transform: 'translate(-6px, -6px)' }} stroke="white" strokeWidth="2" />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
              
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white/90 backdrop-blur p-3 rounded-lg border shadow-lg text-xs pointer-events-none">
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="font-mono font-bold">{canvasSize.width}×{canvasSize.height}px</span>
                  <span>•</span>
                  <span>Zoom: {Math.round(zoom * 100)}%</span>
                </div>
                {selectedIds.length > 0 && (
                  <div className="text-indigo-600 font-bold">
                    Selected: {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}
                  </div>
                )}
                {lockedIds.length > 0 && (
                  <div className="text-amber-600 font-bold flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {lockedIds.length} locked
                  </div>
                )}
                {previewMode && (
                  <div className="text-indigo-600 font-bold flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Preview Mode
                  </div>
                )}
              </div>
              
              {/* Instructions Overlay (shown when nothing selected) */}
              {!previewMode && selectedIds.length === 0 && items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 max-w-md text-center border-2 border-indigo-200">
                    <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Layers className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to Venue Designer!</h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Start by adding seats, zones, or design elements from the left toolbar.
                    </p>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>💡 Use keyboard shortcuts for faster workflow</p>
                      <p>🎨 Customize colors and prices for each item</p>
                      <p>🔍 Zoom and pan to work comfortably</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Editor Sidebar */}
          <EditorSidebar 
            selectedItem={selectedItem} 
            selectedCount={selectedIds.length}
            selectedItems={items.filter(i => selectedIds.includes(i.id))}
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
