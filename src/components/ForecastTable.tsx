import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppTheme } from '../theme/theme';
import type { ForecastDataPoint } from './ForecastChart';

interface ForecastTableProps {
  data: ForecastDataPoint[];
  forecastWindow: 'today' | '3d' | '7d';
}

export function ForecastTable({ data, forecastWindow }: ForecastTableProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No forecast data available for table.</Text>
      </View>
    );
  }

  const reversedData = [...data].reverse();

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, styles.timeCell]}>Time</Text>
        <Text style={[styles.cell, styles.headerCell]}>P10 (kW)</Text>
        <Text style={[styles.cell, styles.headerCell]}>P50 (kW)</Text>
        <Text style={[styles.cell, styles.headerCell]}>P90 (kW)</Text>
        <Text style={[styles.cell, styles.headerCell, styles.ghiCell]}>GHI</Text>
      </View>

      <ScrollView style={styles.scrollContainer} nestedScrollEnabled>
        {reversedData.map((d, index) => {
          const dt = new Date(d.rawTs);
          const timeLabel = forecastWindow === 'today'
            ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : dt.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          return (
            <View key={d.rawTs} style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
              <Text style={[styles.cell, styles.timeCell]}>{timeLabel}</Text>
              <Text style={[styles.cell, styles.valueCell, { color: 'rgba(0,166,62,0.7)' }]}>{d.p10.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.valueCell, { color: '#00a63e' }]}>{d.p50.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.valueCell, { color: 'rgba(0,166,62,0.7)' }]}>{d.p90.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.ghiCell, { color: AppTheme.colors.mutedText }]}>{d.ghi.toFixed(0)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 16,
    height: 280,
  },
  scrollContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 2,
  },
  evenRow: {
    backgroundColor: 'transparent',
  },
  oddRow: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cell: {
    flex: 1,
    fontSize: 11,
    color: AppTheme.colors.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  timeCell: {
    flex: 1.5,
    textAlign: 'left',
    color: AppTheme.colors.mutedText,
  },
  ghiCell: {
    flex: 0.8,
  },
  headerCell: {
    fontWeight: '700',
    color: AppTheme.colors.mutedText,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  valueCell: {
    fontWeight: '600',
  },
  emptyContainer: {
    height: 280,
    backgroundColor: AppTheme.colors.card,
    borderRadius: 12,
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
