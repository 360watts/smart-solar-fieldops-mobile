# Mobile UI Web-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring OverviewScreen, AlertsScreen, and DevicesScreen to feature parity with the web frontend's mobile views — adding weather, energy breakdown, mini chart, site info chips, KPI summary bars, search, alert bottom sheet, and expandable device rows.

**Architecture:** All new UI is inline sub-components within each screen file (no new files). Data is derived from already-fetched queries; the only new API call is `fetchSiteWeather` added to OverviewScreen. `LayoutAnimation` handles the device row expand/collapse; React Native `Modal` with `animationType="slide"` handles the alert bottom sheet.

**Tech Stack:** React Native, Victory Native, Expo Vector Icons, @tanstack/react-query, React Native's `LayoutAnimation` and `Modal`, existing `AppTheme` tokens, existing `WeatherHourlyStrip` component.

---

## File Map

| File | Changes |
|---|---|
| `src/screens/Overview/OverviewScreen.tsx` | Add weather query; add `WeatherCard`, `EnergyBreakdownSection`, `MiniPVChart`, `SiteInfoChips` sub-components; insert into ScrollView |
| `src/screens/Alerts/AlertsScreen.tsx` | Add `AlertsKpiBar`; add search state + `TextInput`; add `AlertDetailSheet` Modal; wrap AlertCard in Pressable |
| `src/screens/Devices/DevicesScreen.tsx` | Add `DevicesKpiBar`; add `expandedIds` state; add `DeviceExpandPanel`; update `DeviceRow` with chevron toggle |

---

## Task 1: OverviewScreen — Weather Card

**Files:**
- Modify: `src/screens/Overview/OverviewScreen.tsx`

- [ ] **Step 1: Add the weather query and WeatherCard sub-component**

In `OverviewScreen.tsx`, add the following imports at the top:
```tsx
import { ScrollView as RNScrollView } from 'react-native';  // already imported as ScrollView
import { WeatherHourlyStrip } from '../../components/WeatherHourlyStrip';
import { fetchSiteWeather } from '../../api/smartSolar';
```

`fetchSiteWeather` is already in `smartSolar.ts`. `WeatherHourlyStrip` already exists. Just add the import lines.

- [ ] **Step 2: Add the weather useQuery inside OverviewScreen()**

After the existing `alerts` query (around line 178), add:
```tsx
const { data: weatherData } = useQuery({
  queryKey: ['siteWeather', activeSite?.site_id],
  queryFn:  () => fetchSiteWeather(activeSite!.site_id),
  enabled:  !!activeSite,
  staleTime: 10 * 60_000,
  retry: 0,
  meta: { persist: false },
});
```

Also add weather invalidation to the `onRefresh` callback:
```tsx
const onRefresh = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: ['telemetry', activeSite?.site_id] });
  queryClient.invalidateQueries({ queryKey: ['siteAlerts', activeSite?.site_id] });
  queryClient.invalidateQueries({ queryKey: ['siteWeather', activeSite?.site_id] });
}, [queryClient, activeSite]);
```

- [ ] **Step 3: Add the WeatherCard sub-component above OverviewScreen()**

Add this component before the `export function OverviewScreen()` declaration:
```tsx
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
          <Text style={{
            color: AppTheme.colors.dimText,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
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
```

- [ ] **Step 4: Insert WeatherCard into the ScrollView**

In the JSX inside `<ScrollView>`, insert after the EnergyFlowBlock block (around line 298) and before the System Status card block:
```tsx
{/* ── Weather ───────────────────────────────────────────── */}
{(weatherData?.current || (weatherData?.hourly_forecast?.length ?? 0) > 0) && (
  <WeatherCard
    current={weatherData?.current ?? null}
    hourly={weatherData?.hourly_forecast ?? []}
  />
)}
```

- [ ] **Step 5: Verify the screen loads without errors**

Run: `npm start` → open Expo Go on device or emulator → navigate to Overview tab.

Expected: Weather card appears below the energy flow block if weather data is available. No crash if `weatherData` is null/undefined. Screen still loads normally if fetch fails (retry: 0 means silent fail).

