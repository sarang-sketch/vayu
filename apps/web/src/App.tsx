/** Route table with code-splitting, suspense fallback and error boundary. */
import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Shell } from './components/layout/Shell';
import { Skeleton } from './components/ui';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const IndoorPage = lazy(() => import('./pages/IndoorPage'));
const SwapsPage = lazy(() => import('./pages/SwapsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        <Route element={<Shell />}>
          <Route
            index
            element={
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="assistant"
            element={
              <Suspense fallback={<PageFallback />}>
                <AssistantPage />
              </Suspense>
            }
          />
          <Route
            path="map"
            element={
              <Suspense fallback={<PageFallback />}>
                <MapPage />
              </Suspense>
            }
          />
          <Route
            path="indoor"
            element={
              <Suspense fallback={<PageFallback />}>
                <IndoorPage />
              </Suspense>
            }
          />
          <Route
            path="swaps"
            element={
              <Suspense fallback={<PageFallback />}>
                <SwapsPage />
              </Suspense>
            }
          />
          <Route
            path="community"
            element={
              <Suspense fallback={<PageFallback />}>
                <CommunityPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageFallback />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <div className="py-20 text-center">
                <h1 className="font-display text-2xl font-bold text-white">Page not found</h1>
                <p className="mt-2 text-sm text-mist-500">
                  The air is clearer back on the dashboard.
                </p>
              </div>
            }
          />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
