import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { ActiveSite } from './siteStorage';
import { clearActiveSite, getActiveSite, setActiveSite } from './siteStorage';

type SiteContextType = {
  activeSite: ActiveSite | null;
  loading: boolean;
  selectSite: (site: ActiveSite) => Promise<void>;
  clearSite: () => Promise<void>;
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [activeSite, setActiveSiteState] = useState<ActiveSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getActiveSite();
      setActiveSiteState(stored);
      setLoading(false);
    })();
  }, []);

  const selectSite = useCallback(async (site: ActiveSite) => {
    setActiveSiteState(site);
    await setActiveSite(site);
  }, []);

  const clearSite = useCallback(async () => {
    setActiveSiteState(null);
    await clearActiveSite();
  }, []);

  const value = useMemo<SiteContextType>(
    () => ({
      activeSite,
      loading,
      selectSite,
      clearSite,
    }),
    [activeSite, loading, selectSite, clearSite]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

