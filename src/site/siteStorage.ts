import * as SecureStore from 'expo-secure-store';

const ACTIVE_SITE_KEY = 'activeSite';

export type ActiveSite = {
  site_id: string;
  display_name: string;
};

export async function getActiveSite(): Promise<ActiveSite | null> {
  const raw = await SecureStore.getItemAsync(ACTIVE_SITE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Migrate legacy shape { siteId, siteName } → { site_id, display_name }
    if (parsed.siteId && !parsed.site_id) {
      return { site_id: parsed.siteId, display_name: parsed.siteName ?? parsed.siteId };
    }
    return parsed as ActiveSite;
  } catch {
    return null;
  }
}

export async function setActiveSite(site: ActiveSite) {
  await SecureStore.setItemAsync(ACTIVE_SITE_KEY, JSON.stringify(site));
}

export async function clearActiveSite() {
  await SecureStore.deleteItemAsync(ACTIVE_SITE_KEY);
}
