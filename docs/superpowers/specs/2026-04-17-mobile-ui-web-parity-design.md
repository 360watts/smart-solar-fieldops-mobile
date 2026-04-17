# Mobile UI Web-Parity Design
**Date:** 2026-04-17  
**Scope:** OverviewScreen, AlertsScreen, DevicesScreen  
**Reference:** `smart-solar-react-frontend/src/components/mobile/` (MobileDashboard, MobileAlerts, MobileDevices)

---

## Goal

Bring the field ops mobile app's three main screens to feature parity with the web frontend's mobile views, using existing theme tokens, components, and API data already in scope. No new backend endpoints required.

---

## 1. OverviewScreen (Dashboard)

### Current sections (unchanged)
- 3px status strip
- Site header + Switch button
- 2×2 KPI grid (Solar / Load / Battery % / Grid)
- EnergyFlowBlock

### New sections (appended after EnergyFlowBlock)

#### 1a. Weather Card
- Calls `fetchSiteWeather(siteId)` — add to Overview's React Query set alongside existing telemetry fetch
- Compact summary row: temperature (°C), humidity (%), wind speed (km/h), solar irradiance (W/m²)
- Below summary row: existing `WeatherHourlyStrip` component for hourly icon strip
- Card uses `AppTheme.colors.card` background, `AppTheme.radii.lg` radius, standard shadow
- Show skeleton loader while fetching; hide section entirely if fetch fails silently

#### 1b. Today's Energy Breakdown
- 2×3 grid of `EnergyBreakdownRow`-style cells: Generated (kWh), Consumed (kWh), Self-sufficiency (%), Battery Charged (kWh), Battery Discharged (kWh), Exported (kWh)
- Data derived from today's telemetry slice already fetched — sum/calculate client-side
- Each cell: label (uppercase caption), value (metricSm typography), unit, icon tinted with chart color tokens (`pvColor`, `loadColor`, `battColor`, `gridColor`)
- Section title: "Today's Energy" with `AppTheme.typography.label`

