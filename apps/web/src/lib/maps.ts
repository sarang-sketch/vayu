/**
 * Google Maps Platform loader (Maps JavaScript API + Places library).
 * Returns null in demo mode; callers render the offline heatmap instead.
 */
import { Loader } from '@googlemaps/js-api-loader';
import { env, mapsEnabled } from '../config/env';

let loader: Loader | null = null;

export function getMapsLoader(): Loader | null {
  if (!mapsEnabled) return null;
  if (!loader) {
    loader = new Loader({
      apiKey: env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places'],
    });
  }
  return loader;
}

/** Dark basemap styling consistent with the VayuSense design system. */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#101a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8296b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1220' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f3050' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070c16' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
];
