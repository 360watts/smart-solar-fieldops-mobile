import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../theme/theme';
import { fetchSiteTelemetry, fetchSiteAlerts, fetchSiteWeather } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { toISTDateString, startOfTodayISTIso, formatRelativeTime } from '../../utils/time';
import { EnergyFlowBlock } from '../../components/EnergyFlowBlock';
import { WeatherHourlyStrip } from '../../components/WeatherHourlyStrip';
import { VictoryChart, VictoryArea, VictoryLine, VictoryAxis } from 'victory-native';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Field extraction ───────────────────────────────────────────────────────
function extractMetrics(row: Record<string, any>) {
  const pvKw = (
    Number(row.pv1_power_w ?? 0) +
    Number(row.pv2_power_w ?? 0) +
    Number(row.pv3_power_w ?? 0) +
    Number(row.pv4_power_w ?? 0)
  ) / 1000;

  const loadKw  = Number(row.load_power_w    ?? 0) / 1000;
  const gridKw  = Number(row.grid_power_w    ?? 0) / 1000;
  const battKw  = Number(row.battery_power_w ?? 0) / 1000;
  const rawSoc  = row.battery_soc_percent ?? row.battery_soc ?? null;
  const battSoc: number | null =
    rawSoc != null && Number(rawSoc) > 0 ? Number(rawSoc) : null;

  return { pvKw, loadKw, gridKw, battKw, battSoc };
}

function ageMinutes(ts?: string): number | null {
  if (!ts) return null;
  return (Date.now() - new Date(ts).getTime()) / 60_000;
}

// ── Status strip ───────────────────────────────────────────────────────────
type LiveStatus = 'live' | 'stale' | 'cloud' | 'offline' | 'loading';

function statusColor(s: LiveStatus) {
  if (s === 'live')    return AppTheme.colors.accent;
  if (s === 'cloud')   return AppTheme.colors.info;
  if (s === 'stale')   return AppTheme.colors.warning;
  if (s === 'offline') return AppTheme.colors.danger;
  return 'transparent';
}

function StatusStrip({ status }: { status: LiveStatus }) {
  return <View style={[styles.strip, { backgroundColor: statusColor(status) }]} />;
}

// ── Site header ────────────────────────────────────────────────────────────
function SiteHeader({ liveStatus }: { liveStatus: LiveStatus }) {
  const { activeSite, clearSite } = useSite();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.header}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: statusColor(liveStatus),
            flexShrink: 0,
          }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerLabel}>ACTIVE SITE</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {activeSite?.display_name ?? '—'}
          </Text>
        </View>
      </View>
      <Pressable
        style={styles.switchBtn}
        onPress={async () => { await clearSite(); navigation.navigate('Worksites'); }}
        hitSlop={10}
      >
        <Ionicons name="swap-horizontal" size={13} color={AppTheme.colors.accent} />
        <Text style={styles.switchLabel}>Switch</Text>
      </Pressable>
    </View>
  );
}

