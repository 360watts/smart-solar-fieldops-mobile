import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AppTheme } from '../../theme/theme';
import { fetchSiteAlerts, acknowledgeAlert, resolveAlert } from '../../api/smartSolar';
import type { AlertItem } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { usePermissions } from '../../auth/usePermissions';
import { formatISTTime, fmtDateTimeIST } from '../../utils/time';

type SeverityFilter = 'All' | 'Critical' | 'Warning' | 'Info';
type StatusFilter = 'Active' | 'Resolved';

const SEVERITY_CHIPS: SeverityFilter[] = ['All', 'Critical', 'Warning', 'Info'];

const SEVERITY_CFG = {
  critical: { color: AppTheme.colors.danger,  bg: AppTheme.colors.dangerSoft,  icon: 'alert-circle',   label: 'Critical' },
  warning:  { color: AppTheme.colors.warning, bg: AppTheme.colors.warningSoft, icon: 'warning',        label: 'Warning' },
  info:     { color: AppTheme.colors.info,    bg: AppTheme.colors.infoSoft,    icon: 'information-circle', label: 'Info' },
} as const;

function AlertsKpiBar({
  onFilterActive,
  onFilterCritical,
  counts,
}: {
  onFilterActive: () => void;
  onFilterCritical: () => void;
  counts: { active: number; critical: number; acknowledged: number; total: number };
}) {
  const chips = [
    { label: 'Active',   val: counts.active,       color: AppTheme.colors.danger,    bg: AppTheme.colors.dangerSoft,  onPress: onFilterActive },
    { label: 'Critical', val: counts.critical,     color: AppTheme.colors.danger,    bg: AppTheme.colors.dangerSoft,  onPress: onFilterCritical },
    { label: "Ack'd",    val: counts.acknowledged, color: AppTheme.colors.warning,   bg: AppTheme.colors.warningSoft, onPress: undefined as (() => void) | undefined },
    { label: 'Total',    val: counts.total,        color: AppTheme.colors.mutedText, bg: AppTheme.colors.card,        onPress: undefined as (() => void) | undefined },
  ];

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 10 }}>
      {chips.map(chip => (
        <Pressable
          key={chip.label}
          onPress={chip.onPress}
          style={{
            flex: 1,
            alignItems: 'center',
            backgroundColor: chip.bg,
            borderRadius: AppTheme.radii.md,
            borderWidth: 1,
            borderColor: chip.color + '30',
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: chip.color, fontSize: 18, fontWeight: '800' }}>{chip.val}</Text>
          <Text style={{ color: chip.color, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>
            {chip.label.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AlertDetailSheet({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  canAct,
}: {
  alert: AlertItem | null;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  canAct: boolean;
}) {
  if (!alert) return null;
  const cfg = SEVERITY_CFG[alert.severity] ?? SEVERITY_CFG.info;
  const isResolved     = alert.status === 'resolved';
  const isAcknowledged = alert.status === 'acknowledged';
  const isPersistent   = /^\d+$/.test(alert.id);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={{ flex: 1, backgroundColor: AppTheme.colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: AppTheme.colors.border }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ padding: 10, borderRadius: AppTheme.radii.md, backgroundColor: cfg.bg }}>
              <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
            </View>
            <Text style={{ flex: 1, color: AppTheme.colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
              {alert.message}
            </Text>
          </View>

          {isResolved && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AppTheme.colors.successSoft, borderRadius: AppTheme.radii.md, padding: 12 }}>
              <Ionicons name="checkmark-circle" size={16} color={AppTheme.colors.success} />
              <Text style={{ color: AppTheme.colors.success, fontSize: 13, fontWeight: '600' }}>This alert has been resolved</Text>
            </View>
          )}

          <View style={{ backgroundColor: AppTheme.colors.card, borderRadius: AppTheme.radii.md, borderWidth: 1, borderColor: AppTheme.colors.border, overflow: 'hidden' }}>
            {([
              { label: 'Alert ID',   val: alert.id },
              { label: 'Severity',   val: cfg.label },
              { label: 'Status',     val: alert.status ?? 'active' },
              { label: 'Device',     val: alert.device_id ?? '—' },
              { label: 'Triggered',  val: fmtDateTimeIST(alert.timestamp) },
              alert.fault_code ? { label: 'Fault Code', val: alert.fault_code } : null,
            ].filter(Boolean) as { label: string; val: string }[]).map((row, i, arr) => (
              <View key={row.label} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: AppTheme.colors.borderMuted,
              }}>
                <Text style={{ color: AppTheme.colors.mutedText, fontSize: 13 }}>{row.label}</Text>
                <Text style={{ color: AppTheme.colors.text, fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{row.val}</Text>
              </View>
            ))}
          </View>

          {canAct && !isResolved && isPersistent && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!isAcknowledged && (
                <Pressable
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: AppTheme.radii.md, backgroundColor: AppTheme.colors.warningSoft }}
                  onPress={() => { onAcknowledge(alert.id); onClose(); }}
                >
                  <Ionicons name="checkmark-outline" size={16} color={AppTheme.colors.warning} />
                  <Text style={{ color: AppTheme.colors.warning, fontSize: 14, fontWeight: '700' }}>Acknowledge</Text>
                </Pressable>
              )}
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: AppTheme.radii.md, backgroundColor: AppTheme.colors.successSoft }}
                onPress={() => { onResolve(alert.id); onClose(); }}
              >
                <Ionicons name="checkmark-done-outline" size={16} color={AppTheme.colors.success} />
                <Text style={{ color: AppTheme.colors.success, fontSize: 14, fontWeight: '700' }}>Resolve</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={{ alignItems: 'center', paddingVertical: 14, borderRadius: AppTheme.radii.md, backgroundColor: AppTheme.colors.card, borderWidth: 1, borderColor: AppTheme.colors.border }}
            onPress={onClose}
          >
            <Text style={{ color: AppTheme.colors.mutedText, fontSize: 14, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

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
  onViewDetail,
  canAct,
}: {
  alert: AlertItem;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onViewDetail: (a: AlertItem) => void;
  canAct: boolean;
}) {
  const cfg = SEVERITY_CFG[alert.severity] ?? SEVERITY_CFG.info;
  const isResolved = alert.status === 'resolved';
  const isAcknowledged = alert.status === 'acknowledged';

  return (
    <Pressable
      style={({ pressed }) => [styles.alertCard, { borderLeftColor: cfg.color }, isResolved && styles.alertCardResolved, pressed && { opacity: 0.85 }]}
      onPress={() => onViewDetail(alert)}
    >
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
    </Pressable>
  );
}

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { activeSite } = useSite();
  const queryClient = useQueryClient();
  const { canAcknowledgeAlerts, canResolveAlerts } = usePermissions();

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

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

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.message.toLowerCase().includes(q) ||
        (a.device_id ?? '').toLowerCase().includes(q) ||
        ((a as any).fault_code ?? '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'Active') {
      result = result.filter(a => a.status !== 'resolved');
    } else {
      result = result.filter(a => a.status === 'resolved');
    }

    if (severityFilter !== 'All') {
      result = result.filter(a => a.severity === severityFilter.toLowerCase());
    }

    return [...result].sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      const sA = sev[a.severity] ?? 3;
      const sB = sev[b.severity] ?? 3;
      if (sA !== sB) return sA - sB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [alerts, severityFilter, statusFilter, search]);

  const counts = useMemo(() => {
    const active = alerts.filter(a => a.status !== 'resolved');
    return {
      All:      active.length,
      Critical: active.filter(a => a.severity === 'critical').length,
      Warning:  active.filter(a => a.severity === 'warning').length,
      Info:     active.filter(a => a.severity === 'info').length,
      kpi: {
        active:       active.length,
        critical:     active.filter(a => a.severity === 'critical').length,
        acknowledged: active.filter(a => a.status === 'acknowledged').length,
        total:        alerts.length,
      },
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

      {/* KPI summary bar */}
      <AlertsKpiBar
        counts={counts.kpi}
        onFilterActive={() => { setStatusFilter('Active'); setSeverityFilter('All'); setSearch(''); }}
        onFilterCritical={() => { setStatusFilter('Active'); setSeverityFilter('Critical'); setSearch(''); }}
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={AppTheme.colors.dimText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search message, device, fault…"
          placeholderTextColor={AppTheme.colors.dimText}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={AppTheme.colors.dimText} />
          </Pressable>
        )}
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
              onViewDetail={setSelectedAlert}
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

      <AlertDetailSheet
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={onAcknowledge}
        onResolve={onResolve}
        canAct={canAcknowledgeAlerts && canResolveAlerts}
      />
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 14, paddingVertical: 0 },
});