- [ ] **Step 6: Commit**
```bash
cd /home/ubuntu/work/smart-solar-fieldops-mobile
git add src/screens/Overview/OverviewScreen.tsx
git commit -m "feat(overview): add weather card with current conditions and hourly strip"
```

---

## Task 2: OverviewScreen — Today's Energy Breakdown + Site Info Chips

**Files:**
- Modify: `src/screens/Overview/OverviewScreen.tsx`

- [ ] **Step 1: Add EnergyBreakdownSection sub-component**

Add this component before `WeatherCard`, after the imports:
```tsx
function EnergyBreakdownSection({ latest }: { latest: Record<string, any> | null }) {
  if (!latest) return null;

  const gen  = latest.pv_energy_today_kwh   ?? latest.daily_pv_kwh         ?? null;
  const cons = latest.load_energy_today_kwh  ?? latest.daily_load_kwh        ?? null;
  const bChg = latest.battery_charge_today_kwh    ?? latest.daily_bat_charge_kwh    ?? null;
  const bDis = latest.battery_discharge_today_kwh ?? latest.daily_bat_discharge_kwh ?? null;
  const exp  = latest.grid_export_today_kwh  ?? latest.daily_grid_export_kwh ?? null;

  const selfSuff = (gen != null && exp != null && gen > 0)
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

  const hasAny = items.some(i => i.val != null);
  if (!hasAny) return null;

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
      <Text style={{
        color: AppTheme.colors.dimText,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
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
```

- [ ] **Step 2: Add SiteInfoChips sub-component**

Add after `EnergyBreakdownSection`:
```tsx
function SiteInfoChips({ site }: { site: { capacity_kw: number | null; inverter_capacity_kw: number | null; latitude: number | null; longitude: number | null; timezone: string } }) {
  const localTime = (() => {
    try {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true });
    } catch { return null; }
  })();

  const chips = [
    site.capacity_kw       != null ? { label: 'Capacity',   val: `${site.capacity_kw} kWp` }            : null,
    site.inverter_capacity_kw != null ? { label: 'Inverter', val: `${site.inverter_capacity_kw} kW` }   : null,
    (site.latitude != null && site.longitude != null)
      ? { label: 'Location', val: `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}` }        : null,
    site.timezone ? { label: 'Timezone', val: site.timezone }                                           : null,
    localTime     ? { label: 'IST',      val: localTime }                                               : null,
  ].filter(Boolean) as { label: string; val: string }[];

  if (chips.length === 0) return null;

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{
        color: AppTheme.colors.dimText,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingHorizontal: 2,
      }}>
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
```

- [ ] **Step 3: Insert both sections into the ScrollView**

After the WeatherCard block and before the System Status card block, insert:
```tsx
{/* ── Today's Energy ───────────────────────────────────── */}
{!telLoading && latest && (
  <EnergyBreakdownSection latest={latest} />
)}
```

After the System Status card block (before the active alerts preview), insert:
```tsx
{/* ── Site info chips ──────────────────────────────────── */}
{!telLoading && activeSite && (
  <SiteInfoChips site={activeSite} />
)}
```

- [ ] **Step 4: Verify**

Run: `npm start` → Overview tab.

Expected: Energy breakdown grid (3×2) appears with kWh values if the backend provides daily cumulative fields; shows `—` gracefully if not. Site info chips scroll horizontally below System Status. No TypeScript errors (`npm run typecheck`).

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**
```bash
git add src/screens/Overview/OverviewScreen.tsx
git commit -m "feat(overview): add today's energy breakdown grid and site info chips"
```

---

## Task 3: OverviewScreen — Mini PV+Load Chart

**Files:**
- Modify: `src/screens/Overview/OverviewScreen.tsx`

- [ ] **Step 1: Add useWindowDimensions import**

Add to existing React Native import line:
```tsx
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
```

Add Victory Native imports:
```tsx
import { VictoryChart, VictoryArea, VictoryLine, VictoryAxis } from 'victory-native';
```

