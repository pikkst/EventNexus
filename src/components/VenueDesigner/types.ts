export type ItemType = 'seat' | 'zone' | 'stage';
export type ItemShape = 'rect' | 'circle';

export interface VenueItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shape?: ItemShape;
  name: string;
  price: number;
  isBooked?: boolean;
  rowLabel?: string;
  seatNumber?: number;
  capacity?: number;
  bookedCount?: number;
  color?: string;
}

export interface VenueLayout {
  id?: string;
  event_id?: string;
  name: string;
  items: VenueItem[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string;
  created_at?: string;
  updated_at?: string;
}

export type VenueMode = 'organizer' | 'attendee';
