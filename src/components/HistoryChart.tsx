import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Dimensions } from 'react-native';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { Defs, LinearGradient, Stop } from 'react-native-svg';
import { AppTheme } from '../theme/theme';

export type HistoryDataPoint = {
  timestamp: string;
  pvKw: number;
  loadKw: number;
  gridKw: number;
  soc: number;
  rawTs: number;
};

interface HistoryChartProps {
  data: HistoryDataPoint[];
  dateRange: '24h' | '7d' | '30d';
}

const PV_COLOR   = AppTheme.colors.accent;   // #00a63e
const LOAD_COLOR = '#8b5cf6';
const GRID_COLOR = '#3b82f6';
const SOC_COLOR  = AppTheme.colors.warning;  // #f59e0b

const SERIES_CONFIG = [
  { key: 'pvKw',   label: 'Solar',  color: PV_COLOR,   unit: 'kW' },
  { key: 'loadKw', label: 'Load',   color: LOAD_COLOR, unit: 'kW' },
  { key: 'gridKw', label: 'Grid',   color: GRID_COLOR, unit: 'kW' },
  { key: 'soc',    label: 'SOC',    color: SOC_COLOR,  unit: '%'  },
] as const;

type SeriesKey = typeof SERIES_CONFIG[number]['key'];

