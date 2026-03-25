import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';

/**
 * Energy flow diagram — 4-corner diamond layout with directional animated beams.
 *
 * Layout:   Solar (TL) ────── Hub ────── Grid  (TR)
 *                              |
 *           Battery (BL) ──────+────── Load  (BR)
 *
 * Sign conventions (matches web app / Deye register 625):
 *   gridKw > 0  → exporting to grid  (Hub → Grid)
 *   gridKw < 0  → importing from grid (Grid → Hub)
 *   battKw > 0  → battery discharging (Battery → Hub)
 *   battKw < 0  → battery charging    (Hub → Battery)
 */

// ── Animated SVG path ──────────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ── Color palette ──────────────────────────────────────────────────────────
const CLR = {
  bg:       '#080C10',
  surface:  '#0D1520',
  surface2: '#101C28',
  track:    'rgba(255,255,255,0.08)',
  solar:    '#FFA726',
  load:     '#EF5350',
  gridExp:  '#00C853',
  gridImp:  '#4B9EFF',
  batt:     '#FFB020',
  hub:      '#818CF8',
  text:     '#EDF2F7',
  muted:    'rgba(237,242,247,0.45)',
  dim:      'rgba(237,242,247,0.22)',
};

// ── SVG geometry (viewBox 300×220) ─────────────────────────────────────────
const VB_W = 300;
const VB_H = 220;
const HUB  = { x: 150, y: 110 };
// Node circle centers
const N = {
  solar: { x: 52,  y: 44  },
  grid:  { x: 248, y: 44  },
  batt:  { x: 52,  y: 176 },
  load:  { x: 248, y: 176 },
};
const R = 22; // circle radius

// Connection points on circle edges closest to hub
const conn = {
  solar: { x: N.solar.x + R * 0.85, y: N.solar.y + R * 0.53 },
  grid:  { x: N.grid.x  - R * 0.85, y: N.grid.y  + R * 0.53 },
  batt:  { x: N.batt.x  + R * 0.85, y: N.batt.y  - R * 0.53 },
  load:  { x: N.load.x  - R * 0.85, y: N.load.y  - R * 0.53 },
};

// S-curve: C bezier from p1 to p2, inflection midpoint on x-axis
function curve(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const mx = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
}

// All path variants
const P = {
  solarToHub: curve(conn.solar, HUB),
  hubToLoad:  curve(HUB, conn.load),
  // Battery: direction depends on charge/discharge
  battToHub:  curve(conn.batt, HUB),
  hubToBatt:  curve(HUB, conn.batt),
  // Grid: direction depends on import/export
  hubToGrid:  curve(HUB, conn.grid),
  gridToHub:  curve(conn.grid, HUB),
};

// Track paths (one per arm, drawn both directions = just one of the above)
const TRACKS = [P.solarToHub, P.hubToLoad, P.battToHub, P.gridToHub];

// Dash cycle length: dasharray "12 8" → period 20
const DASH_PERIOD = 20;

