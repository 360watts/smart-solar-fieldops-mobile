import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fetchSiteTelemetry, fetchSiteAlerts } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { toISTDateString, startOfTodayISTIso, formatRelativeTime } from '../../utils/time';
import { EnergyFlowBlock } from '../../components/EnergyFlowBlock';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:        '#080C10',
  surface:   '#0F1923',
  surface2:  '#131E2B',
  border:    'rgba(255,255,255,0.06)',
  line:      '#1A2535',
  text:      '#F0F4F8',
  muted:     '#6B7A8D',
  dim:       '#3D4D5C',
  green:     '#00C853',
  amber:     '#FFA726',
  blue:      '#4B9EFF',
  purple:    '#AB7EFF',
  red:       '#FF4D4D',
  greenSoft: 'rgba(0,200,83,0.10)',
  amberSoft: 'rgba(255,167,38,0.10)',
  blueSoft:  'rgba(75,158,255,0.10)',
  purpleSoft:'rgba(171,126,255,0.10)',
  redSoft:   'rgba(255,77,77,0.10)',
};

// ── Field extraction ───────────────────────────────────────────────────────
function extractMetrics(row: Record<string, any>) {
  const pvKw = (
    Number(row.pv1_power_w ?? 0) +
    Number(row.pv2_power_w ?? 0) +
    Number(row.pv3_power_w ?? 0) +
    Number(row.pv4_power_w ?? 0)
  ) / 1000;

  const loadKw = Number(row.load_power_w ?? 0) / 1000;
  const gridKw = Number(row.grid_power_w ?? 0) / 1000;
  const battKw = Number(row.battery_power_w ?? 0) / 1000;
  const rawSoc = row.battery_soc_percent ?? row.battery_soc ?? null;
  const battSoc: number | null =
    rawSoc != null && Number(rawSoc) > 0 ? Number(rawSoc) : null;

  return { pvKw, loadKw, gridKw, battKw, battSoc };
}

function ageMinutes(ts?: string): number | null {
  if (!ts) return null;
  return (Date.now() - new Date(ts).getTime()) / 60_000;
}

// ── Status strip (3 px top accent) ────────────────────────────────────────
type LiveStatus = 'live' | 'stale' | 'cloud' | 'offline' | 'loading';

function statusColor(s: LiveStatus) {
  if (s === 'live')    return C.green;
  if (s === 'cloud')   return C.blue;
  if (s === 'stale')   return C.amber;
  if (s === 'offline') return C.red;
  return 'transparent';
}

function StatusStrip({ status }: { status: LiveStatus }) {
  return <View style={[styles.strip, { backgroundColor: statusColor(status) }]} />;
}

// ── Site header ────────────────────────────────────────────────────────────
function SiteHeader() {
  const { activeSite, clearSite } = useSite();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerLabel}>ACTIVE SITE</Text>
        <Text style={styles.headerName} numberOfLines={1}>
          {activeSite?.display_name ?? '—'}
        </Text>
      </View>
      <Pressable
        style={styles.switchBtn}
        onPress={async () => { await clearSite(); navigation.navigate('Worksites'); }}
        hitSlop={10}
      >
        <Ionicons name="swap-horizontal" size={13} color={C.green} />
        <Text style={styles.switchLabel}>Switch</Text>
      </Pressable>
    </View>
  );
}

// ── Metric card — left accent bar, large number, uppercase label ───────────
function MetricCard({
  value, unit, label, accent,
}: {
  value: string; unit: string; label: string; accent: string;
}) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: accent }]}>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}


// ── Inline alert row ────────────────────────────────────────────────────────
function AlertRow({ msg, severity }: { msg: string; severity: string }) {
  const dot = severity === 'critical' ? C.red : severity === 'warning' ? C.amber : C.blue;
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertDot, { backgroundColor: dot }]} />
      <Text style={styles.alertMsg} numberOfLines={1}>{msg}</Text>
    </View>
  );
}

