/**
 * MapLocationPicker Component
 * Interactive map for selecting event location with drag-to-place pin
 * Automatically reverse-geocodes coordinates to address
 */

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, RefreshCw } from 'lucide-react';
import { reverseGeocode } from '../services/geocodingService';

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  isLoading?: boolean;
}

// Inner component to access map context
const LocationPickerMap = ({ initialLat = 58.8934, initialLng = 25.9659, onLocationSelect, isLoading }: MapLocationPickerProps) => {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReversing, setIsReversing] = useState(false);

  // Custom draggable marker
  useEffect(() => {
    if (!markerRef.current) return;

    const marker = markerRef.current;
    let dragStartLat = initialLat;
    let dragStartLng = initialLng;

    const handleDragStart = () => {
      setIsDragging(true);
      const latLng = marker.getLatLng();
      dragStartLat = latLng.lat;
      dragStartLng = latLng.lng;
    };

    const handleDragEnd = async () => {
      setIsDragging(false);
      const latLng = marker.getLatLng();
      
      // Reverse geocode to get address
      setIsReversing(true);
      try {
        const result = await reverseGeocode(latLng.lat, latLng.lng);
        onLocationSelect(latLng.lat, latLng.lng, result.address || result.displayName);
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        // Still use coordinates even if reverse geocoding fails
        onLocationSelect(latLng.lat, latLng.lng, '');
      } finally {
        setIsReversing(false);
      }
    };

    marker.on('dragstart', handleDragStart);
    marker.on('dragend', handleDragEnd);

    return () => {
      marker.off('dragstart', handleDragStart);
      marker.off('dragend', handleDragEnd);
    };
  }, [onLocationSelect]);

  // Click to place marker
  useEffect(() => {
    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      if (isDragging || isReversing || isLoading) return;

      const { lat, lng } = e.latlng;
      
      if (markerRef.current) {
        markerRef.current.setLatLng({ lat, lng });
        
        // Reverse geocode
        setIsReversing(true);
        try {
          const result = await reverseGeocode(lat, lng);
          onLocationSelect(lat, lng, result.address || result.displayName);
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          onLocationSelect(lat, lng, '');
        } finally {
          setIsReversing(false);
        }
      }
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [map, onLocationSelect, isDragging, isReversing, isLoading]);

  // Center on marker if initial location provided
  useEffect(() => {
    map.setView([initialLat, initialLng], 13);
  }, [map, initialLat, initialLng]);

  return (
    <Marker
      ref={markerRef}
      position={[initialLat, initialLng]}
      draggable={!isLoading && !isReversing}
      icon={L.divIcon({
        className: 'leaflet-div-icon custom-marker',
        html: `<div class="w-8 h-8 bg-indigo-500 rounded-full border-4 border-white shadow-lg cursor-grab active:cursor-grabbing"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })}
    />
  );
};

export const MapLocationPicker: React.FC<MapLocationPickerProps> = (props) => {
  return (
    <div className="w-full h-80 rounded-lg overflow-hidden shadow-md border border-slate-700">
      <MapContainer center={[props.initialLat || 58.8934, props.initialLng || 25.9659]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <LocationPickerMap {...props} />
      </MapContainer>
    </div>
  );
};
