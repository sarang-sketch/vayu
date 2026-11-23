/** Firebase Remote Config feature flags with typed defaults. */
import { useEffect, useState } from 'react';
import { fetchAndActivate, getAll } from 'firebase/remote-config';
import { remoteConfig } from '../config/firebase';

export interface FeatureFlags {
  enable_heatmap: boolean;
  enable_community: boolean;
  assistant_model: string;
  indoor_diy_featured: boolean;
}

const DEFAULTS: FeatureFlags = {
  enable_heatmap: true,
  enable_community: true,
  assistant_model: 'gemini-2.5-flash',
  indoor_diy_featured: true,
};

export function useRemoteConfig(): { flags: FeatureFlags; source: 'firebase' | 'defaults' } {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [source, setSource] = useState<'firebase' | 'defaults'>('defaults');

  useEffect(() => {
    const rc = remoteConfig;
    if (!rc) return;
    let cancelled = false;
    fetchAndActivate(rc)
      .then(() => {
        if (cancelled) return;
        const values = getAll(rc);
        setFlags({
          enable_heatmap: values.enable_heatmap?.asBoolean() ?? DEFAULTS.enable_heatmap,
          enable_community: values.enable_community?.asBoolean() ?? DEFAULTS.enable_community,
          assistant_model: values.assistant_model?.asString() ?? DEFAULTS.assistant_model,
          indoor_diy_featured:
            values.indoor_diy_featured?.asBoolean() ?? DEFAULTS.indoor_diy_featured,
        });
        setSource('firebase');
      })
      .catch(() => {
        // Keep defaults when offline or unconfigured.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, source };
}