// ── Info row (key / value) ─────────────────────────────────────────────────
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const { activeSite } = useSite();
  const queryClient = useQueryClient();

  const today    = toISTDateString(new Date());
  const startISO = startOfTodayISTIso();
  const endISO   = new Date().toISOString();

  const {
    data: telemetry,
    isLoading: telLoading,
    isRefetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['telemetry', activeSite?.site_id, today],
    queryFn:  () => fetchSiteTelemetry(activeSite!.site_id, { start_date: startISO, end_date: endISO }),
    enabled:  !!activeSite,
    staleTime: 55_000,
    refetchInterval: 60_000,
    retry: 1,
    meta: { persist: false },
  });

  const { data: alerts } = useQuery({
    queryKey: ['siteAlerts', activeSite?.site_id],
    queryFn:  () => fetchSiteAlerts(activeSite!.site_id),
    enabled:  !!activeSite,
    staleTime: 60_000,
    meta: { persist: false },
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['telemetry', activeSite?.site_id] });
    queryClient.invalidateQueries({ queryKey: ['siteAlerts', activeSite?.site_id] });
  }, [queryClient, activeSite]);

  const latest = telemetry && telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const { pvKw, loadKw, gridKw, battKw, battSoc } = latest
    ? extractMetrics(latest)
    : { pvKw: 0, loadKw: 0, gridKw: 0, battKw: 0, battSoc: null };

  const dataSource = latest?.data_source ?? null;
  const age        = ageMinutes(latest?.timestamp);
  const isDeyeCloud = dataSource === 'deye_cloud';
  const hasLiveData = latest != null && (isDeyeCloud ? (age ?? 99) <= 15 : (age ?? 99) <= 30);

  const liveStatus: LiveStatus =
    telLoading         ? 'loading'
    : !hasLiveData && !latest ? 'offline'
    : isDeyeCloud      ? 'cloud'
    : !hasLiveData     ? 'stale'
    : 'live';

  const activeAlerts = alerts?.filter(a => a.status !== 'resolved') ?? [];
  const critCount    = activeAlerts.filter(a => a.severity === 'critical').length;

  function fmt(v: number, d = 1) { return v.toFixed(d); }

  const statusTextMap: Record<LiveStatus, { label: string; color: string }> = {
    live:    { label: 'Live  ·  RS-485',          color: C.green  },
    cloud:   { label: 'Deye Cloud',               color: C.blue   },
    stale:   { label: 'Data stale',               color: C.amber  },
    offline: { label: 'No live data',             color: C.red    },
    loading: { label: 'Loading…',                 color: C.muted  },
  };
  const sts = statusTextMap[liveStatus];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SiteHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={C.green} />
        }
      >
        {/* API error banner */}
        {isError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={14} color={C.red} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Telemetry unavailable</Text>
              <Text style={styles.errorSub} numberOfLines={2}>
                {(error as Error)?.message ?? 'Unknown error'}
              </Text>
            </View>
          </View>
        )}

        {/* Loading */}
        {telLoading && (
          <ActivityIndicator color={C.green} style={{ marginTop: 32 }} />
        )}

        {/* ── Metrics 2×2 grid ────────────────────────────────────────── */}
        {!telLoading && (
          <View style={styles.metricsGrid}>
            <MetricCard
              value={latest ? fmt(pvKw) : '—'}
              unit="kW"
              label="SOLAR"
              accent={C.amber}
            />
            <MetricCard
              value={latest ? fmt(loadKw) : '—'}
              unit="kW"
              label="LOAD"
              accent={C.blue}
            />
            <MetricCard
              value={battSoc != null ? fmt(battSoc, 0) : '—'}
              unit="%"
              label="BATTERY"
              accent={C.purple}
            />
            <MetricCard
              value={latest ? fmt(Math.abs(gridKw)) : '—'}
              unit="kW"
              label={gridKw < 0 ? 'GRID EXPORT' : 'GRID IMPORT'}
              accent={gridKw < 0 ? C.amber : C.red}
            />
          </View>
        )}

        {/* ── Energy flow ─────────────────────────────────────────────── */}
        {hasLiveData && latest && (
          <View style={{ marginBottom: 10 }}>
            <EnergyFlowBlock
              pvKw={pvKw}
              loadKw={loadKw}
              gridKw={gridKw}
              battKw={battKw}
              battSoc={battSoc}
            />
          </View>
        )}

        {/* ── System status card ──────────────────────────────────────── */}
        {!telLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
            <InfoRow
              label="Connection"
              value={sts.label}
              valueColor={sts.color}
            />
            {latest?.timestamp && (
              <InfoRow
                label="Last reading"
                value={formatRelativeTime(latest.timestamp)}
              />
            )}
            <InfoRow
              label="Active alerts"
              value={String(activeAlerts.length)}
              valueColor={critCount > 0 ? C.red : activeAlerts.length > 0 ? C.amber : C.green}
            />
            {isDeyeCloud && (
              <InfoRow label="Source" value="Deye Cloud (RS-485 offline)" valueColor={C.muted} />
            )}
          </View>
        )}

        {/* ── Active alerts ────────────────────────────────────────────── */}
        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ALERTS</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeAlerts.length}</Text>
              </View>
            </View>
            {activeAlerts.slice(0, 4).map(a => (
              <AlertRow key={a.id} msg={a.message} severity={a.severity} />
            ))}
            {activeAlerts.length > 4 && (
              <Text style={styles.moreAlerts}>+{activeAlerts.length - 4} more in Alerts tab</Text>
            )}
          </View>
        )}

        {/* ── No data ─────────────────────────────────────────────────── */}
        {!telLoading && !isError && !latest && (
          <View style={styles.empty}>
            <Ionicons name="radio-outline" size={32} color={C.dim} />
            <Text style={styles.emptyTitle}>No readings today</Text>
            <Text style={styles.emptySub}>
              Device may be offline. Deye Cloud will sync when available.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  strip: { height: 3, width: '100%' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  headerName: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: C.green + '40',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchLabel: { color: C.green, fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.redSoft,
    borderLeftWidth: 3,
    borderLeftColor: C.red,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: { color: C.red, fontSize: 13, fontWeight: '700' },
  errorSub:   { color: C.red + 'aa', fontSize: 11, marginTop: 2, lineHeight: 16 },

  // Metric cards
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: C.surface,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 16,
    gap: 4,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  metricValue:    { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  metricUnit:     { color: C.muted, fontSize: 13, fontWeight: '600', paddingBottom: 3 },
  metricLabel:    { color: C.dim, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginTop: 2 },

  // Section card
  section: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
    gap: 2,
  },
  sectionTitle: {
    color: C.dim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoLabel: { color: C.muted, fontSize: 13 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '600' },

  // Alert rows
  badge: {
    backgroundColor: C.redSoft,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: C.red, fontSize: 11, fontWeight: '800' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  alertDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  alertMsg:  { flex: 1, color: C.text, fontSize: 13, lineHeight: 18 },
  moreAlerts:{ color: C.muted, fontSize: 12, textAlign: 'center', paddingTop: 8 },

  // Empty
  empty:      { alignItems: 'center', paddingVertical: 52, gap: 10 },
  emptyTitle: { color: C.muted, fontSize: 15, fontWeight: '700', marginTop: 6 },
  emptySub:   { color: C.dim, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});
