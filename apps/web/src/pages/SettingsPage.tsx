/** Settings: household profile, Google Sign-In, FCM alerts, service status. */
import { useEffect, useState } from 'react';
import { Bell, BellRing, Languages, LogIn, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { PERSONA_LABELS, type Persona } from '@vayusense/shared';
import { Badge, Button, Card, SectionTitle } from '../components/ui';
import { db, messaging } from '../config/firebase';
import { env, fcmEnabled } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import { api, type HealthReport } from '../lib/api';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/useAppStore';

export default function SettingsPage() {
  const persona = useAppStore((s) => s.persona);
  const setPersona = useAppStore((s) => s.setPersona);
  const city = useAppStore((s) => s.city);
  const setCity = useAppStore((s) => s.setCity);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const { user, demo: authDemo, signIn, signOut } = useAuth();
  const { flags, source: flagSource } = useRemoteConfig();

  const [health, setHealth] = useState<HealthReport | null>(null);
  const [pushState, setPushState] = useState<
    'idle' | 'working' | 'enabled' | 'denied' | 'unavailable'
  >('idle');

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const enablePush = async () => {
    if (!fcmEnabled || !messaging) {
      setPushState('unavailable');
      return;
    }
    setPushState('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState('denied');
        return;
      }
      const token = await getToken(messaging, { vapidKey: env.VITE_FCM_VAPID_KEY });
      if (user && db) {
        await setDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) }, { merge: true });
      }
      setPushState('enabled');
      track('push_enabled', { signedIn: Boolean(user) });
    } catch {
      setPushState('unavailable');
    }
  };

  const clearLocalData = () => {
    useAppStore.persist.clearStorage();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Settings"
        subtitle="Your household profile drives every Gemini recommendation. Data stays on-device unless you sign in."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-base font-semibold text-white">Household profile</h3>
          <label className="mt-3 block text-xs text-mist-500">
            Who are we protecting?
            <select
              className="input mt-1"
              value={persona}
              onChange={(event) => {
                setPersona(event.target.value as Persona);
                track('persona_changed', { persona: event.target.value });
              }}
            >
              {Object.entries(PERSONA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs text-mist-500">
            City
            <input
              className="input mt-1"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={80}
            />
          </label>
          <div className="mt-3">
            <p className="text-xs text-mist-500">Advisory language</p>
            <div className="mt-1 flex gap-2">
              <Button
                variant={locale === 'en' ? 'primary' : 'ghost'}
                onClick={() => setLocale('en')}
                aria-pressed={locale === 'en'}
              >
                English
              </Button>
              <Button
                variant={locale === 'hi' ? 'primary' : 'ghost'}
                onClick={() => setLocale('hi')}
                aria-pressed={locale === 'hi'}
              >
                <Languages className="h-4 w-4" aria-hidden="true" /> हिंदी
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-base font-semibold text-white">Account</h3>
          {authDemo ? (
            <p className="mt-2 text-sm text-mist-500">
              Firebase is not configured — running in demo mode. Add Firebase keys to enable Google
              Sign-In, cloud sync and push alerts.
            </p>
          ) : user ? (
            <div className="mt-3 flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-10 w-10 rounded-full border border-ink-500"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.displayName ?? 'Signed in'}
                </p>
                <p className="truncate text-xs text-mist-500">{user.email}</p>
              </div>
              <Button variant="ghost" className="ml-auto" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-mist-500">
                Sign in to sync routines, keep an impact ledger in Firestore and receive FCM smog
                alerts.
              </p>
              <Button className="mt-3" onClick={() => void signIn()}>
                <LogIn className="h-4 w-4" aria-hidden="true" /> Continue with Google
              </Button>
            </div>
          )}

          <div className="mt-5 border-t border-ink-600/60 pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-teal-300" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-white">Severe smog push alerts</h4>
            </div>
            <p className="mt-1 text-xs text-mist-500">
              Firebase Cloud Messaging notifies you when AQI crosses 400 (checked hourly by Cloud
              Scheduler).
            </p>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => void enablePush()}
              disabled={pushState === 'working' || pushState === 'enabled'}
            >
              <BellRing className="h-4 w-4" aria-hidden="true" />
              {pushState === 'enabled'
                ? 'Alerts enabled'
                : pushState === 'working'
                  ? 'Requesting permission…'
                  : 'Enable alerts'}
            </Button>
            {pushState === 'denied' ? (
              <p className="mt-2 text-xs text-amber-300">
                Notification permission was denied — enable it in browser settings.
              </p>
            ) : null}
            {pushState === 'unavailable' ? (
              <p className="mt-2 text-xs text-mist-500">
                Push unavailable in this environment (demo mode or unsupported browser).
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-300" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-white">Service status</h3>
          </div>
          {health ? (
            <ul className="mt-3 space-y-2">
              {Object.entries(health.services).map(([service, mode]) => (
                <li key={service} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-mist-100">{service}</span>
                  <Badge
                    color={
                      mode === 'demo' || mode === 'lexicon' || mode === 'dictionary'
                        ? '#eab308'
                        : '#22c55e'
                    }
                  >
                    {mode}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-mist-500">
              API unreachable — start the backend with <code>npm run dev:api</code>.
            </p>
          )}
          <p className="mt-3 text-xs text-mist-500">
            Remote Config flags ({flagSource}): heatmap={String(flags.enable_heatmap)}, community=
            {String(flags.enable_community)}, model={flags.assistant_model}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-teal-300" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-white">Data & privacy</h3>
          </div>
          <p className="mt-2 text-sm text-mist-500">
            Profile and swap ledger live in your browser&apos;s localStorage. Analytics events are
            anonymized (IP truncation). Firestore rules scope every document to its owner; civic
            reports are public by design.
          </p>
          <Button variant="danger" className="mt-3" onClick={clearLocalData}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear local data
          </Button>
        </Card>
      </div>
    </div>
  );
}
