import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Check } from 'lucide-react';
import { VenueLayout, VenueItem } from './VenueDesigner/types';
import LayoutItem from './VenueDesigner/LayoutItem';
import { getBookedVenueItems, getVenueLayout } from '../services/dbService';

interface VenueSeatSelectorProps {
  eventId: string;
  venueLayoutId: string;
  maxSeats?: number;
  ticketPrice: number;
  onSelectSeats: (seats: VenueItem[]) => void;
  onClose: () => void;
}

const VenueSeatSelector: React.FC<VenueSeatSelectorProps> = ({
  eventId,
  venueLayoutId,
  maxSeats,
  ticketPrice,
  onSelectSeats,
  onClose
}) => {
  const [venueLayout, setVenueLayout] = useState<VenueLayout | null>(null);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Load venue layout and booked seats
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [layout, booked] = await Promise.all([
          getVenueLayout(eventId),
          getBookedVenueItems(eventId)
        ]);
        setVenueLayout(layout);
        setBookedSeats(booked);
      } catch (error) {
        console.error('Error loading venue data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [eventId, venueLayoutId]);

  const handleSeatClick = (item: VenueItem) => {
    console.log('Seat clicked:', item.name, 'Type:', item.type);
    
    // Skip if stage
    if (item.type === 'stage') return;
    
    // Skip if already booked
    if (bookedSeats.includes(item.id)) {
      console.log('Seat already booked');
      return;
    }

    // Handle zones differently - allow quantity selection
    if (item.type === 'zone') {
      const availableCapacity = (item.capacity || 0) - (item.bookedCount || 0);
      
      if (availableCapacity <= 0) {
        alert('This zone is fully booked.');
        return;
      }

      // Ask user how many spots they want in this zone
      const requested = prompt(
        `How many spots do you want in ${item.name}?\n\nAvailable: ${availableCapacity} of ${item.capacity}\nPrice per spot: €${item.price || ticketPrice}`,
        '1'
      );

      if (!requested) return; // User cancelled
      
      const quantity = parseInt(requested, 10);
      
      if (isNaN(quantity) || quantity < 1) {
        alert('Please enter a valid number.');
        return;
      }

      if (quantity > availableCapacity) {
        alert(`Only ${availableCapacity} spots available in this zone.`);
        return;
      }

      // Create multiple "virtual" seats for this zone selection
      // We'll track them by appending quantity to the zone ID
      const zoneSelectionId = `${item.id}_qty_${quantity}`;
      
      // Store the zone selection with quantity info
      setSelectedSeats(prev => {
        // Remove any previous selections from this zone
        const filtered = prev.filter(id => !id.startsWith(`${item.id}_qty_`));
        return [...filtered, zoneSelectionId];
      });

      console.log(`Selected ${quantity} spots in zone ${item.name}`);
      return;
    }

    // Regular seat handling
    // Toggle selection
    if (selectedSeats.includes(item.id)) {
      // Deselect
      console.log('Deselecting seat');
      setSelectedSeats(prev => prev.filter(id => id !== item.id));
    } else {
      // Check if max seats reached (if maxSeats is set)
      if (maxSeats && selectedSeats.length >= maxSeats) {
        alert(`You can only select up to ${maxSeats} seat(s) for this ticket type.`);
        return;
      }
      // Select
      console.log('Selecting seat');
      setSelectedSeats(prev => [...prev, item.id]);
    }
  };

  const handleConfirmSelection = () => {
    if (!venueLayout || selectedSeats.length === 0) return;
    
    // Build the selected items list with quantities for zones
    const selectedItems: VenueItem[] = [];
    
    selectedSeats.forEach(selectionId => {
      // Check if this is a zone selection with quantity
      if (selectionId.includes('_qty_')) {
        const [zoneId, , quantityStr] = selectionId.split('_qty_');
        const quantity = parseInt(quantityStr, 10);
        const zoneItem = venueLayout.items.find(item => item.id === zoneId);
        
        if (zoneItem) {
          // Add the zone item multiple times based on quantity
          for (let i = 0; i < quantity; i++) {
            selectedItems.push(zoneItem);
          }
        }
      } else {
        // Regular seat
        const item = venueLayout.items.find(item => item.id === selectionId);
        if (item) {
          selectedItems.push(item);
        }
      }
    });
    
    onSelectSeats(selectedItems);
  };

  // Prepare items with booking status
  const itemsWithStatus = venueLayout?.items.map(item => ({
    ...item,
    isBooked: bookedSeats.includes(item.id)
  })) || [];

  // Calculate selected items for display
  const getSelectedItemsForDisplay = () => {
    const items: Array<VenueItem & { quantity?: number }> = [];
    
    selectedSeats.forEach(selectionId => {
      if (selectionId.includes('_qty_')) {
        // Zone with quantity
        const [zoneId, , quantityStr] = selectionId.split('_qty_');
        const quantity = parseInt(quantityStr, 10);
        const zoneItem = itemsWithStatus.find(item => item.id === zoneId);
        
        if (zoneItem) {
          items.push({ ...zoneItem, quantity });
        }
      } else {
        // Regular seat
        const item = itemsWithStatus.find(item => item.id === selectionId);
        if (item) {
          items.push(item);
        }
      }
    });
    
    return items;
  };

  const selectedItemsDisplay = getSelectedItemsForDisplay();
  const totalPrice = selectedItemsDisplay.reduce((sum, item) => {
    const price = item.price || ticketPrice;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);
  const totalQuantity = selectedItemsDisplay.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold">Select Your Seats</h2>
            <p className="text-sm text-slate-400">Click on available seats to select them</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Venue Map */}
          <div className="flex-1 overflow-auto bg-slate-950 p-8 relative">
            {/* Zoom Controls */}
            {!isLoading && venueLayout && (
              <div className="absolute top-4 right-4 z-10 bg-slate-800 rounded-lg shadow-lg p-2 space-y-2">
                <button
                  onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-white flex items-center justify-center"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white flex items-center justify-center"
                  title="Reset zoom"
                >
                  100%
                </button>
                <button
                  onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-white flex items-center justify-center"
                  title="Zoom out"
                >
                  −
                </button>
              </div>
            )}
            <div className="w-full h-full flex justify-center items-center">
            {isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-slate-400">Loading venue map...</p>
              </div>
            ) : !venueLayout ? (
              <div className="text-center">
                <p className="text-red-400 mb-2">Failed to load venue layout</p>
                <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="relative shadow-2xl rounded-xl bg-white border border-slate-700" style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}>
                <svg
                  width={venueLayout.canvasWidth || venueLayout.canvas_width || 800}
                  height={venueLayout.canvasHeight || venueLayout.canvas_height || 600}
                  className="block"
                  style={{ maxWidth: '100%', height: 'auto' }}
                >
                  {(venueLayout.backgroundImage || venueLayout.background_image) && (
                    <image 
                      href={venueLayout.backgroundImage || venueLayout.background_image} 
                      width={venueLayout.canvasWidth || venueLayout.canvas_width || 800} 
                      height={venueLayout.canvasHeight || venueLayout.canvas_height || 600} 
                      preserveAspectRatio="xMidYMid slice"
                      style={{ opacity: 0.3 }}
                    />
                  )}

                  {itemsWithStatus.map(item => (
                    <g key={item.id} style={{ cursor: item.type === 'stage' || item.isBooked ? 'default' : 'pointer' }}>
                      <LayoutItem 
                        item={item}
                        isAttendeeMode={true}
                        onBook={(id) => handleSeatClick(item)}
                        isAddingToCart={selectedSeats.includes(item.id)}
                        onSelect={() => {}}
                      />
                    </g>
                  ))}
                </svg>
              </div>
            )}
            </div>
          </div>

          {/* Sidebar - Selection Cart */}
          <div className="w-80 border-l border-slate-800 bg-slate-900 p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4">Your Selection</h3>

            {/* Legend */}
            <div className="space-y-2 mb-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                <span className="text-slate-400">Available</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600"></div>
                <span className="text-slate-400">Selected</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                <span className="text-slate-400">Booked</span>
              </div>
            </div>

            {/* Selected Seats List */}
            <div className="flex-1 overflow-auto space-y-3 mb-6">
              {selectedItemsDisplay.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No seats selected yet</p>
                  <p className="text-slate-600 text-xs mt-1">Click on seats or zones to add them</p>
                </div>
              ) : (
                selectedItemsDisplay.map((item) => {
                  // Find the actual selection ID for this item
                  let selectionId: string;
                  if (item.quantity && item.quantity > 1) {
                    // Zone with quantity
                    selectionId = `${item.id}_qty_${item.quantity}`;
                  } else {
                    // Regular seat or zone with qty 1
                    selectionId = selectedSeats.find(id => 
                      id === item.id || id.startsWith(`${item.id}_qty_`)
                    ) || item.id;
                  }
                  
                  const itemQuantity = item.quantity || 1;
                  const itemPrice = item.price || ticketPrice;
                  
                  return (
                    <div key={selectionId} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex-1">
                        <div className="font-bold text-sm">{item.name}</div>
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-tight">
                          {item.type === 'seat' && item.seatNumber && `Seat #${item.seatNumber}`}
                          {item.type === 'zone' && (
                            <>
                              Zone • {itemQuantity} spot{itemQuantity > 1 ? 's' : ''}
                              {item.capacity && ` (${(item.capacity || 0) - (item.bookedCount || 0)} available)`}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-400">
                          €{(itemPrice * itemQuantity).toFixed(2)}
                          {itemQuantity > 1 && <span className="text-xs text-slate-500 ml-1">(€{itemPrice} × {itemQuantity})</span>}
                        </span>
                        <button
                          onClick={() => setSelectedSeats(prev => prev.filter(id => id !== selectionId))}
                          className="p-1 hover:bg-red-600/20 rounded text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Checkout Summary */}
            {selectedItemsDisplay.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Total Tickets</span>
                  <span className="text-xl font-black">{totalQuantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Total Price</span>
                  <span className="text-2xl font-black text-indigo-400">€{totalPrice.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleConfirmSelection}
                  className="w-full bg-indigo-600 text-white rounded-xl py-4 font-bold hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirm Selection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueSeatSelector;
