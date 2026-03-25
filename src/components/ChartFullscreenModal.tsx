import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryZoomContainer,
  VictoryTheme,
} from 'victory-native';
import { Defs, LinearGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { AppTheme } from '../theme/theme';
import type { HistoryDataPoint } from './HistoryChart';
import type { ForecastDataPoint } from './ForecastChart';

type ChartKind = 'history' | 'forecast';

type ChartFullscreenModalProps = {
  visible: boolean;
  onClose: () => void;
  kind: ChartKind;
  historyData?: HistoryDataPoint[];
  forecastData?: ForecastDataPoint[];
  dateRange?: '24h' | '7d' | '30d';
  forecastWindow?: 'today' | '3d' | '7d';
};

const win = Dimensions.get('window');

export function ChartFullscreenModal({
  visible,
  onClose,
  kind,
  historyData = [],
  forecastData = [],
  dateRange = '24h',
  forecastWindow = 'today',
}: ChartFullscreenModalProps) {
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const rawW = (dims.width ?? win.width ?? 360) - 24;
  const rawH = (dims.height ?? win.height ?? 500) - insets.top - insets.bottom - 120;
  const safeW = Math.max(280, Math.round(rawW));
  const safeH = Math.max(280, Math.round(rawH));

  const isHistory = kind === 'history';
  const data = isHistory ? historyData : forecastData;
  const hasData = data && data.length >= 2;

  const formatTime = (ms: number) => {
    const d = new Date(ms);
    if (isHistory && dateRange === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!isHistory && forecastWindow === 'today') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <GestureHandlerRootView style={styles.overlay}>
        <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{isHistory ? 'History' : 'Forecast'} — Pinch to zoom, drag to pan</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Feather name="x" size={24} color={AppTheme.colors.text} />
            </Pressable>
          </View>

          {!hasData ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Not enough data to show chart.</Text>
            </View>
          ) : isHistory ? (
            <HistoryFullscreenChart
              data={historyData!}
              dateRange={dateRange}
              safeW={safeW}
              safeH={safeH}
              formatTime={formatTime}
            />
          ) : (
            <ForecastFullscreenChart
              data={forecastData!}
              forecastWindow={forecastWindow}
              safeW={safeW}
              safeH={safeH}
              formatTime={formatTime}
            />
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function HistoryFullscreenChart({
  data,
  dateRange,
  safeW,
  safeH,
  formatTime,
}: {
  data: HistoryDataPoint[];
  dateRange: '24h' | '7d' | '30d';
  safeW: number;
  safeH: number;
  formatTime: (ms: number) => string;
}) {
  const series = data
    .filter((d) =>
      Number.isFinite(d.rawTs) &&
      Number.isFinite(d.pvKw) &&
      Number.isFinite(d.loadKw) &&
      Number.isFinite(d.gridKw) &&
      Number.isFinite(d.soc)
    )
    .sort((a, b) => a.rawTs - b.rawTs);
  if (series.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Not enough data to show chart.</Text>
      </View>
    );
  }

  let maxPower = 0;
  series.forEach(d => {
    if (d.pvKw > maxPower) maxPower = d.pvKw;
    if (d.loadKw > maxPower) maxPower = d.loadKw;
    if (Math.abs(d.gridKw) > maxPower) maxPower = Math.abs(d.gridKw);
  });
  maxPower = maxPower === 0 ? 10 : maxPower * 1.1;

  const w = Number.isFinite(safeW) && safeW >= 1 ? safeW : 300;
  const h = Number.isFinite(safeH) && safeH >= 1 ? safeH : 280;
  const rotatedChartW = h;
  const rotatedChartH = w;

  return (
    <View style={styles.chartWrap}>
      <View style={[styles.rotatedViewport, { width: w, height: h }]}>
        <View style={[styles.rotatedChartHost, { width: rotatedChartW, height: rotatedChartH }]}>
          <VictoryChart
            width={rotatedChartW}
            height={rotatedChartH}
            padding={{ top: 20, bottom: 60, left: 60, right: 64 }}
            domain={{ x: [series[0].rawTs, series[series.length - 1].rawTs], y: [0, maxPower] }}
            theme={VictoryTheme.material}
            containerComponent={<VictoryZoomContainer width={rotatedChartW} height={rotatedChartH} zoomDimension="x" allowPan allowZoom />}
          >
            <Defs>
              <LinearGradient id="fsGradPv" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#F07522" stopOpacity={0.4} />
                <Stop offset="100%" stopColor="#F07522" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="fsGradLoad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <Stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <VictoryAxis
              tickFormat={(t: number) => formatTime(t)}
              tickCount={6}
              style={{
                axis: { stroke: AppTheme.colors.border },
                tickLabels: { fill: AppTheme.colors.mutedText, fontSize: 11, padding: 8, angle: -35, textAnchor: 'end' },
                grid: { stroke: 'rgba(255,255,255,0.03)' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${t}`}
              tickCount={5}
              domain={[0, maxPower]}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: AppTheme.colors.mutedText, fontSize: 11, padding: 6 },
                grid: { stroke: 'rgba(255,255,255,0.06)', strokeDasharray: '4 4' },
              }}
            />
            <VictoryAxis
              dependentAxis
              orientation="right"
              tickFormat={(t) => `${t}%`}
              tickValues={[0, 25, 50, 75, 100]}
              domain={[0, 100]}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: '#00a63e', fontSize: 11, padding: 8 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryArea
              data={series.map(d => ({ x: d.rawTs, y: d.pvKw }))}
              style={{ data: { fill: 'url(#fsGradPv)', stroke: '#F07522', strokeWidth: 2 } }}
            />
            <VictoryArea
              data={series.map(d => ({ x: d.rawTs, y: d.loadKw }))}
              style={{ data: { fill: 'url(#fsGradLoad)', stroke: '#8b5cf6', strokeWidth: 2 } }}
            />
            <VictoryLine
              data={series.map(d => ({ x: d.rawTs, y: d.gridKw }))}
              style={{ data: { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '5 3' } }}
            />
            <VictoryLine
              data={series.map(d => ({ x: d.rawTs, y: (d.soc / 100) * maxPower }))}
              style={{ data: { stroke: '#00a63e', strokeWidth: 1.5, strokeDasharray: '2 2' } }}
            />
          </VictoryChart>
        </View>
      </View>
    </View>
  );
}

function ForecastFullscreenChart({
  data,
  forecastWindow,
  safeW,
  safeH,
  formatTime,
}: {
  data: ForecastDataPoint[];
  forecastWindow: 'today' | '3d' | '7d';
  safeW: number;
  safeH: number;
  formatTime: (ms: number) => string;
}) {
  const series = data
    .filter((d) => Number.isFinite(d.rawTs) && Number.isFinite(d.p10) && Number.isFinite(d.p50) && Number.isFinite(d.p90))
    .sort((a, b) => a.rawTs - b.rawTs);
  if (series.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Not enough data to show chart.</Text>
      </View>
    );
  }

  let maxKw = 0;
  series.forEach(d => {
    const m = Math.max(d.p10, d.p50, d.p90);
    if (m > maxKw) maxKw = m;
  });
  maxKw = maxKw === 0 ? 10 : maxKw * 1.1;

  const w = Number.isFinite(safeW) && safeW >= 1 ? safeW : 300;
  const h = Number.isFinite(safeH) && safeH >= 1 ? safeH : 280;
  const rotatedChartW = h;
  const rotatedChartH = w;

  return (
    <View style={styles.chartWrap}>
      <View style={[styles.rotatedViewport, { width: w, height: h }]}>
        <View style={[styles.rotatedChartHost, { width: rotatedChartW, height: rotatedChartH }]}>
          <VictoryChart
            width={rotatedChartW}
            height={rotatedChartH}
            padding={{ top: 20, bottom: 60, left: 60, right: 28 }}
            domain={{ x: [series[0].rawTs, series[series.length - 1].rawTs], y: [0, maxKw] }}
            theme={VictoryTheme.material}
            containerComponent={<VictoryZoomContainer width={rotatedChartW} height={rotatedChartH} zoomDimension="x" allowPan allowZoom />}
          >
            <Defs>
              <LinearGradient id="fsGradBand" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#00a63e" stopOpacity={0.2} />
                <Stop offset="100%" stopColor="#00a63e" stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            <VictoryAxis
              tickFormat={(t: number) => formatTime(t)}
              tickCount={6}
              style={{
                axis: { stroke: AppTheme.colors.border },
                tickLabels: { fill: AppTheme.colors.mutedText, fontSize: 11, padding: 8, angle: -35, textAnchor: 'end' },
                grid: { stroke: 'rgba(255,255,255,0.03)' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${t} kW`}
              tickCount={5}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: AppTheme.colors.mutedText, fontSize: 11, padding: 6 },
                grid: { stroke: 'rgba(255,255,255,0.06)', strokeDasharray: '4 4' },
              }}
            />
            <VictoryArea
              data={series.map(d => ({ x: d.rawTs, y: d.p90, y0: d.p10 }))}
              style={{ data: { fill: 'url(#fsGradBand)', stroke: 'transparent' } }}
            />
            <VictoryLine
              data={series.map(d => ({ x: d.rawTs, y: d.p90 }))}
              style={{ data: { stroke: 'rgba(0,166,62,0.25)', strokeWidth: 1, strokeDasharray: '3 3' } }}
            />
            <VictoryLine
              data={series.map(d => ({ x: d.rawTs, y: d.p10 }))}
              style={{ data: { stroke: 'rgba(0,166,62,0.25)', strokeWidth: 1, strokeDasharray: '3 3' } }}
            />
            <VictoryLine
              data={series.map(d => ({ x: d.rawTs, y: d.p50 }))}
              style={{ data: { stroke: '#00a63e', strokeWidth: 2.5 } }}
            />
          </VictoryChart>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  chartWrap: {
    flex: 1,
    minHeight: 200,
    backgroundColor: AppTheme.colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  rotatedViewport: {
    flex: 1,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rotatedChartHost: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  placeholderText: {
    color: AppTheme.colors.mutedText,
    fontSize: 14,
  },
});
