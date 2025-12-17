
import { EventNexusEvent } from './types';

export const CATEGORIES = [
  'Concert', 'Festival', 'Workshop', 'Party', 'Conference', 'Meetup', 'Sports'
];

export const MOCK_EVENTS: EventNexusEvent[] = [
  {
    id: 'e1',
    name: 'Midnight Techno RAVE',
    category: 'Party',
    description: 'An underground warehouse party with deep bass and neon lights.',
    date: '2024-11-15',
    time: '23:00',
    location: { lat: 40.7128, lng: -74.0060, address: '78 Industrial Way', city: 'New York' },
    price: 25,
    visibility: 'public',
    organizerId: 'u2',
    imageUrl: 'https://picsum.photos/seed/techno/800/600',
    attendeesCount: 342,
    maxAttendees: 500
  },
  {
    id: 'e2',
    name: 'Gourmet Cooking Workshop',
    category: 'Workshop',
    description: 'Learn to cook authentic Italian pasta from a Michelin star chef.',
    date: '2024-11-20',
    time: '14:00',
    location: { lat: 40.7300, lng: -73.9950, address: '12 Culinary St', city: 'New York' },
    price: 85,
    visibility: 'public',
    organizerId: 'u2',
    imageUrl: 'https://picsum.photos/seed/cook/800/600',
    attendeesCount: 18,
    maxAttendees: 20
  },
  {
    id: 'e3',
    name: 'Private Rooftop Soirée',
    category: 'Party',
    description: 'Exclusive birthday celebration with city views.',
    date: '2024-11-18',
    time: '19:00',
    location: { lat: 40.7580, lng: -73.9855, address: 'Top Floor, Sky Tower', city: 'New York' },
    price: 0,
    visibility: 'private',
    organizerId: 'u3',
    imageUrl: 'https://picsum.photos/seed/rooftop/800/600',
    attendeesCount: 45,
    maxAttendees: 50
  }
];
