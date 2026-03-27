import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../theme/theme';
import { fetchSites, fetchDevices } from '../../api/smartSolar';
import type { SiteItem, SiteStatus } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { useAuth } from '../../auth/AuthContext';
import { usePermissions } from '../../auth/usePermissions';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function resolveLifecycleStatus(site: SiteItem): SiteStatus {
  if (site.site_status) return site.site_status;
  if (typeof site.is_active === 'boolean') return site.is_active ? 'active' : 'inactive';
  return site.devices.length > 0 ? 'active' : 'draft';
}

type GatewayState = 'online' | 'offline' | 'no-gateway';

function resolveGatewayState(site: SiteItem): GatewayState {
  if (site.gateway_device != null) {
    return site.gateway_device.is_online ? 'online' : 'offline';
  }
  if (site.devices.length === 0) return 'no-gateway';
  return site.devices.some(d => d.is_online) ? 'online' : 'offline';
}

function LifecycleChip({ status }: { status: SiteStatus }) {
  const cfg: Record<SiteStatus, { color: string; bg: string; label: string }> = {
    active:       { color: AppTheme.colors.success, bg: AppTheme.colors.successSoft, label: 'Active' },
    commissioning:{ color: AppTheme.colors.info,    bg: AppTheme.colors.infoSoft,    label: 'Commissioning' },
    inactive:     { color: AppTheme.colors.danger,  bg: AppTheme.colors.dangerSoft,  label: 'Inactive' },
    draft:        { color: AppTheme.colors.mutedText, bg: AppTheme.colors.card,       label: 'Draft' },
    archived:     { color: AppTheme.colors.mutedText, bg: AppTheme.colors.card,       label: 'Archived' },
  };
  const c = cfg[status];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: c.color }]} />
      <Text style={[styles.chipText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

function GatewayDot({ state }: { state: GatewayState }) {
  const color =
    state === 'online' ? AppTheme.colors.success :
    state === 'offline' ? AppTheme.colors.danger :
    AppTheme.colors.dimText;
  const icon =
    state === 'online' ? 'wifi' :
    state === 'offline' ? 'wifi-outline' :
    'hardware-chip-outline';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as any} size={12} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
        {state === 'no-gateway' ? 'No gateway' : state === 'online' ? 'GW Online' : 'GW Offline'}
      </Text>
    </View>
  );
}