- [ ] **Step 2: Add MiniPVChart sub-component**

Add before `WeatherCard`:
```tsx
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
      <Text style={{
        color: AppTheme.colors.dimText,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        paddingHorizontal: 18,
        paddingTop: 14,
        marginBottom: 4,
      }}>
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
          style={{
            data: {
              fill: AppTheme.colors.pvColor + '26',
              stroke: AppTheme.colors.pvColor,
              strokeWidth: 2,
            },
          }}
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
          tickFormat={(x: number) => {
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
          tickFormat={(y: number) => `${y.toFixed(1)}`}
        />
      </VictoryChart>
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingBottom: 12 }}>
        {[
          { color: AppTheme.colors.pvColor,   label: 'Solar', dashed: false },
          { color: AppTheme.colors.loadColor, label: 'Load',  dashed: true  },
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
```

- [ ] **Step 3: Add useMemo import for MiniPVChart**

`useMemo` is already imported from React. Confirm it is in the import at the top:
```tsx
import React, { useCallback, useMemo } from 'react';
```
If `useMemo` is missing, add it.

- [ ] **Step 4: Insert MiniPVChart into ScrollView**

After `EnergyBreakdownSection` block, insert:
```tsx
{/* ── Mini PV + Load chart ─────────────────────────────── */}
{!telLoading && telemetry && telemetry.length >= 2 && (
  <MiniPVChart telemetry={telemetry} />
)}
```

- [ ] **Step 5: Verify and typecheck**

Run: `npm start` → Overview tab. The chart should appear below the energy breakdown when telemetry data has been fetched for today.

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**
```bash
git add src/screens/Overview/OverviewScreen.tsx
git commit -m "feat(overview): add mini PV+Load chart from today's telemetry"
```

---

## Task 4: AlertsScreen — KPI Summary Bar + Search

**Files:**
- Modify: `src/screens/Alerts/AlertsScreen.tsx`

- [ ] **Step 1: Add AlertsKpiBar sub-component**

Add after the `SEVERITY_CFG` constant (around line 32):
```tsx
function AlertsKpiBar({
  onFilterActive,
  onFilterCritical,
  counts,
}: {
  onFilterActive: () => void;
  onFilterCritical: () => void;
  counts: { active: number; critical: number; acknowledged: number; total: number };
}) {
  const chips = [
    { label: 'Active',    val: counts.active,       color: AppTheme.colors.danger,  bg: AppTheme.colors.dangerSoft,  onPress: onFilterActive },
    { label: 'Critical',  val: counts.critical,     color: AppTheme.colors.danger,  bg: AppTheme.colors.dangerSoft,  onPress: onFilterCritical },
    { label: 'Ack\'d',    val: counts.acknowledged, color: AppTheme.colors.warning, bg: AppTheme.colors.warningSoft, onPress: undefined },
    { label: 'Total',     val: counts.total,        color: AppTheme.colors.mutedText, bg: AppTheme.colors.card,     onPress: undefined },
  ];

  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 8,
      marginBottom: 10,
    }}>
      {chips.map(chip => (
        <Pressable
          key={chip.label}
          onPress={chip.onPress}
          style={{
            flex: 1,
            alignItems: 'center',
            backgroundColor: chip.bg,
            borderRadius: AppTheme.radii.md,
            borderWidth: 1,
            borderColor: chip.color + '30',
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: chip.color, fontSize: 18, fontWeight: '800' }}>
            {chip.val}
          </Text>
          <Text style={{ color: chip.color, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>
            {chip.label.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Add search state and TextInput import**

`TextInput` is not currently imported in AlertsScreen. Add it to the React Native import:
```tsx
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
```

Add search state inside `AlertsScreen()`, after the existing `statusFilter` state:
```tsx
const [search, setSearch] = useState('');
```

- [ ] **Step 3: Update counts and add acknowledged/total counts**

The existing `counts` useMemo only tracks `All`, `Critical`, `Warning`, `Info` for active alerts. Extend it to also expose what the KPI bar needs. Replace the existing `counts` useMemo with:
```tsx
const counts = useMemo(() => {
  const active = alerts.filter(a => a.status !== 'resolved');
  return {
    All:          active.length,
    Critical:     active.filter(a => a.severity === 'critical').length,
    Warning:      active.filter(a => a.severity === 'warning').length,
    Info:         active.filter(a => a.severity === 'info').length,
    kpi: {
      active:       active.length,
      critical:     active.filter(a => a.severity === 'critical').length,
      acknowledged: active.filter(a => a.status === 'acknowledged').length,
      total:        alerts.length,
    },
  };
}, [alerts]);
```

- [ ] **Step 4: Wire search into the filtered useMemo**

The existing `filtered` useMemo filters by `statusFilter` and `severityFilter`. Add search filtering at the top of it:
```tsx
const filtered = useMemo(() => {
  let result = alerts;

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(a =>
      a.message.toLowerCase().includes(q) ||
      a.device_id?.toLowerCase().includes(q) ||
      (a.fault_code ?? '').toLowerCase().includes(q)
    );
  }

  // Status filter
  if (statusFilter === 'Active') {
    result = result.filter(a => a.status !== 'resolved');
  } else {
    result = result.filter(a => a.status === 'resolved');
  }

  // Severity filter
  if (severityFilter !== 'All') {
    result = result.filter(a => a.severity === severityFilter.toLowerCase());
  }

  return [...result].sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    const sA = sev[a.severity] ?? 3;
    const sB = sev[b.severity] ?? 3;
    if (sA !== sB) return sA - sB;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}, [alerts, severityFilter, statusFilter, search]);
