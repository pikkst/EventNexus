
export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface FreeEvent {
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  category: string;
  is_free: boolean;
  price: number;
  sourceUrl: string;
}

export interface SearchResult {
  city: string;
  events: FreeEvent[];
}

export enum SortOption {
  NAME = 'NAME',
  COUNTRY = 'COUNTRY'
}
