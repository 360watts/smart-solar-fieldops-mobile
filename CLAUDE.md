# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start                    # Launch Expo dev server (scan QR with Expo Go)
npm run android              # Run on Android emulator
npm run ios                  # Run on iOS simulator
npm run web                  # Run in browser

# Type checking
npm run typecheck            # tsc --noEmit (no separate lint script)

# EAS builds (requires Expo account + eas-cli)
npm run eas:android:preview  # Internal Android APK
npm run eas:ios:preview      # Internal iOS build
```

**Environment variable** — set before starting:
```bash
export EXPO_PUBLIC_API_BASE_URL="https://smart-solar-django-backend.vercel.app/api"
```

## Architecture

### Navigation flow
```
AppRoot (QueryClient + AuthContext + SiteContext)
  └─ RootNavigator
       ├─ [unauthenticated]      → LoginScreen
       ├─ [auth OK, no site]     → SiteSelectScreen
       └─ [auth OK + site]       → MainTabs (bottom tabs)
            ├─ Dashboard  (sub-tabs: Overview / Weather / History / Forecast)
            ├─ Alerts
            ├─ Users
            └─ Menu
```

### State layers
| Layer | File | What it owns |
|---|---|---|
| Auth | `src/auth/AuthContext.tsx` | JWT access + refresh tokens, login/logout |
| Site | `src/site/SiteContext.tsx` | Active site selection (scopes all queries) |
| Server state | React Query (TanStack v5) | All API data; cache persisted to AsyncStorage (6 h TTL, excludes large time-series) |

Tokens and active site are stored in **expo-secure-store** (encrypted at rest). Automatic 401 → token refresh → retry is handled in `src/api/http.ts`.

### API layer
- `src/api/http.ts` — fetch wrapper: injects Bearer token, handles 401 refresh, parses error shapes
- `src/api/smartSolar.ts` — typed endpoint functions consumed by React Query hooks inside screens
- Base URL comes from `src/config/env.ts` → `EXPO_PUBLIC_API_BASE_URL`

### Theme
Single dark theme defined in `src/theme/theme.ts`. Use `theme.*` constants for colors, spacing (`xs/sm/md/lg/xl/xxl`), radii, shadows, and animation durations. Accent green: `#00a63e`. Do not hard-code colors.

### Time handling
All timestamps are displayed in **IST (Asia/Kolkata)**. Use helpers in `src/utils/time.ts` for formatting and date arithmetic — do not call `toLocaleDateString` / `toLocaleTimeString` directly.

### Charts
Victory Native (`victory-native`) renders line/area charts. Large datasets are decimated before passing to chart components. `ChartFullscreenModal` wraps any chart for pinch-zoom viewing.

### Babel / Reanimated
`babel.config.js` includes `react-native-worklets/plugin`. Any file using `useAnimatedStyle`, `useSharedValue`, etc. must be compatible with the Reanimated worklet runtime — avoid closures over non-serialisable values.

## Production Fault Log

Faults, root causes, and fixes are recorded in [`FAULT_LOG.md`](./FAULT_LOG.md) at the repo root.

**Workflow:** discover fault → open GitHub Issue → fix (reference issue # in commits) → append entry to `FAULT_LOG.md` → close issue.
