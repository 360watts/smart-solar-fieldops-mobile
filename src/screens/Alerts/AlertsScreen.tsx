import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AppTheme } from '../../theme/theme';
import { fetchSiteAlerts, acknowledgeAlert, resolveAlert } from '../../api/smartSolar';
import type { AlertItem } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { usePermissions } from '../../auth/usePermissions';
import { formatISTTime } from '../../utils/time';

type SeverityFilter = 'All' | 'Critical' | 'Warning' | 'Info';
type StatusFilter = 'Active' | 'Resolved';

const SEVERITY_CHIPS: SeverityFilter[] = ['All', 'Critical', 'Warning', 'Info'];

const SEVERITY_CFG = {
  critical: { color: AppTheme.colors.danger,  bg: AppTheme.colors.dangerSoft,  icon: 'alert-circle',   label: 'Critical' },
  warning:  { color: AppTheme.colors.warning, bg: AppTheme.colors.warningSoft, icon: 'warning',        label: 'Warning' },
  info:     { color: AppTheme.colors.info,    bg: AppTheme.colors.infoSoft,    icon: 'information-circle', label: 'Info' },
} as const;

function SeverityChip({
  label,
  active,
  count,
  onPress,
}: {
  label: SeverityFilter;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  const color =
    label === 'Critical' ? AppTheme.colors.danger
    : label === 'Warning' ? AppTheme.colors.warning
    : label === 'Info' ? AppTheme.colors.info
    : AppTheme.colors.accent;

  return (
    <Pressable
      style={[
        styles.chip,
        active && { backgroundColor: color + '22', borderColor: color + '50' },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.chipBadge, active && { backgroundColor: color + '33' }]}>
          <Text style={[styles.chipBadgeText, active && { color }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

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
  const cfg = SEVERITY_CFG[alert.severity] ?? SEVERITY_CFG.info;
  const isResolved = alert.status === 'resolved';
  const isAcknowledged = alert.status === 'acknowledged';

  return (
    <View style={[styles.alertCard, { borderLeftColor: cfg.color }, isResolved && styles.alertCardResolved]}>
      {/* Severity header */}
      <View style={styles.alertHeader}>
        <View style={[styles.severityBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.severityText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {alert.status && (
          <View style={[styles.statusBadge, isResolved && styles.statusResolved, isAcknowledged && styles.statusAcknowledged]}>
            <Text style={[
              styles.statusText,
              isResolved && { color: AppTheme.colors.success },
              isAcknowledged && { color: AppTheme.colors.warning },
            ]}>
              {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.alertTime}>{formatISTTime(alert.timestamp)}</Text>

      {/* Message */}
      <Text style={[styles.alertMessage, isResolved && styles.alertMessageResolved]}>
        {alert.message}
      </Text>

      {/* Device link */}
      {alert.device_id && (
        <View style={styles.deviceTag}>
          <Ionicons name="hardware-chip-outline" size={12} color={AppTheme.colors.mutedText} />
          <Text style={styles.deviceTagText}>{alert.device_id}</Text>
        </View>
      )}

      {/* Actions — only for persistent (non-ephemeral) alerts and permitted users */}
      {canAct && !isResolved && /^\d+$/.test(alert.id) && (
        <View style={styles.actions}>
          {!isAcknowledged && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => onAcknowledge(alert.id)}
            >
              <Ionicons name="checkmark-outline" size={14} color={AppTheme.colors.warning} />
              <Text style={[styles.actionBtnText, { color: AppTheme.colors.warning }]}>Acknowledge</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, styles.actionBtnResolve]}
            onPress={() => onResolve(alert.id)}
          >
            <Ionicons name="checkmark-done-outline" size={14} color={AppTheme.colors.success} />
            <Text style={[styles.actionBtnText, { color: AppTheme.colors.success }]}>Resolve</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { activeSite } = useSite();
  const queryClient = useQueryClient();
  const { canAcknowledgeAlerts, canResolveAlerts } = usePermissions();

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');

  const { data: alerts = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['siteAlerts', activeSite?.site_id],
    queryFn: () => fetchSiteAlerts(activeSite!.site_id),
    enabled: !!activeSite,
    staleTime: 30_000,
    meta: { persist: false },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['siteAlerts'] }),
    onError: () => Alert.alert('Error', 'Failed to acknowledge alert'),
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['siteAlerts'] }),
    onError: () => Alert.alert('Error', 'Failed to resolve alert'),
  });

  const filtered = useMemo(() => {
    let result = alerts;

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

    // Sort: critical first, then warning, then info; within each, unresolved first, newest last
    return [...result].sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      const sA = sev[a.severity] ?? 3;
      const sB = sev[b.severity] ?? 3;
      if (sA !== sB) return sA - sB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [alerts, severityFilter, statusFilter]);

  const counts = useMemo(() => {
    const active = alerts.filter(a => a.status !== 'resolved');
    return {
      All: active.length,
      Critical: active.filter(a => a.severity === 'critical').length,
      Warning: active.filter(a => a.severity === 'warning').length,
      Info: active.filter(a => a.severity === 'info').length,
    };
  }, [alerts]);

  // Ephemeral alerts (device_offline_*) have string IDs — they cannot be
  // acknowledged/resolved via the API (no persistent record). Only persistent
  // alerts with numeric IDs support those actions.
  const isPersistent = (id: string) => /^\d+$/.test(id);

  const onAcknowledge = useCallback((id: string) => {
    if (!isPersistent(id)) {
      Alert.alert('Auto-generated alert', 'This alert is ephemeral and clears automatically when the device comes back online.');
      return;
    }
    Alert.alert('Acknowledge Alert', 'Mark this alert as acknowledged?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Acknowledge', onPress: () => acknowledgeMutation.mutate(id) },
    ]);
  }, [acknowledgeMutation]);

  const onResolve = useCallback((id: string) => {
    if (!isPersistent(id)) {
      Alert.alert('Auto-generated alert', 'This alert is ephemeral and clears automatically when the device comes back online.');
      return;
    }
    Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', style: 'destructive', onPress: () => resolveMutation.mutate(id) },
    ]);
  }, [resolveMutation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSub}>{activeSite?.display_name}</Text>
      </View>

      {/* Status toggle */}
      <View style={styles.statusToggle}>
        {(['Active', 'Resolved'] as StatusFilter[]).map(s => (
          <Pressable
            key={s}
            style={[styles.statusBtn, statusFilter === s && styles.statusBtnActive]}
            onPress={() => setStatusFilter(s)}
          >
            {statusFilter === s && (
              <View style={styles.statusBtnDot} />
            )}
            <Text style={[styles.statusBtnText, statusFilter === s && styles.statusBtnTextActive]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Severity chips */}
      <View style={styles.chips}>
        {SEVERITY_CHIPS.map(chip => (
          <SeverityChip
            key={chip}
            label={chip}
            active={severityFilter === chip}
            count={counts[chip]}
            onPress={() => setSeverityFilter(chip)}
          />
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={AppTheme.colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={AppTheme.colors.accent}
            />
          }
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              onAcknowledge={onAcknowledge}
              onResolve={onResolve}
              canAct={canAcknowledgeAlerts && canResolveAlerts}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={statusFilter === 'Active' ? 'checkmark-circle-outline' : 'archive-outline'}
                  size={32}
                  color={AppTheme.colors.dimText}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {statusFilter === 'Active' ? 'No active alerts' : 'No resolved alerts'}
              </Text>
              <Text style={styles.emptySub}>
                {statusFilter === 'Active'
                  ? 'All systems are running normally'
                  : 'Resolved alerts will appear here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerTitle: {
    color: AppTheme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: { color: AppTheme.colors.mutedText, fontSize: 13, marginTop: 2 },
  statusToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 3,
    marginBottom: 10,
    gap: 3,
  },
  statusBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: AppTheme.radii.sm,
  },
  statusBtnActive: { backgroundColor: AppTheme.colors.accentSoft },
  statusBtnText: { color: AppTheme.colors.mutedText, fontSize: 13, fontWeight: '600' },
  statusBtnTextActive: { color: AppTheme.colors.accent },
  chips: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: AppTheme.radii.full,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  chipText: { color: AppTheme.colors.mutedText, fontSize: 12, fontWeight: '600' },
  chipBadge: {
    backgroundColor: AppTheme.colors.border,
    borderRadius: 99,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chipBadgeText: { color: AppTheme.colors.mutedText, fontSize: 9, fontWeight: '900' },
  list: { paddingHorizontal: 16 },
  alertCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
  },
  alertCardResolved: { opacity: 0.55 },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppTheme.radii.full,
  },
  severityText: { fontSize: 11, fontWeight: '800' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppTheme.radii.full,
    backgroundColor: AppTheme.colors.border,
  },
  statusResolved: { backgroundColor: AppTheme.colors.successSoft },
  statusAcknowledged: { backgroundColor: AppTheme.colors.warningSoft },
  statusText: { color: AppTheme.colors.mutedText, fontSize: 11, fontWeight: '700' },
  alertTime: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    marginTop: 4,
  },
  statusBtnDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.accent,
  },
  alertMessage: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertMessageResolved: { color: AppTheme.colors.mutedText },
  deviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  deviceTagText: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.borderMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AppTheme.radii.sm,
    backgroundColor: AppTheme.colors.warningSoft,
  },
  actionBtnResolve: { backgroundColor: AppTheme.colors.successSoft },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: AppTheme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
