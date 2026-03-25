import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

import { AppTheme } from '../theme/theme';

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

// ── SVG geometry (viewBox 300×220) ─────────────────────────────────────────
const VB_W = 300;
const VB_H = 220;
const HUB  = { x: 150, y: 110 };
const N = {
  solar: { x: 52,  y: 44  },
  grid:  { x: 248, y: 44  },
  batt:  { x: 52,  y: 176 },
  load:  { x: 248, y: 176 },
};
const R = 22;

const conn = {
  solar: { x: N.solar.x + R * 0.85, y: N.solar.y + R * 0.53 },
  grid:  { x: N.grid.x  - R * 0.85, y: N.grid.y  + R * 0.53 },
  batt:  { x: N.batt.x  + R * 0.85, y: N.batt.y  - R * 0.53 },
  load:  { x: N.load.x  - R * 0.85, y: N.load.y  - R * 0.53 },
};

function curve(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const mx = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
}

const P = {
  solarToHub: curve(conn.solar, HUB),
  hubToLoad:  curve(HUB, conn.load),
  battToHub:  curve(conn.batt, HUB),
  hubToBatt:  curve(HUB, conn.batt),
  hubToGrid:  curve(HUB, conn.grid),
  gridToHub:  curve(conn.grid, HUB),
};

const TRACKS = [P.solarToHub, P.hubToLoad, P.battToHub, P.gridToHub];
const DASH_PERIOD = 20;