// ── Metric card — bottom accent bar, large number ─────────────────────────
function MetricCard({
  value, unit, label, accent,
}: {
  value: string; unit: string; label: string; accent: string;
}) {
  return (
    <View style={[styles.metricCard, { borderBottomColor: accent }]}>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ── Alert row — severity tag + message ────────────────────────────────────
function AlertRow({ msg, severity }: { msg: string; severity: string }) {
  const dot =
    severity === 'critical' ? AppTheme.colors.danger
    : severity === 'warning' ? AppTheme.colors.warning
    : AppTheme.colors.info;
  const tag =
    severity === 'critical' ? 'CRIT'
    : severity === 'warning' ? 'WARN'
    : 'INFO';
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertDot, { backgroundColor: dot }]} />
      <Text style={[styles.alertTag, { color: dot }]}>{tag}</Text>
      <Text style={styles.alertMsg} numberOfLines={1}>{msg}</Text>
    </View>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

// ── Energy breakdown ──────────────────────────────────────────────────────
function EnergyBreakdownSection({ latest }: { latest: Record<string, any> | null }) {
  if (!latest) return null;

  const gen  = latest.pv_energy_today_kwh   ?? latest.daily_pv_kwh         ?? null;
  const cons = latest.load_energy_today_kwh  ?? latest.daily_load_kwh        ?? null;
  const bChg = latest.battery_charge_today_kwh    ?? latest.daily_bat_charge_kwh    ?? null;
  const bDis = latest.battery_discharge_today_kwh ?? latest.daily_bat_discharge_kwh ?? null;
  const exp  = latest.grid_export_today_kwh  ?? latest.daily_grid_export_kwh ?? null;

  const selfSuff = (gen != null && exp != null && Number(gen) > 0)
    ? Math.round(((Number(gen) - Number(exp)) / Number(gen)) * 100)
    : null;

  const items = [
    { label: 'Generated',    val: gen,      unit: 'kWh', color: AppTheme.colors.pvColor },
    { label: 'Consumed',     val: cons,     unit: 'kWh', color: AppTheme.colors.loadColor },
    { label: 'Self-suff.',   val: selfSuff, unit: '%',   color: AppTheme.colors.accent },
    { label: 'Bat. Charged', val: bChg,     unit: 'kWh', color: AppTheme.colors.battColor },
    { label: 'Bat. Dischg.', val: bDis,     unit: 'kWh', color: AppTheme.colors.warning },
    { label: 'Exported',     val: exp,      unit: 'kWh', color: AppTheme.colors.gridColor },
  ];

  if (!items.some(i => i.val != null)) return null;

  return (
    <View style={{
      backgroundColor: AppTheme.colors.surface,
      borderRadius: AppTheme.radii.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
      borderTopWidth: 3,
      borderTopColor: AppTheme.colors.borderAccent,
      paddingHorizontal: 18,
      paddingVertical: 16,
      marginBottom: 10,
    }}>
      <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
        TODAY'S ENERGY
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map(item => (
          <View key={item.label} style={{
            flex: 1,
            minWidth: '30%',
            backgroundColor: AppTheme.colors.card,
            borderRadius: AppTheme.radii.sm,
            borderWidth: 1,
            borderColor: AppTheme.colors.border,
            borderBottomWidth: 2,
            borderBottomColor: item.color,
            padding: 10,
            alignItems: 'center',
          }}>
            <Text style={{ color: AppTheme.colors.text, fontSize: 16, fontWeight: '800' }}>
              {item.val != null ? Number(item.val).toFixed(item.unit === '%' ? 0 : 1) : '—'}
            </Text>
            <Text style={{ color: item.color, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>
              {item.unit}
            </Text>
            <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Site info chips ────────────────────────────────────────────────────────
function SiteInfoChips({ site }: { site: any }) {
  const localTime = (() => {
    try {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true });
    } catch { return null; }
  })();

  const chips = [
    site.capacity_kw          != null ? { label: 'Capacity',  val: `${site.capacity_kw} kWp` }                           : null,
    site.inverter_capacity_kw != null ? { label: 'Inverter',  val: `${site.inverter_capacity_kw} kW` }                   : null,
    (site.latitude != null && site.longitude != null)
      ? { label: 'Location', val: `${Number(site.latitude).toFixed(4)}, ${Number(site.longitude).toFixed(4)}` }          : null,
    site.timezone  ? { label: 'Timezone', val: site.timezone }                                                            : null,
    localTime      ? { label: 'IST',      val: localTime }                                                                : null,
  ].filter(Boolean) as { label: string; val: string }[];

  if (chips.length === 0) return null;

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 2 }}>
        SITE INFO
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
        {chips.map(chip => (
          <View key={chip.label} style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: AppTheme.colors.cardElevated,
            borderRadius: AppTheme.radii.full,
            borderWidth: 1,
            borderColor: AppTheme.colors.border,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}>
            <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }}>
              {chip.label.toUpperCase()}
            </Text>
            <Text style={{ color: AppTheme.colors.text, fontSize: 12, fontWeight: '600' }}>
              {chip.val}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Weather card ───────────────────────────────────────────────────────────
function WeatherCard({ current, hourly }: { current: any | null; hourly: any[] }) {
  if (!current && (!hourly || hourly.length === 0)) return null;
  const temp  = current?.temperature_c != null ? `${Number(current.temperature_c).toFixed(1)}°C` : null;
  const humid = current?.humidity_pct  != null ? `${Math.round(current.humidity_pct)}%` : null;
  const wind  = current?.wind_speed_ms != null ? `${Number(current.wind_speed_ms).toFixed(1)} m/s` : null;
  const ghi   = current?.ghi_wm2       != null ? `${Math.round(current.ghi_wm2)} W/m²` : null;

  return (
    <View style={{ marginBottom: 10 }}>
      {current && (temp || humid || wind || ghi) && (
        <View style={{
          backgroundColor: AppTheme.colors.surface,
          borderRadius: AppTheme.radii.md,
          borderWidth: 1,
          borderColor: AppTheme.colors.border,
          borderTopWidth: 3,
          borderTopColor: AppTheme.colors.borderAccent,
          paddingHorizontal: 18,
          paddingVertical: 14,
          marginBottom: 8,
        }}>
          <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            WEATHER
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { icon: 'thermometer-outline', label: 'Temp',     val: temp  },
              { icon: 'water-outline',       label: 'Humidity', val: humid },
              { icon: 'flag-outline',        label: 'Wind',     val: wind  },
              { icon: 'sunny-outline',       label: 'GHI',      val: ghi   },
            ].filter(m => m.val).map(m => (
              <View key={m.label} style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: AppTheme.colors.card,
                borderRadius: AppTheme.radii.sm,
                borderWidth: 1,
                borderColor: AppTheme.colors.border,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}>
                <Ionicons name={m.icon as any} size={13} color={AppTheme.colors.mutedText} />
                <Text style={{ color: AppTheme.colors.mutedText, fontSize: 11 }}>{m.label}</Text>
                <Text style={{ color: AppTheme.colors.text, fontSize: 12, fontWeight: '700' }}>{m.val}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {hourly && hourly.length > 0 && <WeatherHourlyStrip hourly={hourly} />}
    </View>
  );
}

// ── Mini PV+Load chart ─────────────────────────────────────────────────────
function MiniPVChart({ telemetry }: { telemetry: Record<string, any>[] }) {
  const { width } = useWindowDimensions();

  const data = useMemo(() => {
    return telemetry
      .filter(row => row.timestamp)
      .map(row => {
        const pvKw = (
          Number(row.pv1_power_w ?? 0) +
          Number(row.pv2_power_w ?? 0) +
          Number(row.pv3_power_w ?? 0) +
          Number(row.pv4_power_w ?? 0)
        ) / 1000;
        return {
          x: new Date(row.timestamp).getTime(),
          pv: pvKw,
          load: Number(row.load_power_w ?? 0) / 1000,
        };
      })
      .filter(d => Number.isFinite(d.x) && d.x > 0);
  }, [telemetry]);

  if (data.length < 2) return null;

  const pvData   = data.map(d => ({ x: d.x, y: d.pv }));
  const loadData = data.map(d => ({ x: d.x, y: d.load }));
  const maxY     = Math.max(...data.map(d => Math.max(d.pv, d.load)), 0.5);
  const chartW   = Math.max(280, width - 32);

  return (
    <View style={{
      backgroundColor: AppTheme.colors.surface,
      borderRadius: AppTheme.radii.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
      borderTopWidth: 3,
      borderTopColor: AppTheme.colors.borderAccent,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 18, paddingTop: 14, marginBottom: 4 }}>
        TODAY'S GENERATION
      </Text>
      <VictoryChart
        width={chartW}
        height={160}
        padding={{ top: 8, bottom: 28, left: 36, right: 12 }}
        domain={{ y: [0, maxY * 1.15] }}
      >
        <VictoryArea
          data={pvData}
          style={{ data: { fill: AppTheme.colors.pvColor + '26', stroke: AppTheme.colors.pvColor, strokeWidth: 2 } }}
          interpolation="monotoneX"
        />
        <VictoryLine
          data={loadData}
          style={{ data: { stroke: AppTheme.colors.loadColor, strokeWidth: 1.5, strokeDasharray: '4,3' } }}
          interpolation="monotoneX"
        />
        <VictoryAxis
          style={{
            axis: { stroke: AppTheme.colors.border },
            tickLabels: { fill: AppTheme.colors.dimText, fontSize: 9 },
            grid: { stroke: 'transparent' },
          }}
          tickCount={4}
          tickFormat={(x: any) => {
            const d = new Date(x);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: 'transparent' },
            tickLabels: { fill: AppTheme.colors.dimText, fontSize: 9 },
            grid: { stroke: AppTheme.colors.borderMuted },
          }}
          tickFormat={(y: any) => `${Number(y).toFixed(1)}`}
        />
      </VictoryChart>
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingBottom: 12 }}>
        {[
          { color: AppTheme.colors.pvColor,   label: 'Solar' },
          { color: AppTheme.colors.loadColor, label: 'Load'  },
        ].map(s => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: s.color }} />
            <Text style={{ color: AppTheme.colors.dimText, fontSize: 11 }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export function OverviewScreen() {
  const insets       = useSafeAreaInsets();
  const { activeSite } = useSite();
  const queryClient  = useQueryClient();

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

  const { data: weatherData } = useQuery({
    queryKey: ['siteWeather', activeSite?.site_id],
    queryFn:  () => fetchSiteWeather(activeSite!.site_id),
    enabled:  !!activeSite,
    staleTime: 10 * 60_000,
    retry: 0,
    meta: { persist: false },
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['telemetry', activeSite?.site_id] });
    queryClient.invalidateQueries({ queryKey: ['siteAlerts', activeSite?.site_id] });
    queryClient.invalidateQueries({ queryKey: ['siteWeather', activeSite?.site_id] });
  }, [queryClient, activeSite]);

  const latest      = telemetry && telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const { pvKw, loadKw, gridKw, battKw, battSoc } = latest
    ? extractMetrics(latest)
    : { pvKw: 0, loadKw: 0, gridKw: 0, battKw: 0, battSoc: null };

  const dataSource  = latest?.data_source ?? null;
  const age         = ageMinutes(latest?.timestamp);
  const isDeyeCloud = dataSource === 'deye_cloud';
  const hasLiveData = latest != null && (isDeyeCloud ? (age ?? 99) <= 15 : (age ?? 99) <= 30);

  const liveStatus: LiveStatus =
    telLoading              ? 'loading'
    : !hasLiveData && !latest ? 'offline'
    : isDeyeCloud           ? 'cloud'
    : !hasLiveData          ? 'stale'
    : 'live';

  const activeAlerts = alerts?.filter(a => a.status !== 'resolved') ?? [];
  const critCount    = activeAlerts.filter(a => a.severity === 'critical').length;

  function fmt(v: number, d = 1) { return v.toFixed(d); }

  const statusTextMap: Record<LiveStatus, { label: string; color: string }> = {
    live:    { label: 'Live  ·  RS-485',  color: AppTheme.colors.accent    },
    cloud:   { label: 'Deye Cloud',       color: AppTheme.colors.info      },
    stale:   { label: 'Data stale',       color: AppTheme.colors.warning   },
    offline: { label: 'No live data',     color: AppTheme.colors.danger    },
    loading: { label: 'Loading…',         color: AppTheme.colors.mutedText },
  };
  const sts = statusTextMap[liveStatus];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* 3 px status accent strip — first visual element */}
      <StatusStrip status={liveStatus} />

      <SiteHeader liveStatus={liveStatus} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={AppTheme.colors.accent}
          />
        }
      >
        {/* Error banner */}
        {isError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={14} color={AppTheme.colors.danger} />
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
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
            <ActivityIndicator color={AppTheme.colors.accent} />
            <Text style={{ color: AppTheme.colors.dimText, fontSize: 13 }}>
              Loading telemetry…
            </Text>
          </View>
        )}

        {/* ── Metrics 2×2 grid ──────────────────────────────────────── */}
        {!telLoading && (
          <View style={styles.metricsGrid}>
            <MetricCard
              value={latest ? fmt(pvKw) : '—'}
              unit="kW"
              label="SOLAR"
              accent={AppTheme.colors.warning}
            />
            <MetricCard
              value={latest ? fmt(loadKw) : '—'}
              unit="kW"
              label="LOAD"
              accent={AppTheme.colors.info}
            />
            <MetricCard
              value={battSoc != null ? fmt(battSoc, 0) : '—'}
              unit="%"
              label="BATTERY"
              accent={AppTheme.colors.purple}
            />
            <MetricCard
              value={latest ? fmt(Math.abs(gridKw)) : '—'}
              unit="kW"
              label={gridKw < 0 ? 'GRID EXPORT' : 'GRID IMPORT'}
              accent={gridKw < 0 ? AppTheme.colors.warning : AppTheme.colors.danger}
            />
          </View>
        )}

        {/* ── Energy flow ───────────────────────────────────────────── */}
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

        {/* ── Weather ───────────────────────────────────────────────── */}
        {(weatherData?.current || (weatherData?.hourly_forecast?.length ?? 0) > 0) && (
          <WeatherCard
            current={weatherData?.current ?? null}
            hourly={weatherData?.hourly_forecast ?? []}
          />
        )}

        {/* ── Today's Energy ─────────────────────────────────────────── */}
        {!telLoading && latest && (
          <EnergyBreakdownSection latest={latest} />
        )}

        {/* ── Mini PV + Load chart ──────────────────────────────────── */}
        {!telLoading && telemetry && telemetry.length >= 2 && (
          <MiniPVChart telemetry={telemetry} />
        )}

        {/* ── System status card ────────────────────────────────────── */}
        {!telLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
            <InfoRow label="Connection" value={sts.label} valueColor={sts.color} />
            {latest?.timestamp && (
              <InfoRow label="Last reading" value={formatRelativeTime(latest.timestamp)} />
            )}
            <InfoRow
              label="Active alerts"
              value={String(activeAlerts.length)}
              valueColor={
                critCount > 0 ? AppTheme.colors.danger
                : activeAlerts.length > 0 ? AppTheme.colors.warning
                : AppTheme.colors.accent
              }
            />
            {isDeyeCloud && (
              <InfoRow
                label="Source"
                value="Deye Cloud (RS-485 offline)"
                valueColor={AppTheme.colors.mutedText}
              />
            )}
          </View>
        )}

        {/* ── Site info chips ──────────────────────────────────────── */}
        {!telLoading && activeSite && (
          <SiteInfoChips site={activeSite} />
        )}

        {/* ── Active alerts preview ─────────────────────────────────── */}
        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ALERTS</Text>
              <View style={[styles.badge, critCount > 0 && styles.badgeCritical]}>
                <Text style={[styles.badgeText, critCount > 0 && styles.badgeTextCritical]}>
                  {activeAlerts.length}
                </Text>
              </View>
            </View>
            {activeAlerts.slice(0, 4).map(a => (
              <AlertRow key={a.id} msg={a.message} severity={a.severity} />
            ))}
            {activeAlerts.length > 4 && (
              <Text style={styles.moreAlerts}>
                +{activeAlerts.length - 4} more — see Alerts tab
              </Text>
            )}
          </View>
        )}

        {/* ── No data ───────────────────────────────────────────────── */}
        {!telLoading && !isError && !latest && (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="radio-outline" size={28} color={AppTheme.colors.dimText} />
            </View>
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

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: AppTheme.colors.bg },
  strip: { height: 3, width: '100%' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerLabel: {
    color: AppTheme.colors.dimText,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  headerName: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderAccent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchLabel: { color: AppTheme.colors.accent, fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: AppTheme.colors.dangerSoft,
    borderLeftWidth: 3,
    borderLeftColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radii.md,
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: { color: AppTheme.colors.danger, fontSize: 13, fontWeight: '700' },
  errorSub:   { color: AppTheme.colors.danger + 'aa', fontSize: 11, marginTop: 2, lineHeight: 16 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: AppTheme.colors.card,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 3,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radii.md,
    padding: 16,
    gap: 4,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  metricValue:    { color: AppTheme.colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  metricUnit:     { color: AppTheme.colors.mutedText, fontSize: 13, fontWeight: '600', paddingBottom: 3 },
  metricLabel:    {
    color: AppTheme.colors.dimText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  section: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderTopWidth: 3,
    borderTopColor: AppTheme.colors.borderAccent,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
    gap: 2,
  },
  sectionTitle: {
    color: AppTheme.colors.dimText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  infoLabel: { color: AppTheme.colors.mutedText, fontSize: 13 },
  infoValue: { color: AppTheme.colors.text, fontSize: 13, fontWeight: '600' },

  badge: {
    backgroundColor: AppTheme.colors.warningSoft,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeCritical:     { backgroundColor: AppTheme.colors.dangerSoft },
  badgeText:         { color: AppTheme.colors.warning, fontSize: 11, fontWeight: '800' },
  badgeTextCritical: { color: AppTheme.colors.danger },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  alertDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  alertTag: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, flexShrink: 0 },
  alertMsg: { flex: 1, color: AppTheme.colors.text, fontSize: 13, lineHeight: 18 },
  moreAlerts: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 10,
    fontWeight: '500',
  },

  empty:       { alignItems: 'center', paddingVertical: 52, gap: 6 },
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
  emptyTitle: { color: AppTheme.colors.mutedText, fontSize: 15, fontWeight: '700' },
  emptySub:   {
    color: AppTheme.colors.dimText,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