export function HistoryChart({ data, dateRange }: HistoryChartProps) {
  const win = useWindowDimensions();
  const fallback = Dimensions.get('window');
  const measuredWidth = win.width ?? fallback.width;
  const width = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 360;
  const CHART_WIDTH = Math.max(280, Math.round(width - 32));
  const CHART_HEIGHT = 300;
  const tickCount = width < 375 ? 4 : 5;

  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  const toggle = (key: SeriesKey) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const series = useMemo(() => {
    const cleaned = data
      .filter(d =>
        Number.isFinite(d.rawTs) &&
        Number.isFinite(d.pvKw) &&
        Number.isFinite(d.loadKw) &&
        Number.isFinite(d.gridKw) &&
        Number.isFinite(d.soc)
      )
      .sort((a, b) => a.rawTs - b.rawTs);
    const deduped: HistoryDataPoint[] = [];
    for (const p of cleaned) {
      const last = deduped[deduped.length - 1];
      if (last && last.rawTs === p.rawTs) deduped[deduped.length - 1] = p;
      else deduped.push(p);
    }
    return deduped;
  }, [data]);

  if (series.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height: CHART_HEIGHT }]}>
        <Text style={styles.emptyText}>Not enough data to chart.</Text>
      </View>
    );
  }

  const latestPoint = series[series.length - 1];

  let maxPower = 0;
  series.forEach(d => {
    if (d.pvKw > maxPower) maxPower = d.pvKw;
    if (d.loadKw > maxPower) maxPower = d.loadKw;
    if (Math.abs(d.gridKw) > maxPower) maxPower = Math.abs(d.gridKw);
  });
  maxPower = maxPower === 0 ? 10 : maxPower * 1.15;

  const formatXAxis = (ms: number) => {
    const d = new Date(ms);
    if (dateRange === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const finalW = Math.round(Math.max(1, CHART_WIDTH));
  const finalH = Math.round(Math.max(1, CHART_HEIGHT));

  const pvData   = series.map(d => ({ x: d.rawTs, y: d.pvKw }));
  const loadData = series.map(d => ({ x: d.rawTs, y: d.loadKw }));
  const gridData = series.map(d => ({ x: d.rawTs, y: d.gridKw }));
  const socData  = series.map(d => ({ x: d.rawTs, y: (d.soc / 100) * maxPower }));

  const minX = series[0].rawTs;
  const maxX = series[series.length - 1].rawTs;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>ENERGY HISTORY</Text>
        <Text style={styles.latestTime}>
          {new Date(latestPoint.rawTs).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Live values */}
      <View style={styles.liveRow}>
        {SERIES_CONFIG.map(s => (
          <Text key={s.key} style={[styles.liveValue, { color: s.color }]}>
            {s.label} {s.key === 'soc'
              ? `${Math.round(latestPoint.soc)}%`
              : `${latestPoint[s.key].toFixed(2)} kW`}
          </Text>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartArea}>
        <VictoryChart
          width={finalW}
          height={finalH}
          padding={{ top: 8, bottom: 48, left: 44, right: 12 }}
          domain={{ x: [series[0].rawTs, series[series.length - 1].rawTs], y: [0, maxPower] }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              labels={({ datum }: { datum: { y: number } }) =>
                datum.y != null ? datum.y.toFixed(2) : ''
              }
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{
                    fill: AppTheme.colors.surface,
                    stroke: AppTheme.colors.border,
                    strokeWidth: 1,
                  }}
                  style={{
                    fill: AppTheme.colors.text,
                    fontSize: 10,
                    fontWeight: '700',
                  } as any}
                  cornerRadius={6}
                  flyoutPadding={{ top: 5, bottom: 5, left: 8, right: 8 }}
                />
              }
            />
          }
        >
          <Defs>
            <LinearGradient id="ghPv" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={PV_COLOR}   stopOpacity={0.45} />
              <Stop offset="100%" stopColor={PV_COLOR}   stopOpacity={0.02} />
            </LinearGradient>
            <LinearGradient id="ghLoad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={LOAD_COLOR} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={LOAD_COLOR} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {/* X axis */}
          <VictoryAxis
            tickFormat={formatXAxis}
            tickCount={tickCount}
            style={{
              axis: { stroke: AppTheme.colors.border, strokeWidth: 1 },
              tickLabels: {
                fill: AppTheme.colors.dimText,
                fontSize: 10,
                padding: 8,
                angle: -30,
                textAnchor: 'end',
              },
              grid: { stroke: 'transparent' },
            }}
          />

          {/* Y axis — power (kW) */}
          <VictoryAxis
            dependentAxis
            tickFormat={t => `${Number(t).toFixed(1)}`}
            tickCount={5}
            style={{
              axis: { stroke: 'transparent' },
              tickLabels: { fill: AppTheme.colors.dimText, fontSize: 10, padding: 5 },
              grid: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '4 4' },
            }}
          />

          {/* Solar area */}
          {!hidden.has('pvKw') && (
            <VictoryArea
              data={pvData}
              interpolation="natural"
              style={{
                data: {
                  fill: 'url(#ghPv)',
                  stroke: PV_COLOR,
                  strokeWidth: 2.5,
                },
              }}
            />
          )}

          {/* Load area */}
          {!hidden.has('loadKw') && (
            <VictoryArea
              data={loadData}
              interpolation="natural"
              style={{
                data: {
                  fill: 'url(#ghLoad)',
                  stroke: LOAD_COLOR,
                  strokeWidth: 1.8,
                },
              }}
            />
          )}

          {/* Grid line */}
          {!hidden.has('gridKw') && (
            <VictoryLine
              data={gridData}
              interpolation="natural"
              style={{
                data: {
                  stroke: GRID_COLOR,
                  strokeWidth: 1.5,
                  strokeDasharray: '6 3',
                  opacity: 0.85,
                },
              }}
            />
          )}

          {/* SOC line — scaled to power domain */}
          {!hidden.has('soc') && (
            <VictoryLine
              data={socData}
              interpolation="natural"
              style={{
                data: {
                  stroke: SOC_COLOR,
                  strokeWidth: 1.5,
                  strokeDasharray: '3 3',
                  opacity: 0.75,
                },
              }}
            />
          )}
        </VictoryChart>
      </View>

      {/* Tappable legend chips */}
      <View style={styles.legend}>
        {SERIES_CONFIG.map(s => {
          const isHidden = hidden.has(s.key);
          return (
            <Pressable
              key={s.key}
              onPress={() => toggle(s.key)}
              style={[
                styles.legendChip,
                { borderColor: isHidden ? AppTheme.colors.border : `${s.color}50` },
                isHidden && styles.legendChipHidden,
              ]}
            >
              <View style={[
                styles.legendDot,
                { backgroundColor: isHidden ? AppTheme.colors.border : s.color },
              ]} />
              <Text style={[
                styles.legendLabel,
                { color: isHidden ? AppTheme.colors.dimText : s.color },
              ]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },
  sectionLabel: {
    color: AppTheme.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  latestTime: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
  },
  liveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 10,
  },
  liveValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 0,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppTheme.radii.full,
    borderWidth: 1,
    backgroundColor: `${AppTheme.colors.surface}`,
    minHeight: 30,
  },
  legendChipHidden: {
    opacity: 0.45,
    backgroundColor: 'transparent',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 16,
  },
  emptyText: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
  },
});