// ── Proper custom hook for pulse animation ─────────────────────────────────
function usePulse(active: boolean): Animated.Value {
  const p = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      p.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1.08, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(p, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, p]);
  return p;
}

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
  const isPvActive    = pvKw   > 0.01;
  const isLoadActive  = loadKw > 0.01;
  const isExporting   = gridKw >  0.01;
  const isImporting   = gridKw < -0.01;
  const isDischarging = battKw >  0.01;
  const isCharging    = battKw < -0.01;
  const isBattActive  = isDischarging || isCharging;
  const isGridActive  = isExporting || isImporting;

  const gridColor = isExporting ? AppTheme.colors.accent : AppTheme.colors.info;

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

  const dashOffset = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -DASH_PERIOD],
  });

  // ── Pulse animations (proper custom hooks — no Rules of Hooks violation) ─
  const pvPulse   = usePulse(isPvActive);
  const loadPulse = usePulse(isLoadActive);
  const battPulse = usePulse(isBattActive);
  const gridPulse = usePulse(isGridActive);

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
        <View style={[styles.livePill, {
          borderColor: AppTheme.colors.borderAccent,
          backgroundColor: AppTheme.colors.accentSoft,
        }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveLabel, { color: AppTheme.colors.accent }]}>LIVE</Text>
        </View>
      </View>

      {/* Diagram */}
      <View style={styles.diagram}>
        {/* SVG layer */}
        <Svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={StyleSheet.absoluteFillObject}
          preserveAspectRatio="none"
        >
          {/* Track lines */}
          {TRACKS.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={AppTheme.colors.border}
              strokeWidth={1.5}
              strokeDasharray="6 5"
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Solar → Hub */}
          {isPvActive && (
            <AnimatedPath
              d={P.solarToHub}
              stroke={AppTheme.colors.warning}
              strokeWidth={2.5}
              strokeDasharray="12 8"
              strokeLinecap="round"
              strokeDashoffset={dashOffset as any}
              fill="none"
              opacity={0.85}
            />
          )}

          {/* Hub → Load */}
          {isLoadActive && (
            <AnimatedPath
              d={P.hubToLoad}
              stroke={AppTheme.colors.danger}
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
              stroke={AppTheme.colors.warning}
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

          {/* Hub center circle */}
          <Circle cx={HUB.x} cy={HUB.y} r={16} fill={AppTheme.colors.cardElevated} stroke={AppTheme.colors.indigo + '60'} strokeWidth={1.5} />
          <Circle cx={HUB.x} cy={HUB.y} r={6}  fill={AppTheme.colors.indigo} opacity={0.9} />
          <Circle cx={HUB.x} cy={HUB.y} r={10} fill="none" stroke={AppTheme.colors.indigo} strokeWidth={0.8} opacity={0.35} />
        </Svg>

        {/* Solar — top-left */}
        <Animated.View style={[styles.node, styles.nodeTL, { transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }, { scale: pvPulse }] }]}>
          <View style={[styles.nodeCircle, {
            borderColor: isPvActive ? AppTheme.colors.warning : AppTheme.colors.border,
            backgroundColor: isPvActive ? AppTheme.colors.warningSoft : AppTheme.colors.cardElevated,
          }]}>
            <Ionicons name="sunny" size={16} color={isPvActive ? AppTheme.colors.warning : AppTheme.colors.dimText} />
          </View>
          <Text style={[styles.nodeLabel, isPvActive && { color: AppTheme.colors.warning }]}>SOLAR</Text>
          <Text style={styles.nodeValue}>{isPvActive ? fmt(pvKw) : '—'}</Text>
        </Animated.View>

        {/* Grid — top-right */}
        <Animated.View style={[styles.node, styles.nodeTR, { transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }, { scale: gridPulse }] }]}>
          <View style={[styles.nodeCircle, {
            borderColor: isGridActive ? gridColor : AppTheme.colors.border,
            backgroundColor: isGridActive
              ? (isExporting ? AppTheme.colors.accentSoft : AppTheme.colors.infoSoft)
              : AppTheme.colors.cardElevated,
          }]}>
            <Ionicons name="flash" size={16} color={isGridActive ? gridColor : AppTheme.colors.dimText} />
          </View>
          <Text style={[styles.nodeLabel, isGridActive && { color: gridColor }]}>GRID</Text>
          <Text style={styles.nodeValue}>{isGridActive ? fmt(Math.abs(gridKw)) : '—'}</Text>
          {isGridActive && (
            <Text style={[styles.nodeDir, { color: gridColor }]}>
              {isExporting ? '↑ Export' : '↓ Import'}
            </Text>
          )}
        </Animated.View>

        {/* Battery — bottom-left */}
        <Animated.View style={[styles.node, styles.nodeBL, { transform: [{ translateX: -NODE_W / 2 }, { translateY: -R + 4 }, { scale: battPulse }] }]}>
          <View style={[styles.nodeCircle, {
            borderColor: isBattActive ? AppTheme.colors.warning : AppTheme.colors.border,
            backgroundColor: isBattActive ? AppTheme.colors.warningSoft : AppTheme.colors.cardElevated,
          }]}>
            <Ionicons name="battery-half" size={16} color={isBattActive ? AppTheme.colors.warning : AppTheme.colors.dimText} />
          </View>
          <Text style={[styles.nodeLabel, isBattActive && { color: AppTheme.colors.warning }]}>
            {battSoc != null ? `BAT ${Math.round(battSoc)}%` : 'BATTERY'}
          </Text>
          <Text style={styles.nodeValue}>{isBattActive ? fmt(Math.abs(battKw)) : '—'}</Text>
          {isBattActive && (
            <Text style={[styles.nodeDir, { color: AppTheme.colors.warning }]}>
              {isDischarging ? '↑ Discharge' : '↓ Charge'}
            </Text>
          )}
        </Animated.View>

        {/* Load — bottom-right */}
        <Animated.View style={[styles.node, styles.nodeBR, { transform: [{ translateX: -NODE_W / 2 }, { translateY: -R }, { scale: loadPulse }] }]}>
          <View style={[styles.nodeCircle, {
            borderColor: isLoadActive ? AppTheme.colors.danger : AppTheme.colors.border,
            backgroundColor: isLoadActive ? AppTheme.colors.dangerSoft : AppTheme.colors.cardElevated,
          }]}>
            <Ionicons name="home" size={16} color={isLoadActive ? AppTheme.colors.danger : AppTheme.colors.dimText} />
          </View>
          <Text style={[styles.nodeLabel, isLoadActive && { color: AppTheme.colors.danger }]}>LOAD</Text>
          <Text style={styles.nodeValue}>{isLoadActive ? fmt(loadKw) : '—'}</Text>
        </Animated.View>
      </View>

      {/* Status footer */}
      <View style={styles.footer}>
        <View style={[styles.statusDot, { backgroundColor: statusOk ? AppTheme.colors.accent : AppTheme.colors.warning }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const NODE_W = 72;

const styles = StyleSheet.create({
  root: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
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
    color: AppTheme.colors.dimText,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: AppTheme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.accent,
  },
  liveLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  diagram: {
    width: '100%',
    height: 260,
    position: 'relative',
  },

  node: {
    position: 'absolute',
    width: NODE_W,
    alignItems: 'center',
  },
  nodeTL: { left: `${(N.solar.x / VB_W) * 100}%`, top: `${(N.solar.y / VB_H) * 100}%` },
  nodeTR: { left: `${(N.grid.x  / VB_W) * 100}%`, top: `${(N.grid.y  / VB_H) * 100}%` },
  nodeBL: { left: `${(N.batt.x  / VB_W) * 100}%`, top: `${(N.batt.y  / VB_H) * 100}%` },
  nodeBR: { left: `${(N.load.x  / VB_W) * 100}%`, top: `${(N.load.y  / VB_H) * 100}%` },

  nodeCircle: {
    width: R * 2,
    height: R * 2,
    borderRadius: R,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nodeLabel: { color: AppTheme.colors.dimText,   fontSize: 8,  fontWeight: '700', letterSpacing: 1.2 },
  nodeValue: { color: AppTheme.colors.mutedText, fontSize: 11, fontWeight: '700', marginTop: 1 },
  nodeDir:   { fontSize: 9, fontWeight: '600', marginTop: 1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: '10%',
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.borderMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statusText: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    fontWeight: '500',
  },
});
