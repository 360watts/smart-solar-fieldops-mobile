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

export type ForecastDataPoint = {
  timestamp: string;
  rawTs: number;
  p10: number;
  p50: number;
  p90: number;
  ghi: number;
};

interface ForecastChartProps {
  data: ForecastDataPoint[];
  forecastWindow: 'today' | '3d' | '7d';
}

const P50_COLOR = AppTheme.colors.accent;       // #00a63e
const GHI_COLOR = '#f59e0b';                    // amber — solar irradiance

type ToggleKey = 'band' | 'p50' | 'ghi';

export function ForecastChart({ data, forecastWindow }: ForecastChartProps) {
  const win = useWindowDimensions();
  const fallback = Dimensions.get('window');
  const measuredWidth = win.width ?? fallback.width;
  const width = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 360;
  const CHART_WIDTH = Math.max(280, Math.round(width - 32));
  const CHART_HEIGHT = 220;
  const tickCount = width < 375 ? 4 : 5;

  const [hidden, setHidden] = useState<Set<ToggleKey>>(new Set());
  const toggle = (key: ToggleKey) => {
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
        Number.isFinite(d.p10) &&
        Number.isFinite(d.p50) &&
        Number.isFinite(d.p90)
      )
      .sort((a, b) => a.rawTs - b.rawTs);
    const deduped: ForecastDataPoint[] = [];
    for (const point of cleaned) {
      const last = deduped[deduped.length - 1];
      if (last && last.rawTs === point.rawTs) deduped[deduped.length - 1] = point;
      else deduped.push(point);
    }
    return deduped;
  }, [data]);

  if (series.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height: CHART_HEIGHT }]}>
        <Text style={styles.emptyText}>Not enough forecast data to chart.</Text>
      </View>
    );
  }

  const nowMs = Date.now();

  // Peak p50 forecast
  let peakP50 = 0;
  let peakTs = 0;
  series.forEach(d => {
    if (d.p50 > peakP50) { peakP50 = d.p50; peakTs = d.rawTs; }
  });

  const hasGhi = series.some(d => Number.isFinite(d.ghi) && d.ghi > 0);

  let maxKw = 0;
  series.forEach(d => {
    if (d.p90 > maxKw) maxKw = d.p90;
  });
  maxKw = maxKw === 0 ? 10 : maxKw * 1.15;

  // Scale GHI (W/m²) into power domain for overlay — max GHI ~1200 W/m²
  const maxGhi = Math.max(...series.map(d => d.ghi || 0));
  const ghiScale = maxGhi > 0 ? (maxKw * 0.8) / maxGhi : 1;

  const formatXAxis = (ms: number) => {
    const d = new Date(ms);
    if (forecastWindow === 'today')
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const finalW = Math.round(Math.max(1, CHART_WIDTH));
  const finalH = Math.round(Math.max(1, CHART_HEIGHT));

  // "Now" line: only show if now is within forecast range
  const nowInRange = nowMs >= series[0].rawTs && nowMs <= series[series.length - 1].rawTs;

  const bandData = series.map(d => ({
    x: d.rawTs,
    y: d.p90,
    y0: d.p10,
    tooltipLabel: `P50 ${d.p50.toFixed(2)} kW\n${d.p10.toFixed(1)}–${d.p90.toFixed(1)} kW`,
  }));
  const p50Data = series.map(d => ({
    x: d.rawTs,
    y: d.p50,
    tooltipLabel: `P50 ${d.p50.toFixed(2)} kW`,
  }));
  const p90Data = series.map(d => ({
    x: d.rawTs, y: d.p90,
    tooltipLabel: `P90 ${d.p90.toFixed(2)} kW`,
  }));
  const p10Data = series.map(d => ({
    x: d.rawTs, y: d.p10,
    tooltipLabel: `P10 ${d.p10.toFixed(2)} kW`,
  }));
  const ghiData = series.map(d => ({
    x: d.rawTs,
    y: (d.ghi || 0) * ghiScale,
    tooltipLabel: `GHI ${(d.ghi || 0).toFixed(0)} W/m²`,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>SOLAR FORECAST</Text>
        <Text style={styles.peakBadge}>
          Peak {peakP50.toFixed(2)} kW · {new Date(peakTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {/* Live P50 + band summary */}
      <View style={styles.valueRow}>
        <View style={styles.valuePill}>
          <View style={[styles.valueDot, { backgroundColor: P50_COLOR }]} />
          <Text style={[styles.valueLabel, { color: P50_COLOR }]}>
            P50 {series[series.length - 1].p50.toFixed(2)} kW
          </Text>
        </View>
        <View style={styles.valuePill}>
          <View style={[styles.valueDot, { backgroundColor: `${P50_COLOR}55` }]} />
          <Text style={[styles.valueLabel, { color: `${P50_COLOR}AA` }]}>
            {series[series.length - 1].p10.toFixed(1)}–
            {series[series.length - 1].p90.toFixed(1)} kW
          </Text>
        </View>
        {hasGhi && (
          <View style={styles.valuePill}>
            <View style={[styles.valueDot, { backgroundColor: GHI_COLOR }]} />
            <Text style={[styles.valueLabel, { color: GHI_COLOR }]}>
              GHI {(series[series.length - 1].ghi || 0).toFixed(0)} W/m²
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartArea}>
        <VictoryChart
          width={finalW}
          height={finalH}
          padding={{ top: 8, bottom: 48, left: 44, right: 12 }}
          domain={{ x: [series[0].rawTs, series[series.length - 1].rawTs], y: [0, maxKw] }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              labels={({ datum }: { datum: any }) => datum.tooltipLabel ?? ''}
              labelComponent={
                <VictoryTooltip
                  activateData
                  flyoutStyle={{
                    fill: AppTheme.colors.surface,
                    stroke: AppTheme.colors.borderAccent,
                    strokeWidth: 1,
                  }}
                  style={{
                    fill: AppTheme.colors.text,
                    fontSize: 10,
                    fontWeight: '700',
                  } as any}
                  cornerRadius={6}
                  flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
                />
              }
            />
          }
        >
          <Defs>
            {/* Confidence band — rich green gradient */}
            <LinearGradient id="fcBand" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"    stopColor={P50_COLOR} stopOpacity={0.38} />
              <Stop offset="60%"   stopColor={P50_COLOR} stopOpacity={0.12} />
              <Stop offset="100%"  stopColor={P50_COLOR} stopOpacity={0.03} />
            </LinearGradient>
            {/* GHI irradiance gradient */}
            <LinearGradient id="fcGhi" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={GHI_COLOR} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={GHI_COLOR} stopOpacity={0.02} />
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

          {/* Y axis */}
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

          {/* GHI area (behind everything) */}
          {hasGhi && !hidden.has('ghi') && (
            <VictoryArea
              data={ghiData}
              interpolation="natural"
              style={{
                data: {
                  fill: 'url(#fcGhi)',
                  stroke: GHI_COLOR,
                  strokeWidth: 1,
                  opacity: 0.7,
                },
              }}
            />
          )}

          {/* Confidence band fill */}
          {!hidden.has('band') && (
            <VictoryArea
              data={bandData}
              interpolation="natural"
              style={{
                data: {
                  fill: 'url(#fcBand)',
                  stroke: 'transparent',
                },
              }}
            />
          )}

          {/* P90 boundary line */}
          {!hidden.has('band') && (
            <VictoryLine
              data={p90Data}
              interpolation="natural"
              style={{
                data: {
                  stroke: `${P50_COLOR}55`,
                  strokeWidth: 1,
                  strokeDasharray: '4 3',
                },
              }}
            />
          )}

          {/* P10 boundary line */}
          {!hidden.has('band') && (
            <VictoryLine
              data={p10Data}
              interpolation="natural"
              style={{
                data: {
                  stroke: `${P50_COLOR}55`,
                  strokeWidth: 1,
                  strokeDasharray: '4 3',
                },
              }}
            />
          )}

          {/* P50 glow (thick, low opacity — rendered first) */}
          {!hidden.has('p50') && (
            <VictoryLine
              data={p50Data}
              interpolation="natural"
              style={{
                data: {
                  stroke: `${P50_COLOR}40`,
                  strokeWidth: 5,
                },
              }}
            />
          )}

          {/* P50 crisp line (on top) */}
          {!hidden.has('p50') && (
            <VictoryLine
              data={p50Data}
              interpolation="natural"
              style={{
                data: {
                  stroke: P50_COLOR,
                  strokeWidth: 2.5,
                },
              }}
            />
          )}

          {/* "Now" vertical cursor */}
          {nowInRange && (
            <VictoryLine
              data={[
                { x: nowMs, y: 0 },
                { x: nowMs, y: maxKw },
              ]}
              style={{
                data: {
                  stroke: AppTheme.colors.warning,
                  strokeWidth: 1.5,
                  strokeDasharray: '3 4',
                  opacity: 0.75,
                },
              }}
            />
          )}
        </VictoryChart>
      </View>

      {/* Tappable legend chips */}
      <View style={styles.legend}>
        {[
          { key: 'p50' as ToggleKey, label: 'P50 Median', color: P50_COLOR, dash: false },
          { key: 'band' as ToggleKey, label: 'P10–P90 Band', color: `${P50_COLOR}99`, dash: true },
          ...(hasGhi
            ? [{ key: 'ghi' as ToggleKey, label: 'Irradiance', color: GHI_COLOR, dash: false }]
            : []),
        ].map(s => {
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
                styles.legendLine,
                { backgroundColor: isHidden ? AppTheme.colors.border : s.color },
                s.dash && styles.legendLineDashed,
              ]} />
              <Text style={[
                styles.legendLabel,
                { color: isHidden ? AppTheme.colors.dimText : AppTheme.colors.mutedText },
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
  peakBadge: {
    color: AppTheme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: `${AppTheme.colors.accent}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppTheme.radii.full,
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  valueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  valueLabel: {
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
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppTheme.radii.full,
    borderWidth: 1,
    backgroundColor: AppTheme.colors.surface,
    minHeight: 30,
  },
  legendChipHidden: {
    opacity: 0.45,
    backgroundColor: 'transparent',
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendLineDashed: {
    opacity: 0.55,
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
  },
  emptyText: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
  },
});
