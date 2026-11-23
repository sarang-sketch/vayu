/** Air map page: Google Maps overlay + Places search (demo heatmap offline). */
import { useEffect, useRef } from 'react';
import { MapPin, Search } from 'lucide-react';
import { AirQualityMap } from '../components/map/AirQualityMap';
import { Card, SectionTitle } from '../components/ui';
import { getMapsLoader } from '../lib/maps';
import { WARD_CELLS } from '../lib/wards';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/useAppStore';

/** Places Autocomplete search — recenters the dashboard on the chosen place. */
function PlaceSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setCity = useAppStore((s) => s.setCity);
  const setCoords = useAppStore((s) => s.setCoords);

  useEffect(() => {
    const loader = getMapsLoader();
    const input = inputRef.current;
    if (!loader || !input) return;

    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;

    loader
      .importLibrary('places')
      .then((library) => {
        if (cancelled || !inputRef.current) return;
        const { Autocomplete } = library as typeof google.maps.places;
        const autocomplete = new Autocomplete(inputRef.current, {
          fields: ['geometry', 'name'],
          componentRestrictions: { country: 'in' },
        });
        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!location) return;
          setCity(place.name ?? 'Selected place');
          setCoords({ lat: location.lat(), lng: location.lng() });
          track('place_selected', { name: place.name });
        });
      })
      .catch(() => {
        // Search stays disabled when Maps is unavailable.
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [setCity, setCoords]);

  const live = getMapsLoader() !== null;

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        className="input pl-9"
        placeholder={
          live ? 'Search a locality (Google Places)…' : 'Places search — add a Maps key to enable'
        }
        disabled={!live}
        aria-label="Search a locality"
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Neighborhood air map"
        subtitle="Ward-level AQI across Delhi NCR. Smog is hyperlocal — your street can differ from the city average by 100+ points."
        action={<PlaceSearch />}
      />
      <AirQualityMap wards={WARD_CELLS} />
      <Card>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 text-teal-300" aria-hidden="true" />
          <div className="text-sm text-mist-300">
            <p className="font-semibold text-white">How to read this map</p>
            <p className="mt-1 text-mist-500">
              Circle color follows the CPCB category scale. Hotspots near Anand Vihar, Jahangirpuri
              and ITO typically combine traffic, construction dust and overnight inversion. In
              production, overlays are refreshed from the Google Air Quality API every 15 minutes
              and cached in Firestore to protect quota.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