export function EnergyFlowBlock({
  pvKw,
  loadKw,
  gridKw,
  battKw,
  battSoc,
}: {
  pvKw: number;
  loadKw: number;
  gridKw: number;
  battKw: number;
  battSoc: number | null;
}) {
  // ── Direction / activity flags ─────────────────────────────────────────
  const isPvActive   = pvKw   > 0.01;
  const isLoadActive = loadKw > 0.01;
  const isExporting  = gridKw >  0.01;  // hub → grid
  const isImporting  = gridKw < -0.01;  // grid → hub
  const isDischarging = battKw >  0.01; // batt → hub
  const isCharging    = battKw < -0.01; // hub → batt
  const isBattActive  = isDischarging || isCharging;
  const isGridActive  = isExporting || isImporting;

  const gridColor = isExporting ? CLR.gridExp : CLR.gridImp;
  const battColor = CLR.batt;

  // ── Single animation loop for all dashes ──────────────────────────────
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  // strokeDashoffset from 0 → -20 (one full cycle of dash+gap=20)
  const dashOffset = anim.interpolate({
    inputRange:  [0, 1],
    // react-native-svg expects numeric dash offsets on Android.
    // Using string output here can trigger: "java.lang.String cannot be cast to java.lang.Double".
    outputRange: [0, -DASH_PERIOD],
  });

  // ── Node pulse animations ─────────────────────────────────────────────
  const pulseFor = (active: boolean) => {
    const p = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      if (!active) { p.setValue(1); return; }
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(p, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(p, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [active]);
    return p;
  };

  const pvPulse   = pulseFor(isPvActive);
  const loadPulse = pulseFor(isLoadActive);
  const battPulse = pulseFor(isBattActive);
  const gridPulse = pulseFor(isGridActive);

  // ── Rendered size (use fixed aspect ratio) ────────────────────────────
  // We constrain by aspect ratio; SVG preserves it via viewBox.
  const fmt = (kw: number) =>
    kw >= 1 ? `${kw.toFixed(1)} kW` : `${(kw * 1000).toFixed(0)} W`;

  const statusText =
    isPvActive && !isImporting
      ? 'Solar powering load'
      : isExporting
      ? 'Exporting surplus to grid'
      : isImporting
      ? 'Drawing power from grid'
      : 'No active solar generation';

  const statusOk = isPvActive && !isImporting;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ENERGY FLOW</Text>
        <View style={[styles.livePill, { borderColor: CLR.gridExp + '40', backgroundColor: CLR.gridExp + '14' }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveLabel, { color: CLR.gridExp }]}>LIVE</Text>
        </View>
      </View>

      {/* Diagram */}
      <View style={styles.diagram}>
        {/* ── SVG layer ── */}
        <Svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={StyleSheet.absoluteFillObject}
          preserveAspectRatio="none"
        >
          {/* Track lines — always visible, very subtle */}
          {TRACKS.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={CLR.track}
              strokeWidth={1.5}
              strokeDasharray="6 5"
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* ── Active beams — directional ── */}
          {/* Solar → Hub (always solar→hub when active) */}
          {isPvActive && (
            <AnimatedPath
              d={P.solarToHub}
              stroke={CLR.solar}
              strokeWidth={2.5}
              strokeDasharray="12 8"
              strokeLinecap="round"
              strokeDashoffset={dashOffset as any}
              fill="none"
              opacity={0.85}
            />
          )}

          {/* Hub → Load (always hub→load when active) */}
          {isLoadActive && (
            <AnimatedPath
              d={P.hubToLoad}
              stroke={CLR.load}
              strokeWidth={2.5}
              strokeDasharray="12 8"
              strokeLinecap="round"
              strokeDashoffset={dashOffset as any}
              fill="none"
              opacity={0.75}
            />
          )}

          {/* Battery: direction-aware */}
          {isBattActive && (
            <AnimatedPath
              d={isDischarging ? P.battToHub : P.hubToBatt}
              stroke={battColor}
              strokeWidth={2.5}
              strokeDasharray="12 8"
              strokeLinecap="round"
              strokeDashoffset={dashOffset as any}
              fill="none"
              opacity={0.80}
            />
          )}

          {/* Grid: direction-aware */}
          {isGridActive && (
            <AnimatedPath
              d={isExporting ? P.hubToGrid : P.gridToHub}
              stroke={gridColor}
              strokeWidth={2.5}
              strokeDasharray="12 8"
              strokeLinecap="round"
              strokeDashoffset={dashOffset as any}
              fill="none"
              opacity={0.80}
            />
          )}

          {/* ── Hub center circle ── */}
          <Circle cx={HUB.x} cy={HUB.y} r={16} fill={CLR.surface2} stroke={CLR.hub + '60'} strokeWidth={1.5} />
          <Circle cx={HUB.x} cy={HUB.y} r={6}  fill={CLR.hub} opacity={0.9} />
          <Circle cx={HUB.x} cy={HUB.y} r={10} fill="none" stroke={CLR.hub} strokeWidth={0.8} opacity={0.35} />
        </Svg>

        {/* ── Node overlays — absolute positioned ── */}

        {/* Solar — top-left */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeTL,
            {
              transform: [
                { translateX: -NODE_W / 2 },
                // Move solar node slightly down so solar->hub beam
                // doesn't visually pass under the battery node overlay.
                { translateY: -R },
                { scale: pvPulse },
              ],
            },
          ]}
        >
          <View style={[styles.nodeCircle, {
            borderColor: isPvActive ? CLR.solar : CLR.track,
            backgroundColor: isPvActive ? CLR.solar + '18' : CLR.surface2,
          }]}>
            <Text style={[styles.nodeIcon, { color: isPvActive ? CLR.solar : CLR.dim }]}>☀</Text>
          </View>
          <Text style={[styles.nodeLabel, isPvActive && { color: CLR.solar }]}>SOLAR</Text>
          <Text style={styles.nodeValue}>{isPvActive ? fmt(pvKw) : '—'}</Text>
        </Animated.View>

        {/* Grid — top-right */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeTR,
            {
              transform: [
                { translateX: -NODE_W / 2 },
                { translateY: -R },
                { scale: gridPulse },
              ],
            },
          ]}
        >
          <View style={[styles.nodeCircle, {
            borderColor: isGridActive ? gridColor : CLR.track,
            backgroundColor: isGridActive ? gridColor + '18' : CLR.surface2,
          }]}>
            <Text style={[styles.nodeIcon, { color: isGridActive ? gridColor : CLR.dim }]}>⚡</Text>
          </View>
          <Text style={[styles.nodeLabel, isGridActive && { color: gridColor }]}>GRID</Text>
          <Text style={styles.nodeValue}>
            {isGridActive ? fmt(Math.abs(gridKw)) : '—'}
          </Text>
          {isGridActive && (
            <Text style={[styles.nodeDir, { color: gridColor }]}>
              {isExporting ? '↑ Export' : '↓ Import'}
            </Text>
          )}
        </Animated.View>

        {/* Battery — bottom-left */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeBL,
            {
              transform: [
                { translateX: -NODE_W / 2 },
                // Move battery node slightly down so it doesn't visually cover solar->load label area
                { translateY: -R + 4 },
                { scale: battPulse },
              ],
            },
          ]}
        >
          <View style={[styles.nodeCircle, {
            borderColor: isBattActive ? battColor : CLR.track,
            backgroundColor: isBattActive ? battColor + '18' : CLR.surface2,
          }]}>
            <Text style={[styles.nodeIcon, { color: isBattActive ? battColor : CLR.dim }]}>🔋</Text>
          </View>
          <Text style={[styles.nodeLabel, isBattActive && { color: battColor }]}>
            {battSoc != null ? `BAT ${Math.round(battSoc)}%` : 'BATTERY'}
          </Text>
          <Text style={styles.nodeValue}>
            {isBattActive ? fmt(Math.abs(battKw)) : '—'}
          </Text>
          {isBattActive && (
            <Text style={[styles.nodeDir, { color: battColor }]}>
              {isDischarging ? '↑ Discharge' : '↓ Charge'}
            </Text>
          )}
        </Animated.View>

        {/* Load — bottom-right */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeBR,
            {
              transform: [
                { translateX: -NODE_W / 2 },
                { translateY: -R },
                { scale: loadPulse },
              ],
            },
          ]}
        >
          <View style={[styles.nodeCircle, {
            borderColor: isLoadActive ? CLR.load : CLR.track,
            backgroundColor: isLoadActive ? CLR.load + '18' : CLR.surface2,
          }]}>
            <Text style={[styles.nodeIcon, { color: isLoadActive ? CLR.load : CLR.dim }]}>🏠</Text>
          </View>
          <Text style={[styles.nodeLabel, isLoadActive && { color: CLR.load }]}>LOAD</Text>
          <Text style={styles.nodeValue}>{isLoadActive ? fmt(loadKw) : '—'}</Text>
        </Animated.View>
      </View>

      {/* Status footer */}
      <View style={styles.footer}>
        <View style={[styles.statusDot, { backgroundColor: statusOk ? CLR.gridExp : CLR.batt }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const NODE_W = 72;

const styles = StyleSheet.create({
  root: {
    backgroundColor: CLR.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    color: 'rgba(237,242,247,0.35)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: CLR.gridExp,
  },
  liveLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Diagram container — fixed aspect ratio
  diagram: {
    width: '100%',
    // Give the diagram a bit more vertical room so node overlays don't visually
    // touch the footer across device widths.
    height: 260,
    position: 'relative',
  },

  // Node base
  node: {
    position: 'absolute',
    width: NODE_W,
    alignItems: 'center',
  },
  // Corner positions — center of each node on the diagram
  // Nodes are offset so the circle center aligns with SVG coord percentages
  nodeTL: { left: `${(N.solar.x / VB_W) * 100}%`, top: `${(N.solar.y / VB_H) * 100}%`, transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }] },
  nodeTR: { left: `${(N.grid.x  / VB_W) * 100}%`, top: `${(N.grid.y  / VB_H) * 100}%`, transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }] },
  nodeBL: { left: `${(N.batt.x  / VB_W) * 100}%`, top: `${(N.batt.y  / VB_H) * 100}%`, transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }] },
  nodeBR: { left: `${(N.load.x  / VB_W) * 100}%`, top: `${(N.load.y  / VB_H) * 100}%`, transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }] },

  nodeCircle: {
    width: R * 2,
    height: R * 2,
    borderRadius: R,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nodeIcon:  { fontSize: 16, lineHeight: 20 },
  nodeLabel: { color: 'rgba(237,242,247,0.35)', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  nodeValue: { color: 'rgba(237,242,247,0.70)', fontSize: 11, fontWeight: '700', marginTop: 1 },
  nodeDir:   { fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Node dim color
  dim: { color: 'rgba(237,242,247,0.22)' },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: '10%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statusText: {
    color: 'rgba(237,242,247,0.40)',
    fontSize: 11,
    fontWeight: '500',
  },
});
