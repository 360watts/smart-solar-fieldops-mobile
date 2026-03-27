import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../theme/theme';
import { fetchDevices, fetchSites } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { formatRelativeTime } from '../../utils/time';
import type { SiteOpsStackParamList } from '../../navigation/SiteOpsNavigator';
import type { Device } from './types';

type Nav = NativeStackNavigationProp<SiteOpsStackParamList>;

type FilterChip = 'All' | 'Online' | 'Offline' | 'Warning';

const FILTER_CHIPS: FilterChip[] = ['All', 'Online', 'Warning', 'Offline'];

type DeviceGroup = 'Offline' | 'Warning' | 'Healthy' | 'Unknown';

function groupDevice(d: any): DeviceGroup {
  if (!d.is_online) return 'Offline';
  return 'Healthy';
}

const GROUP_ORDER: DeviceGroup[] = ['Offline', 'Warning', 'Healthy', 'Unknown'];

const GROUP_CFG: Record<DeviceGroup, { color: string; bg: string; icon: string }> = {
  Offline: { color: AppTheme.colors.danger,  bg: AppTheme.colors.dangerSoft,  icon: 'close-circle' },
  Warning: { color: AppTheme.colors.warning, bg: AppTheme.colors.warningSoft, icon: 'warning' },
  Healthy: { color: AppTheme.colors.success, bg: AppTheme.colors.successSoft, icon: 'checkmark-circle' },
  Unknown: { color: AppTheme.colors.dimText, bg: 'rgba(255,255,255,0.05)',    icon: 'help-circle' },
};

