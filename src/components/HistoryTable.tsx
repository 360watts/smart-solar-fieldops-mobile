import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppTheme } from '../theme/theme';
import type { HistoryDataPoint } from './HistoryChart';

interface HistoryTableProps {
  data: HistoryDataPoint[];
  dateRange: '24h' | '7d' | '30d';
}

export function HistoryTable({ data, dateRange }: HistoryTableProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available for table.</Text>
      </View>
    );
  }

  // Reverse data to show most recent first
  const reversedData = [...data].reverse();

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, styles.timeCell]}>Time</Text>
        <Text style={[styles.cell, styles.headerCell]}>PV (kW)</Text>
        <Text style={[styles.cell, styles.headerCell]}>Load (kW)</Text>
        <Text style={[styles.cell, styles.headerCell]}>Grid (kW)</Text>
        <Text style={[styles.cell, styles.headerCell, styles.socCell]}>SOC (%)</Text>
      </View>

      <ScrollView style={styles.scrollContainer} nestedScrollEnabled>
        {reversedData.map((d, index) => {
          const dt = new Date(d.rawTs);
          const timeLabel = dateRange === '24h' 
            ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : dt.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          return (
            <View key={d.rawTs} style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
              <Text style={[styles.cell, styles.timeCell]}>{timeLabel}</Text>
              <Text style={[styles.cell, styles.valueCell, { color: '#F07522' }]}>{d.pvKw.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.valueCell, { color: '#8b5cf6' }]}>{d.loadKw.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.valueCell, { color: '#3b82f6' }]}>{d.gridKw.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.socCell, { color: '#00a63e' }]}>{Math.round(d.soc)}</Text>
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
  socCell: {
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