```

- [ ] **Step 5: Add KPI bar + search box to JSX**

In the `AlertsScreen` return, after the `<View style={styles.header}>` block and before the `<View style={styles.statusToggle}>` block, insert:
```tsx
{/* KPI summary bar */}
<AlertsKpiBar
  counts={counts.kpi}
  onFilterActive={() => { setStatusFilter('Active'); setSeverityFilter('All'); setSearch(''); }}
  onFilterCritical={() => { setStatusFilter('Active'); setSeverityFilter('Critical'); setSearch(''); }}
/>

{/* Search */}
<View style={styles.searchWrap}>
  <Ionicons name="search-outline" size={17} color={AppTheme.colors.dimText} />
  <TextInput
    style={styles.searchInput}
    placeholder="Search message, device, fault…"
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
```

- [ ] **Step 6: Add searchWrap and searchInput styles to the StyleSheet**

Add at the end of the `StyleSheet.create({...})` in AlertsScreen, before the closing `}`:
```tsx
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
```

- [ ] **Step 7: Verify and typecheck**

Run: `npm start` → Alerts tab.

Expected: 4-chip KPI bar shows at top. Search box filters the list in real-time. Tapping Active/Critical chips auto-sets the filter. `npm run typecheck` → 0 errors.

- [ ] **Step 8: Commit**
```bash
git add src/screens/Alerts/AlertsScreen.tsx
git commit -m "feat(alerts): add KPI summary bar and search box"
```

---

## Task 5: AlertsScreen — Bottom Sheet Alert Detail

**Files:**
- Modify: `src/screens/Alerts/AlertsScreen.tsx`

- [ ] **Step 1: Add Modal import**

`Modal` is not currently imported. Add it:
```tsx
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
```

- [ ] **Step 2: Add selectedAlert state inside AlertsScreen()**

After the `search` state, add:
```tsx
const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
```

- [ ] **Step 3: Add AlertDetailSheet sub-component**

Add after `AlertsKpiBar` and before `SeverityChip`:
```tsx
function AlertDetailSheet({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  canAct,
}: {
  alert: AlertItem | null;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  canAct: boolean;
}) {
  if (!alert) return null;
  const cfg = SEVERITY_CFG[alert.severity] ?? SEVERITY_CFG.info;
  const isResolved     = alert.status === 'resolved';
  const isAcknowledged = alert.status === 'acknowledged';
  const isPersistent   = /^\d+$/.test(alert.id);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={{
        flex: 1,
        backgroundColor: AppTheme.colors.bg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: AppTheme.colors.border }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Severity + message */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={[{ padding: 10, borderRadius: AppTheme.radii.md }, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
            </View>
            <Text style={{ flex: 1, color: AppTheme.colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
              {alert.message}
            </Text>
          </View>

          {/* Resolved banner */}
          {isResolved && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: AppTheme.colors.successSoft,
              borderRadius: AppTheme.radii.md,
              padding: 12,
            }}>
              <Ionicons name="checkmark-circle" size={16} color={AppTheme.colors.success} />
              <Text style={{ color: AppTheme.colors.success, fontSize: 13, fontWeight: '600' }}>
                This alert has been resolved
              </Text>
            </View>
          )}

          {/* Info grid */}
          <View style={{
            backgroundColor: AppTheme.colors.card,
            borderRadius: AppTheme.radii.md,
            borderWidth: 1,
            borderColor: AppTheme.colors.border,
            overflow: 'hidden',
          }}>
            {[
              { label: 'Alert ID',   val: alert.id },
              { label: 'Severity',   val: cfg.label },
              { label: 'Status',     val: alert.status ?? 'active' },
              { label: 'Device',     val: alert.device_id ?? '—' },
              { label: 'Triggered',  val: fmtDateTimeIST(alert.timestamp) },
              alert.fault_code ? { label: 'Fault Code', val: alert.fault_code } : null,
            ].filter(Boolean).map((row, i, arr) => (
              <View key={row!.label} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: AppTheme.colors.borderMuted,
              }}>
                <Text style={{ color: AppTheme.colors.mutedText, fontSize: 13 }}>{row!.label}</Text>
                <Text style={{
                  color: AppTheme.colors.text,
                  fontSize: 13,
                  fontWeight: '600',
                  maxWidth: '60%',
                  textAlign: 'right',
                }}>
                  {row!.val}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          {canAct && !isResolved && isPersistent && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!isAcknowledged && (
                <Pressable
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 14,
                    borderRadius: AppTheme.radii.md,
                    backgroundColor: AppTheme.colors.warningSoft,
                  }}
                  onPress={() => { onAcknowledge(alert.id); onClose(); }}
                >
                  <Ionicons name="checkmark-outline" size={16} color={AppTheme.colors.warning} />
                  <Text style={{ color: AppTheme.colors.warning, fontSize: 14, fontWeight: '700' }}>Acknowledge</Text>
                </Pressable>
              )}
              <Pressable
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 14,
                  borderRadius: AppTheme.radii.md,
                  backgroundColor: AppTheme.colors.successSoft,
                }}
                onPress={() => { onResolve(alert.id); onClose(); }}
              >
                <Ionicons name="checkmark-done-outline" size={16} color={AppTheme.colors.success} />
                <Text style={{ color: AppTheme.colors.success, fontSize: 14, fontWeight: '700' }}>Resolve</Text>
              </Pressable>
            </View>
          )}

          {/* Done button */}
          <Pressable
            style={{
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: AppTheme.radii.md,
              backgroundColor: AppTheme.colors.card,
              borderWidth: 1,
              borderColor: AppTheme.colors.border,
            }}
            onPress={onClose}
          >
            <Text style={{ color: AppTheme.colors.mutedText, fontSize: 14, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
```

Note: `ScrollView` is used inside the sheet — this refers to the React Native `ScrollView` already imported. `fmtDateTimeIST` must be imported from time utils.

- [ ] **Step 4: Add fmtDateTimeIST import**

In the existing time utils import:
```tsx
import { formatISTTime, fmtDateTimeIST } from '../../utils/time';
```

- [ ] **Step 5: Wire selectedAlert into AlertCard and JSX**

Add `onViewDetail` prop to `AlertCard`. Change the `AlertCard` outer `View` to `Pressable`:

Replace:
```tsx
function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  canAct,
}: {
  alert: AlertItem;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  canAct: boolean;
}) {
  ...
  return (
    <View style={[styles.alertCard, { borderLeftColor: cfg.color }, isResolved && styles.alertCardResolved]}>
```

With:
```tsx
function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onViewDetail,
  canAct,
}: {
  alert: AlertItem;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onViewDetail: (a: AlertItem) => void;
  canAct: boolean;
}) {
  ...
  return (
    <Pressable
      style={({ pressed }) => [styles.alertCard, { borderLeftColor: cfg.color }, isResolved && styles.alertCardResolved, pressed && { opacity: 0.85 }]}
      onPress={() => onViewDetail(alert)}
    >
```

And change the closing `</View>` at the end of `AlertCard` to `</Pressable>`.

- [ ] **Step 6: Pass onViewDetail from the FlatList renderItem**

In `AlertsScreen`'s `FlatList` `renderItem`, add `onViewDetail`:
```tsx
renderItem={({ item }) => (
  <AlertCard
    alert={item}
    onAcknowledge={onAcknowledge}
    onResolve={onResolve}
    onViewDetail={setSelectedAlert}
    canAct={canAcknowledgeAlerts && canResolveAlerts}
  />
)}
```

- [ ] **Step 7: Insert AlertDetailSheet into AlertsScreen JSX**

At the very end of the `AlertsScreen` return, just before the closing `</View>`, insert:
```tsx
<AlertDetailSheet
  alert={selectedAlert}
  onClose={() => setSelectedAlert(null)}
  onAcknowledge={onAcknowledge}
  onResolve={onResolve}
  canAct={canAcknowledgeAlerts && canResolveAlerts}
/>
```

- [ ] **Step 8: Verify and typecheck**

Run: `npm start` → Alerts tab. Tap any alert card → bottom sheet slides up showing the info grid, action buttons, Done button. Tapping Done or dragging down dismisses it. Action buttons in the sheet call the same mutation logic as the inline buttons.

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 9: Commit**
```bash
git add src/screens/Alerts/AlertsScreen.tsx
git commit -m "feat(alerts): add bottom sheet detail view on alert tap"
```

---

## Task 6: DevicesScreen — KPI Bar + Expandable Rows

**Files:**
- Modify: `src/screens/Devices/DevicesScreen.tsx`

- [ ] **Step 1: Add LayoutAnimation imports**

Add to the React Native import:
```tsx
import {
  View, Text, StyleSheet, SectionList, Pressable, TextInput,
  RefreshControl, ActivityIndicator, LayoutAnimation, Platform, UIManager,
} from 'react-native';
```

At the top of the `DevicesScreen()` function body (before any hooks), enable LayoutAnimation on Android:
```tsx
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
```

- [ ] **Step 2: Add DevicesKpiBar sub-component**

Add after the `GROUP_CFG` constant and before `FilterPill`:
```tsx
function DevicesKpiBar({ counts }: { counts: { total: number; online: number; offline: number; issues: number } }) {
  const chips = [
    { label: 'Total',   val: counts.total,   color: AppTheme.colors.mutedText, bg: AppTheme.colors.card },
    { label: 'Online',  val: counts.online,  color: AppTheme.colors.success,   bg: AppTheme.colors.successSoft },
    { label: 'Offline', val: counts.offline, color: AppTheme.colors.danger,    bg: AppTheme.colors.dangerSoft },
    { label: 'Issues',  val: counts.issues,  color: AppTheme.colors.warning,   bg: AppTheme.colors.warningSoft },
  ];

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 10 }}>
      {chips.map(chip => (
        <View key={chip.label} style={{
          flex: 1,
          alignItems: 'center',
          backgroundColor: chip.bg,
          borderRadius: AppTheme.radii.md,
          borderWidth: 1,
          borderColor: chip.color + '30',
          paddingVertical: 10,
        }}>
          <Text style={{ color: chip.color, fontSize: 18, fontWeight: '800' }}>{chip.val}</Text>
          <Text style={{ color: chip.color, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>
            {chip.label.toUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Add DeviceExpandPanel sub-component**

Add after `DevicesKpiBar` and before `FilterPill`:
```tsx
function signalLabel(dbm: number | null | undefined): { label: string; color: string; bars: number } {
  if (dbm == null) return { label: 'Unknown', color: AppTheme.colors.dimText, bars: 0 };
  if (dbm >= -60) return { label: 'Strong',   color: AppTheme.colors.success,  bars: 3 };
  if (dbm >= -75) return { label: 'Fair',     color: AppTheme.colors.warning,  bars: 2 };
  return              { label: 'Weak',     color: AppTheme.colors.danger,   bars: 1 };
}

function DeviceExpandPanel({ device }: { device: any }) {
  const sig = signalLabel(device.signal_strength_dbm);
  const uptimeSecs: number | null = device.uptime_seconds ?? null;
  const uptimeStr = uptimeSecs != null
    ? (() => {
        const h = Math.floor(uptimeSecs / 3600);
        const m = Math.floor((uptimeSecs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : null;

  const rows = [
    device.config_version ? { label: 'Firmware',  val: device.config_version }        : null,
    device.hw_id          ? { label: 'HW ID',      val: device.hw_id }                : null,
    uptimeStr             ? { label: 'Uptime',     val: uptimeStr }                   : null,
    device.signal_strength_dbm != null ? { label: 'Signal (dBm)', val: `${device.signal_strength_dbm} dBm` } : null,
  ].filter(Boolean) as { label: string; val: string }[];

  return (
    <View style={{
      backgroundColor: AppTheme.colors.cardElevated,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: AppTheme.colors.border,
      borderBottomLeftRadius: AppTheme.radii.md,
      borderBottomRightRadius: AppTheme.radii.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: -AppTheme.radii.md,
      paddingTop: AppTheme.radii.md + 2,
      marginBottom: 8,
    }}>
      {rows.map((row, i) => (
        <View key={row.label} style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 5,
          borderBottomWidth: i < rows.length - 1 ? 1 : 0,
          borderBottomColor: AppTheme.colors.borderMuted,
        }}>
          <Text style={{ color: AppTheme.colors.mutedText, fontSize: 12 }}>{row.label}</Text>
          <Text style={{ color: AppTheme.colors.text, fontSize: 12, fontWeight: '600' }}>{row.val}</Text>
        </View>
      ))}

      {/* Signal strength bar */}
      {device.signal_strength_dbm != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Text style={{ color: AppTheme.colors.mutedText, fontSize: 12 }}>Signal</Text>
          <View style={{ flexDirection: 'row', gap: 3, flex: 1, alignItems: 'flex-end' }}>
            {[1, 2, 3].map(bar => (
              <View key={bar} style={{
                flex: 1,
                height: bar * 5 + 4,
                borderRadius: 2,
                backgroundColor: bar <= sig.bars ? sig.color : AppTheme.colors.border,
              }} />
            ))}
          </View>
          <Text style={{ color: sig.color, fontSize: 11, fontWeight: '700' }}>{sig.label}</Text>
        </View>
      )}

      {/* Health warning */}
      {device.heartbeat_health?.severity && device.heartbeat_health.severity !== 'ok' && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
          backgroundColor: AppTheme.colors.warningSoft,
          borderRadius: AppTheme.radii.sm,
          padding: 8,
        }}>
          <Ionicons name="warning-outline" size={14} color={AppTheme.colors.warning} />
          <Text style={{ color: AppTheme.colors.warning, fontSize: 12, fontWeight: '600' }}>
            Health: {device.heartbeat_health.severity}
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Add expandedIds state inside DevicesScreen()**

After the `filter` state declaration, add:
```tsx
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

const toggleExpand = useCallback((id: string) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });
}, []);
```

- [ ] **Step 5: Update DeviceRow to include chevron toggle**

Replace the existing `DeviceRow` with:
```tsx
function DeviceRow({
  device,
  expanded,
  onPressRow,
  onToggleExpand,
}: {
  device: any;
  expanded: boolean;
  onPressRow: () => void;
  onToggleExpand: () => void;
}) {
  const group = groupDevice(device);
  const cfg = GROUP_CFG[group];
  const deviceKey = String(device.device_id ?? device.id);

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.deviceRow,
          expanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: 'transparent' },
          pressed && { opacity: 0.7 },
        ]}
        onPress={onPressRow}
      >
        <View style={[styles.deviceIconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name="hardware-chip" size={20} color={cfg.color} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.deviceSerial} numberOfLines={1}>{device.device_serial}</Text>
          <Text style={styles.deviceMeta} numberOfLines={1}>
            {device.model ?? 'Unknown model'}
          </Text>
        </View>

        <View style={styles.deviceRight}>
          {device.last_heartbeat && (
            <Text style={styles.lastSeen}>{formatRelativeTime(device.last_heartbeat)}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
            <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
              {device.is_online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <Pressable onPress={onToggleExpand} hitSlop={10} style={{ marginLeft: 4 }}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={AppTheme.colors.dimText}
          />
        </Pressable>
      </Pressable>

      {expanded && <DeviceExpandPanel device={device} />}
    </View>
  );
}
```

- [ ] **Step 6: Update DevicesKpiBar counts and insert into JSX**

First, add an `issues` count to the existing `counts` useMemo. Replace:
```tsx
const counts = useMemo(() => ({
  All: siteDevices.length,
  Online: siteDevices.filter((d: any) => d.is_online).length,
  Offline: siteDevices.filter((d: any) => !d.is_online).length,
  Warning: 0,
}), [siteDevices]);
```

With:
```tsx
const counts = useMemo(() => {
  const online  = siteDevices.filter((d: any) => d.is_online).length;
  const offline = siteDevices.filter((d: any) => !d.is_online).length;
  const issues  = siteDevices.filter((d: any) =>
    d.heartbeat_health?.severity === 'warn' || d.heartbeat_health?.severity === 'critical'
  ).length;
  return {
    All: siteDevices.length,
    Online: online,
    Offline: offline,
    Warning: issues,
    kpi: { total: siteDevices.length, online, offline, issues },
  };
}, [siteDevices]);
```

In the `DevicesScreen` JSX, insert the KPI bar after the header block and before the search box:
```tsx
{/* KPI bar — shown only when we have data */}
{!isLoading && siteDevices.length > 0 && (
  <DevicesKpiBar counts={counts.kpi} />
)}
```

- [ ] **Step 7: Update SectionList renderItem to pass expand props**

Replace the `renderItem` inside the `SectionList`:
```tsx
renderItem={({ item }) => {
  const deviceKey = String(item.device_id ?? item.id);
  return (
    <DeviceRow
      device={item}
      expanded={expandedIds.has(deviceKey)}
      onPressRow={() =>
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
      onToggleExpand={() => toggleExpand(deviceKey)}
    />
  );
}}
```

- [ ] **Step 8: Verify and typecheck**

Run: `npm start` → Devices tab.

Expected: KPI bar shows Total/Online/Offline/Issues counts at top. Tapping the chevron on a device row expands a detail panel with firmware, HW ID, uptime, signal bar. Tapping again collapses. The row itself still navigates to DeviceDetailScreen. LayoutAnimation makes the expand smooth.

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 9: Commit**
```bash
git add src/screens/Devices/DevicesScreen.tsx
git commit -m "feat(devices): add KPI summary bar and expandable device row detail panel"
```

---

## Spec Coverage Check

| Spec requirement | Implemented in |
|---|---|
| OverviewScreen: Weather Card (current + hourly strip) | Task 1 |
| OverviewScreen: Today's Energy Breakdown (6-cell grid) | Task 2 |
| OverviewScreen: Site Info Chips (horizontal scroll) | Task 2 |
| OverviewScreen: Mini PV+Load Chart | Task 3 |
| AlertsScreen: KPI summary bar (Active/Critical/Ack'd/Total) | Task 4 |
| AlertsScreen: Search box (message/device/fault) | Task 4 |
| AlertsScreen: Bottom sheet detail on tap | Task 5 |
| DevicesScreen: KPI summary bar (Total/Online/Offline/Issues) | Task 6 |
| DevicesScreen: Expandable row detail (firmware, signal, health) | Task 6 |
