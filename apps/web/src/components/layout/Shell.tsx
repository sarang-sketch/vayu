/** App shell: sticky navigation, offline banner, Google-stack footer. */
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  Fan,
  Home,
  MapPin,
  MessageCircle,
  Recycle,
  Settings,
  Users,
  WifiOff,
  Wind,
} from 'lucide-react';
import { cn } from '../ui';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/assistant', label: 'Assistant', icon: MessageCircle },
  { to: '/map', label: 'Air Map', icon: MapPin },
  { to: '/indoor', label: 'Indoor Air', icon: Fan },
  { to: '/swaps', label: 'Swaps', icon: Recycle },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-400/15 px-4 py-2 text-sm text-amber-300"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      Offline — showing cached data via the Workbox service worker.
    </div>
  );
}

export function Shell() {
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header className="sticky top-0 z-40 border-b border-ink-600/50 bg-ink-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="VayuSense home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
              <Wind className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Vayu<span className="text-teal-300">Sense</span>
            </span>
          </NavLink>
          <span className="chip ml-auto hidden sm:inline-flex">
            <Activity className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
            Winter smog mode
          </span>
        </div>
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-teal-500/15 text-teal-300'
                    : 'text-mist-500 hover:bg-ink-700/60 hover:text-mist-100',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-ink-600/50 py-6">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-500">
            Powered by the Google stack
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              'Gemini',
              'Firebase',
              'Google Air Quality API',
              'Maps Platform',
              'Cloud Run',
              'Cloud Natural Language',
              'Cloud Translation',
              'reCAPTCHA Enterprise',
              'Analytics 4',
              'Workbox',
            ].map((tech) => (
              <span key={tech} className="chip">
                {tech}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-mist-500">
            VayuSense is a lifestyle assistant, not a medical device. In emergencies call local
            emergency services. AQI methodology: CPCB National Air Quality Index.
          </p>
        </div>
      </footer>
    </div>
  );
}