function SiteCard({
  site,
  onPress,
}: {
  site: SiteItem;
  onPress: () => void;
}) {
  const lifecycle = resolveLifecycleStatus(site);
  const gwState = resolveGatewayState(site);
  const onlineCount = site.devices.filter(d => d.is_online).length;

  const accentColor =
    lifecycle === 'active' ? AppTheme.colors.accent :
    lifecycle === 'commissioning' ? AppTheme.colors.info :
    lifecycle === 'inactive' ? AppTheme.colors.danger :
    AppTheme.colors.border;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        { borderLeftColor: accentColor, borderLeftWidth: 3 },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.cardName} numberOfLines={1}>{site.display_name}</Text>
          <Text style={styles.cardId}>{site.site_id}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LifecycleChip status={lifecycle} />
          <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.dimText} />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <GatewayDot state={gwState} />

        <View style={styles.cardStat}>
          <Ionicons name="hardware-chip-outline" size={13} color={AppTheme.colors.mutedText} />
          <Text style={styles.cardStatText}>
            {onlineCount}/{site.devices.length}
            <Text style={styles.cardStatLabel}> devices</Text>
          </Text>
        </View>

        {site.capacity_kw != null && (
          <View style={styles.cardStat}>
            <Ionicons name="flash-outline" size={13} color={AppTheme.colors.mutedText} />
            <Text style={styles.cardStatText}>{site.capacity_kw} kW</Text>
          </View>
        )}
      </View>

      {site.devices.length > 0 && (
        <View style={styles.healthBar}>
          <View
            style={[
              styles.healthBarFill,
              {
                width: `${(onlineCount / site.devices.length) * 100}%` as any,
                backgroundColor: gwState === 'online' ? AppTheme.colors.accent
                  : gwState === 'offline' ? AppTheme.colors.danger
                  : AppTheme.colors.dimText,
              },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

function UnassignedDeviceRow({
  serial,
  model,
  onPress,
}: {
  serial: string;
  model: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.deviceRow, pressed && styles.cardPressed, { borderLeftWidth: 3, borderLeftColor: AppTheme.colors.warning }]}
      onPress={onPress}
    >
      <View style={styles.deviceIconWrap}>
        <Ionicons name="hardware-chip" size={18} color={AppTheme.colors.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.deviceSerial}>{serial}</Text>
        {model ? <Text style={styles.deviceModel}>{model}</Text> : null}
      </View>
      <View style={styles.awaitingBadge}>
        <Text style={styles.awaitingBadgeText}>Awaiting setup</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={AppTheme.colors.dimText} style={{ marginLeft: 4 }} />
    </Pressable>
  );
}

export function WorksitesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { selectSite } = useSite();
  const { logout } = useAuth();
  const { canCommission, canViewUnassigned } = usePermissions();

  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: sites = [], isLoading: sitesLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sites', { includeInactive }],
    queryFn: () => fetchSites(includeInactive ? { includeInactive: true } : undefined),
    staleTime: 60_000,
  });

  const { data: devicesData, refetch: refetchDevices } = useQuery({
    queryKey: ['devices', { page: 1, pageSize: 50 }],
    queryFn: () => fetchDevices({ page: 1, pageSize: 50 }),
    // Devices assignments change during commissioning; avoid showing cached "unassigned" state.
    staleTime: 0,
    refetchOnMount: true,
  });

  // Extra safety: always refetch the unassigned list when this screen mounts.
  useEffect(() => {
    refetchDevices();
  }, [refetchDevices]);

  const allDevices: any[] = devicesData?.results ?? [];
  const unassignedDevices = useMemo(
    () =>
      allDevices.filter((d: any) => {
        const userVal = d.user;
        const hasUser = userVal != null && String(userVal).trim().length > 0;

        const siteVal = d.site_id ?? d.site;
        const hasSite = siteVal != null && String(siteVal).trim().length > 0;

        return !hasUser && !hasSite;
      }),
    [allDevices]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sites;
    const q = search.toLowerCase();
    return sites.filter(
      s =>
        s.display_name.toLowerCase().includes(q) ||
        s.site_id.toLowerCase().includes(q)
    );
  }, [sites, search]);

  const recentSites = filtered.slice(0, 3);
  const allSites = filtered.slice(3);

  async function handleEnterSite(site: SiteItem) {
    await selectSite({
      site_id: site.site_id,
      display_name: site.display_name,
    });
    navigation.navigate('SiteOps');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Worksites</Text>
          <Text style={styles.headerSub}>
            {sitesLoading ? 'Loading…' : `${sites.length} site${sites.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={AppTheme.colors.mutedText} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={AppTheme.colors.dimText} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sites…"
          placeholderTextColor={AppTheme.colors.dimText}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={AppTheme.colors.dimText} />
          </Pressable>
        )}
      </View>

      {/* Include inactive toggle — staff/admin only */}
      {canCommission && (
        <Pressable
          style={styles.inactiveToggle}
          onPress={() => setIncludeInactive(v => !v)}
          hitSlop={8}
        >
          <View style={[styles.inactiveToggleBox, includeInactive && styles.inactiveToggleBoxOn]}>
            {includeInactive && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={styles.inactiveToggleText}>Show inactive &amp; archived</Text>
        </Pressable>
      )}

      {/* Commission CTA — staff/admin only */}
      {canCommission && (
        <Pressable
          style={({ pressed }) => [styles.commissionBtn, pressed && { opacity: 0.88 }]}
          onPress={() => navigation.navigate('Commissioning')}
        >
          <LinearGradient
            colors={['#00D95F', '#00A63E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.commissionBtnGradient}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.commissionBtnText}>Commission New Site</Text>
          </LinearGradient>
        </Pressable>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={AppTheme.colors.accent}
          />
        }
      >
        {sitesLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <ActivityIndicator color={AppTheme.colors.accent} />
            <Text style={{ color: AppTheme.colors.dimText, fontSize: 13 }}>Loading sites…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="business-outline" size={32} color={AppTheme.colors.dimText} />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? 'No sites match your search' : 'No sites yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {search
                ? 'Try a different name or site ID'
                : 'Commission your first site to get started'}
            </Text>
          </View>
        ) : (
          <>
            {recentSites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {search ? 'Results' : 'Recent'}
                </Text>
                {recentSites.map(s => (
                  <SiteCard key={s.site_id} site={s} onPress={() => handleEnterSite(s)} />
                ))}
              </View>
            )}

            {!search && allSites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Sites</Text>
                {allSites.map(s => (
                  <SiteCard key={s.site_id} site={s} onPress={() => handleEnterSite(s)} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Unassigned devices — staff/admin only */}
        {canViewUnassigned && unassignedDevices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Provisioned — Awaiting Setup</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{unassignedDevices.length}</Text>
              </View>
            </View>
            <View style={styles.pendingCard}>
              {unassignedDevices.map((d: any) => (
                <UnassignedDeviceRow
                  key={d.id}
                  serial={d.device_serial}
                  model={d.model}
                  onPress={() => navigation.navigate('Commissioning')}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppTheme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: AppTheme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: { },
  searchInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  commissionBtn: {
    borderRadius: AppTheme.radii.md,
    marginHorizontal: 20,
    marginBottom: 20,
    height: 48,
    overflow: 'hidden',
    shadowColor: AppTheme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  commissionBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: AppTheme.radii.md,
    height: 48,
  },
  commissionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pendingBadge: {
    backgroundColor: AppTheme.colors.warningSoft,
    borderRadius: 99,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: AppTheme.colors.warning,
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    marginBottom: 10,
  },
  cardPressed: {
    backgroundColor: AppTheme.colors.cardElevated,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardName: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardId: {
    color: AppTheme.colors.dimText,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.borderMuted,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cardStatLabel: {
    color: AppTheme.colors.mutedText,
    fontWeight: '400',
  },
  healthBar: {
    height: 3,
    backgroundColor: AppTheme.colors.borderMuted,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: 3,
    borderRadius: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppTheme.radii.full,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inactiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  inactiveToggleBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveToggleBoxOn: {
    backgroundColor: AppTheme.colors.accent,
    borderColor: AppTheme.colors.accent,
  },
  inactiveToggleText: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    fontWeight: '500',
  },
  pendingCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  deviceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: AppTheme.colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSerial: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  deviceModel: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  awaitingBadge: {
    backgroundColor: AppTheme.colors.warningSoft,
    borderRadius: AppTheme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  awaitingBadgeText: {
    color: AppTheme.colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyBody: {
    color: AppTheme.colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
