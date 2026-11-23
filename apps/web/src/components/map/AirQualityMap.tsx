/**
 * Ward-level air quality map.
 * Production: Google Maps JavaScript API with AQI-colored circle overlays.
 * Demo: a deterministic SVG heatmap of Delhi NCR wards — same data, no key.
 */
import { useEffect, useRef, useState } from 'react';
import { CATEGORY_META, categoryOf } from '@vayusense/shared';
import { getMapsLoader, MAP_STYLES } from '../../lib/maps';
import { Badge, Card } from '../ui';

export interface WardCell {
  name: string;
  lat: number;
  lng: number;
  aqi: number;
}

const DELHI_CENTER = { lat: 28.6139, lng: 77.209 };

function GoogleMap({ wards }: { wards: WardCell[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const loader = getMapsLoader();
    const container = containerRef.current;
    if (!loader || !container) return;

    let cancelled = false;
    let map: google.maps.Map | null = null;
    const circles: google.maps.Circle[] = [];

    loader
      .importLibrary('maps')
      .then((library) => {
        if (cancelled || !containerRef.current) return;
        const { Map, Circle, InfoWindow } = library as typeof google.maps;
        map = new Map(containerRef.current, {
          center: DELHI_CENTER,
          zoom: 11,
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });
        const info = new InfoWindow();

        for (const ward of wards) {
          const color = CATEGORY_META[categoryOf(ward.aqi)].color;
          const circle = new Circle({
            map,
            center: { lat: ward.lat, lng: ward.lng },
            radius: 1700,
            fillColor: color,
            fillOpacity: 0.42,
            strokeWeight: 0,
          });
          circle.addListener('click', () => {
            info.setContent(
              `<div style="color:#0b1220;font-family:Inter,sans-serif"><strong>${ward.name}</strong><br/>AQI ${ward.aqi} · ${CATEGORY_META[categoryOf(ward.aqi)].label}</div>`,
            );
            info.setPosition({ lat: ward.lat, lng: ward.lng });
            info.open({ map });
          });
          circles.push(circle);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (typeof google !== 'undefined') {
        circles.forEach((circle) => google.maps.event.clearInstanceListeners(circle));
        if (map) google.maps.event.clearInstanceListeners(map);
      }
      circles.forEach((circle) => circle.setMap(null));
      map = null;
    };
  }, [wards]);

  if (failed) return <DemoHeatmap wards={wards} />;
  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full rounded-2xl"
      role="application"
      aria-label="Google Map of ward-level air quality"
    />
  );
}

/** Offline SVG heatmap — identical ward data, zero credentials. */
export function DemoHeatmap({ wards }: { wards: WardCell[] }) {
  const x = (lng: number) => 24 + ((lng - 76.9) / 0.48) * 752;
  const y = (lat: number) => 24 + ((28.86 - lat) / 0.44) * 452;

  return (
    <svg
      viewBox="0 0 800 500"
      className="w-full rounded-2xl bg-ink-950"
      role="img"
      aria-label={`Demo heatmap of ${wards.length} Delhi wards, AQI ${Math.min(...wards.map((w) => w.aqi))} to ${Math.max(...wards.map((w) => w.aqi))}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={24 + i * 94} y1={24} x2={24 + i * 94} y2={476} stroke="#16233c" />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`h${i}`} x1={24} y1={24 + i * 90} x2={776} y2={24 + i * 90} stroke="#16233c" />
      ))}
      <path
        d="M 560 24 C 540 140 600 240 560 340 C 540 400 570 450 560 476"
        fill="none"
        stroke="#1f3050"
        strokeWidth="14"
        opacity="0.8"
      />
      <ellipse
        cx="400"
        cy="250"
        rx="250"
        ry="170"
        fill="none"
        stroke="#1f3050"
        strokeDasharray="6 6"
      />

      {wards.map((ward) => {
        const color = CATEGORY_META[categoryOf(ward.aqi)].color;
        return (
          <g key={ward.name}>
            <circle cx={x(ward.lng)} cy={y(ward.lat)} r="30" fill={color} opacity="0.28" />
            <circle cx={x(ward.lng)} cy={y(ward.lat)} r="12" fill={color} opacity="0.85" />
            <text
              x={x(ward.lng)}
              y={y(ward.lat) - 36}
              textAnchor="middle"
              fontSize="12"
              fill="#b6c4d8"
            >
              {ward.name}
            </text>
            <text
              x={x(ward.lng)}
              y={y(ward.lat) + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#0b1220"
            >
              {ward.aqi}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AirQualityMap({ wards }: { wards: WardCell[] }) {
  const live = getMapsLoader() !== null;
  return (
    <Card className="p-3">
      {live ? <GoogleMap wards={wards} /> : <DemoHeatmap wards={wards} />}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1">
        {(['good', 'moderate', 'poor', 'very_poor', 'severe'] as const).map((category) => (
          <Badge key={category} color={CATEGORY_META[category].color}>
            {CATEGORY_META[category].label}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-mist-500">
          {live ? 'Google Maps JavaScript API' : 'Demo heatmap — add a Maps key for the live map'}
        </span>
      </div>
    </Card>
  );
}
