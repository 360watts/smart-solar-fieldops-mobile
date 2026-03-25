import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../theme/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { fetchSites, fetchUserSite } from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { useAuth } from '../../auth/AuthContext';
import { usePermissions } from '../../auth/usePermissions';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icon as any} size={15} color={AppTheme.colors.mutedText} style={{ width: 20 }} />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  label: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    width: 110,
  },
  value: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name={icon as any} size={15} color={AppTheme.colors.accent} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {action && (
          <Pressable style={styles.editBtn} onPress={action.onPress} hitSlop={8}>
            <Ionicons name="pencil-outline" size={14} color={AppTheme.colors.mutedText} />
            <Text style={styles.editBtnText}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

export function SiteScreen() {
  const insets = useSafeAreaInsets();
  const { activeSite, clearSite } = useSite();
  const { user, logout } = useAuth();
  const { canEditSite, canCommission, canSwitchSite } = usePermissions();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const { data: sitesData, isRefetching, refetch } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites,
    staleTime: 60_000,
    enabled: !!activeSite,
  });

  const siteDetail = sitesData?.find(s => s.site_id === activeSite?.site_id);
  const onlineCount = siteDetail?.devices.filter(d => d.is_online).length ?? 0;
  const totalCount = siteDetail?.devices.length ?? 0;

  // Try to fetch user/owner info from the first device's assigned user
  // Owner info comes from site owner — use fetchUserSite via primary user association
  // For now we show what's available from the sites list + auth context
  const siteStatus =
    totalCount === 0 ? 'No devices'
    : onlineCount === 0 ? 'Offline'
    : onlineCount < totalCount ? `${onlineCount}/${totalCount} online`
    : 'All online';

  const statusColor =
    totalCount === 0 ? AppTheme.colors.dimText
    : onlineCount === 0 ? AppTheme.colors.danger
    : onlineCount < totalCount ? AppTheme.colors.warning
    : AppTheme.colors.success;

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          await clearSite();
        },
      },
    ]);
  }

  function handleSwitchSite() {
    clearSite().then(() => navigation.navigate('Worksites'));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Site" subtitle={activeSite?.display_name} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={AppTheme.colors.accent}
          />
        }
      >
        {/* Site summary */}
        <SectionCard
          title="Site Summary"
          icon="business"
          action={canEditSite ? { label: 'Edit', onPress: () => {} } : undefined}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{siteStatus}</Text>
          </View>
          <InfoRow icon="key-outline"       label="Site ID"    value={activeSite?.site_id} />
          <InfoRow icon="flash-outline"     label="Capacity"   value={siteDetail?.capacity_kw ? `${siteDetail.capacity_kw} kW` : null} />
          <InfoRow icon="time-outline"      label="Timezone"   value={siteDetail?.timezone} />
          <InfoRow icon="location-outline"  label="Latitude"   value={siteDetail?.latitude?.toString()} />
          <InfoRow icon="location-outline"  label="Longitude"  value={siteDetail?.longitude?.toString()} />
        </SectionCard>

        {/* Devices summary */}
        <SectionCard title="Linked Devices" icon="hardware-chip">
          {totalCount === 0 ? (
            <Text style={styles.emptyCardText}>No devices linked to this site</Text>
          ) : (
            siteDetail?.devices.map(d => (
              <View key={d.device_id} style={styles.deviceMiniRow}>
                <View style={[
                  styles.deviceMiniDot,
                  { backgroundColor: d.is_online ? AppTheme.colors.success : AppTheme.colors.danger }
                ]} />
                <Text style={styles.deviceMiniSerial}>{d.device_serial}</Text>
                <Text style={[
                  styles.deviceMiniStatus,
                  { color: d.is_online ? AppTheme.colors.success : AppTheme.colors.danger }
                ]}>
                  {d.is_online ? 'Online' : 'Offline'}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        {/* Account */}
        <SectionCard title="Your Account" icon="person-circle">
          <InfoRow icon="person-outline"  label="Username" value={user?.username} />
          <InfoRow icon="mail-outline"    label="Email"    value={user?.email} />
          <InfoRow icon="shield-outline"  label="Role"
            value={user?.is_superuser ? 'Admin' : user?.is_staff ? 'Staff' : 'Field Technician'}
          />
        </SectionCard>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Actions</Text>

          {canSwitchSite && (
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
              onPress={handleSwitchSite}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: AppTheme.colors.accentSoft }]}>
                <Ionicons name="swap-horizontal-outline" size={18} color={AppTheme.colors.accent} />
              </View>
              <Text style={styles.actionLabel}>Switch Site</Text>
              <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.dimText} />
            </Pressable>
          )}

          {canCommission && (
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate('Commissioning')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: AppTheme.colors.accentSoft }]}>
                <Ionicons name="add-circle-outline" size={18} color={AppTheme.colors.accent} />
              </View>
              <Text style={styles.actionLabel}>Commission New Site</Text>
              <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.dimText} />
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.actionRow, styles.actionRowDanger, pressed && { opacity: 0.7 }]}
            onPress={handleLogout}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: AppTheme.colors.dangerSoft }]}>
              <Ionicons name="log-out-outline" size={18} color={AppTheme.colors.danger} />
            </View>
            <Text style={[styles.actionLabel, { color: AppTheme.colors.danger }]}>Log Out</Text>
          </Pressable>
        </View>

        <Text style={styles.buildInfo}>360watts Field · v{require('../../../package.json').version}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderColor: AppTheme.colors.border,
    borderLeftColor: AppTheme.colors.accent,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: AppTheme.colors.text, fontSize: 14, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppTheme.radii.sm,
    backgroundColor: AppTheme.colors.cardElevated,
  },
  editBtnText: { color: AppTheme.colors.mutedText, fontSize: 12, fontWeight: '600' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
    marginBottom: 2,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '700' },
  emptyCardText: { color: AppTheme.colors.dimText, fontSize: 13, paddingVertical: 8, textAlign: 'center' },
  deviceMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  deviceMiniDot: { width: 7, height: 7, borderRadius: 4 },
  deviceMiniSerial: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  deviceMiniStatus: { fontSize: 12, fontWeight: '700' },
  actionsCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  actionsTitle: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  actionRowDanger: { borderBottomWidth: 0 },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  buildInfo: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