function FilterPill({
  label,
  active,
  count,
  onPress,
}: {
  label: FilterChip;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
          <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

function DeviceRow({ device, onPress }: { device: any; onPress: () => void }) {
  const group = groupDevice(device);
  const cfg = GROUP_CFG[group];

  return (
    <Pressable
      style={({ pressed }) => [styles.deviceRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.deviceIconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name="hardware-chip" size={20} color={cfg.color} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.deviceSerial} numberOfLines={1}>{device.device_serial}</Text>
        <Text style={styles.deviceMeta} numberOfLines={1}>
          {device.model ?? 'Unknown model'}
          {device.hw_id ? ` · ${device.hw_id}` : ''}
        </Text>
      </View>

      <View style={styles.deviceRight}>
        {device.last_heartbeat && (
          <Text style={styles.lastSeen}>
            {formatRelativeTime(device.last_heartbeat)}
          </Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
            {device.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={15} color={AppTheme.colors.dimText} style={{ marginLeft: 8 }} />
    </Pressable>
  );
}

export function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { activeSite } = useSite();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterChip>('All');

  // fetchSites gives us which device IDs belong to this site.
  // fetchDevices gives us full device details (model, hw_id, last_heartbeat, etc).
  // We merge them so each device row has complete info.
  const { data: sitesData, isLoading: sitesLoading, isRefetching, refetch: refetchSites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => fetchSites(),
    staleTime: 60_000,
    enabled: !!activeSite,
  });

  const { data: devicesData, isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ['devices', { page: 1, pageSize: 100 }],
    queryFn: () => fetchDevices({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
    enabled: !!activeSite,
  });

  const isLoading = sitesLoading || devicesLoading;

  const refetch = useCallback(() => {
    refetchSites();
    refetchDevices();
  }, [refetchSites, refetchDevices]);

  const siteDevices: any[] = useMemo(() => {
    const allFull: any[] = devicesData?.results ?? [];

    // Prefer filtering by site_id from full device records (backend now includes it)
    const bySiteId = allFull.filter((d: any) => d.site_id === activeSite?.site_id);
    if (bySiteId.length > 0) return bySiteId;

    // Fallback: cross-reference via sites list (for older backend versions)
    const site = sitesData?.find(s => s.site_id === activeSite?.site_id);
    if (!site) return [];
    const siteDeviceIds = new Set((site.devices ?? []).map((d: any) => d.device_id));
    const fullMap = new Map(allFull.map((d: any) => [d.id, d]));

    return (site.devices ?? []).map((minimal: any) => ({
      ...minimal,
      ...(fullMap.get(minimal.device_id) ?? {}),
      id: minimal.device_id,
    }));
  }, [sitesData, devicesData, activeSite]);

  const filtered = useMemo(() => {
    let result = siteDevices;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d: any) =>
          d.device_serial?.toLowerCase().includes(q) ||
          d.model?.toLowerCase().includes(q)
      );
    }

    if (filter === 'Online') result = result.filter((d: any) => d.is_online);
    if (filter === 'Offline') result = result.filter((d: any) => !d.is_online);

    return result;
  }, [siteDevices, search, filter]);

  const sections = useMemo(() => {
    const groups: Record<DeviceGroup, any[]> = {
      Offline: [], Warning: [], Healthy: [], Unknown: [],
    };
    filtered.forEach((d: any) => groups[groupDevice(d)].push(d));
    return GROUP_ORDER
      .filter(g => groups[g].length > 0)
      .map(g => ({ title: g, data: groups[g] }));
  }, [filtered]);

  const counts = useMemo(() => ({
    All: siteDevices.length,
    Online: siteDevices.filter((d: any) => d.is_online).length,
    Offline: siteDevices.filter((d: any) => !d.is_online).length,
    Warning: 0,
  }), [siteDevices]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Devices</Text>
        <Text style={styles.headerSub}>{activeSite?.display_name}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={AppTheme.colors.dimText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search serial or model…"
          placeholderTextColor={AppTheme.colors.dimText}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={AppTheme.colors.dimText} />
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {FILTER_CHIPS.map(chip => (
          <FilterPill
            key={chip}
            label={chip}
            active={filter === chip}
            count={counts[chip]}
            onPress={() => setFilter(chip)}
          />
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={AppTheme.colors.accent} style={{ marginTop: 40 }} />
      ) : siteDevices.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="hardware-chip-outline" size={32} color={AppTheme.colors.dimText} />
          </View>
          <Text style={styles.emptyTitle}>No devices</Text>
          <Text style={styles.emptySub}>
            This site has no linked devices yet. Commission a device from the Worksites screen.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.device_id ?? item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={AppTheme.colors.accent}
            />
          }
          renderSectionHeader={({ section }) => {
            const cfg = GROUP_CFG[section.title as DeviceGroup];
            return (
              <View style={styles.sectionHeader}>
                <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                <Text style={[styles.sectionHeaderText, { color: cfg.color }]}>
                  {section.title}
                </Text>
                <View style={[styles.sectionCount, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.sectionCountText, { color: cfg.color }]}>
                    {section.data.length}
                  </Text>
                </View>
              </View>
            );
          }}
          renderItem={({ item }) => (
            <DeviceRow
              device={item}
              onPress={() =>
                navigation.navigate('DeviceDetail', {
                  device: {
                    id: item.device_id ?? item.id,
                    device_serial: item.device_serial,
                    user: item.user ?? null,
                    is_online: item.is_online,
                    model: item.model,
                    hw_id: item.hw_id,
                    last_heartbeat: item.last_heartbeat,
                    config_version: item.config_version,
                  } as Device,
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={28} color={AppTheme.colors.dimText} />
              </View>
              <Text style={styles.emptyTitle}>No devices match</Text>
              <Text style={styles.emptySub}>Try a different search or filter</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerTitle: {
    color: AppTheme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: { color: AppTheme.colors.mutedText, fontSize: 13, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 14, paddingVertical: 0 },
  chips: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppTheme.radii.full,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  pillActive: { backgroundColor: AppTheme.colors.accentSoft, borderColor: AppTheme.colors.borderAccent },
  pillText: { color: AppTheme.colors.mutedText, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: AppTheme.colors.accent },
  pillBadge: {
    backgroundColor: AppTheme.colors.border,
    borderRadius: 99,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pillBadgeActive: { backgroundColor: AppTheme.colors.accentGlow },
  pillBadgeText: { color: AppTheme.colors.mutedText, fontSize: 10, fontWeight: '800' },
  pillBadgeTextActive: { color: AppTheme.colors.accent },
  list: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  sectionCount: {
    borderRadius: 99,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sectionCountText: { fontSize: 11, fontWeight: '800' },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deviceSerial: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  deviceMeta: { color: AppTheme.colors.mutedText, fontSize: 12, marginTop: 2 },
  deviceRight: { alignItems: 'flex-end', gap: 4 },
  lastSeen: { color: AppTheme.colors.dimText, fontSize: 11 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: AppTheme.radii.full,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 8 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: AppTheme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