#### 1c. Mini PV + Load Chart
- Reuse existing `HistoryChart` component, locked to `'today'` range
- PV line: `AppTheme.colors.pvColor` (#00C853 amber), Load line: `AppTheme.colors.loadColor`
- Height: 160px, no axis labels (compact mode)
- Tap launches existing `ChartFullscreenModal`
- Show `SkeletonLoader` while loading; hide if no data points

#### 1d. Site Info Chips
- Horizontal `ScrollView` (no scroll indicator) with pill-shaped chips
- Chips: Capacity (kWp), Inverter type, Lat/Lng, Tilt °, Azimuth °, Timezone, Local IST time
- Data from site object in `SiteContext` — no API call
- Chip style: `AppTheme.colors.cardElevated` bg, `AppTheme.colors.border` border, `AppTheme.radii.full` radius, `AppTheme.typography.caption` text
- Positioned after System Status Card, before Alerts Preview

### Section order (final)
1. Status strip
2. Site header
3. 2×2 KPI grid
4. EnergyFlowBlock
5. Weather Card *(new)*
6. Today's Energy Breakdown *(new)*
7. Mini PV+Load Chart *(new)*
8. System Status Card
9. Site Info Chips *(new)*
10. Alerts Preview

---

## 2. AlertsScreen

### Unchanged
- Status toggle (Active / Resolved)
- Severity filter chips (All / Critical / Warning / Info)
- FlatList with alert cards (left border stripe, severity badge, action buttons)
- Empty state

### New additions

#### 2a. Summary KPI Bar
- 4 chips in a horizontal row below the header, above the search box
- Chips: Active (red), Critical (red), Acknowledged (orange), Total (muted)
- Counts derived from fetched alerts — no API call
- Each chip: count (subheading weight) + label (caption), chip bg is severity soft color
- Tapping a chip auto-sets the corresponding filter

#### 2b. Search Box
- Positioned between KPI bar and status toggle
- Matches DevicesScreen search style: card bg, `Ionicons search` icon, clear × button
- Filters by: alert message, device serial, fault code — client-side, instant
- Clears on status toggle change

#### 2c. Bottom-Sheet Detail
- Tapping any alert card opens a slide-up sheet
- Implementation: `Modal` with `presentationStyle='pageSheet'` (iOS) / slide-from-bottom animation (Android), or Reanimated bottom sheet with drag handle
- Sheet contents:
  - Drag handle (centered 40×4px rounded bar)
  - Severity icon (32px) + full message text
  - 2-col info grid: Alert ID, Device serial, Site name, Triggered at (IST), Resolved at (IST, if applicable)
  - Resolved banner (green bg) if status = resolved
  - Acknowledge + Resolve action buttons (same mutation logic as existing row buttons)
  - "Done" button to dismiss
- Alert card `Pressable` wrapper added; existing inline action buttons retained for quick-action

---

## 3. DevicesScreen

### Unchanged
- Search box
- Filter pills (All / Online / Offline / Warning)
- SectionList grouped by status (Offline / Warning / Healthy / Unknown)
- DeviceDetailScreen navigation on row press

### New additions

#### 3a. KPI Summary Bar
- 4 chips at top of screen, above search box: Total (muted), Online (green), Offline (red), Issues (orange)
- Counts derived from fetched devices data
- Same chip style as Alerts KPI bar for visual consistency

#### 3b. Expandable Device Row Detail
- Each device row gains an expand/collapse toggle (ChevronDown/Up icon, right side)
- Tapping chevron (not the row itself — row press still navigates to DeviceDetailScreen) expands an animated panel below the row
- Reanimated `useAnimatedStyle` + `withSpring` height animation
- Expanded panel shows (from device object):
  - Firmware version
  - HW ID
  - Signal strength: colored bar (3 segments) + dBm value + quality label (Strong ≥ -60, Fair ≥ -75, Weak < -75); bar colors: green/orange/red
  - Uptime (formatted: Xd Xh or Xh Xm)
  - Health flags (if severity warn/critical): colored warning text
- Only show fields that are non-null on the device object
- Panel bg: `AppTheme.colors.cardElevated`, padded, rounded bottom corners

---

## Data & API

| Feature | Data Source | API Call |
|---|---|---|
| Weather Card | `fetchSiteWeather(siteId)` | New query in OverviewScreen |
| Today's Energy | Telemetry already fetched | Client-side calculation |
| Mini Chart | Telemetry already fetched | Reuse HistoryChart |
| Site Info Chips | `SiteContext` site object | None |
| Alerts KPI Bar | Alerts already fetched | None |
| Alerts Search | Alerts already fetched | None |
| Alerts Bottom Sheet | Alerts already fetched | None (mutations reused) |
| Devices KPI Bar | Devices already fetched | None |
| Device Expanded Detail | Device rows already fetched | None |

---

## Implementation Notes

- All new components use `AppTheme` tokens exclusively — no hardcoded colors
- IST formatting via existing `src/utils/time.ts` helpers
- Skeleton loaders (`SkeletonLoader` component) for any new async sections
- Reanimated used for bottom sheet and row expand animations — already a dependency
- `WeatherHourlyStrip` already exists; Weather Card wraps it with a summary header
- No new navigation routes required

---

## Files Changed

| File | Change |
|---|---|
| `src/screens/Overview/OverviewScreen.tsx` | Add WeatherCard, EnergyBreakdown, MiniChart, SiteInfoChips sections |
| `src/screens/Alerts/AlertsScreen.tsx` | Add KPI bar, search box, bottom-sheet detail |
| `src/screens/Devices/DevicesScreen.tsx` | Add KPI bar, expandable row detail panel |
| `src/api/smartSolar.ts` | Add `fetchSiteWeather` if not already present |
