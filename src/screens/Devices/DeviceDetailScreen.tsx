import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppTheme } from '../../theme/theme';
import { SiteOpsStackParamList } from '../../navigation/SiteOpsNavigator';
import { assignDeviceToUser } from '../../api/smartSolar';
import { fmtDateTimeIST } from '../../utils/time';

type RouteType = RouteProp<SiteOpsStackParamList, 'DeviceDetail'>;

export function DeviceDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { params: { device } } = useRoute<RouteType>();
  const isOnline = !!device.is_online;

  const [assignedUser, setAssignedUser] = useState<string | null>(device.user ?? null);
  const [editingUser, setEditingUser] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  const assignMutation = useMutation({
    mutationFn: (username: string | null) => assignDeviceToUser(device.id, username),
    onSuccess: (_data, username) => {
      setAssignedUser(username || null);
      setEditingUser(false);
      setUsernameInput('');
      queryClient.invalidateQueries({ queryKey: ['devices'], exact: false });
      queryClient.refetchQueries({ queryKey: ['devices'], exact: false });
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to assign device');
    },
  });

  const handleSaveAssignment = () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      Alert.alert(
        'Unassign Device',
        'Leave username empty to unassign this device. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unassign', style: 'destructive', onPress: () => assignMutation.mutate(null) },
        ],
      );
      return;
    }
    assignMutation.mutate(trimmed);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{device.device_serial}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? AppTheme.colors.accent : AppTheme.colors.dimText }]} />
            <Text style={[styles.statusText, { color: isOnline ? AppTheme.colors.accent : AppTheme.colors.dimText }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            {isOnline && (
              <View style={styles.heroGlow} />
            )}
            <View style={[styles.heroIcon, { backgroundColor: isOnline ? AppTheme.colors.accentSoft : AppTheme.colors.cardElevated }]}>
              <Ionicons
                name="hardware-chip"
                size={32}
                color={isOnline ? AppTheme.colors.accent : AppTheme.colors.dimText}
              />
            </View>
          </View>
          <Text style={styles.heroSerial}>{device.device_serial}</Text>
          <View style={[
            styles.heroBadge,
            {
              backgroundColor: isOnline ? AppTheme.colors.accentSoft : AppTheme.colors.card,
              borderColor: isOnline ? AppTheme.colors.borderAccent : AppTheme.colors.border,
            },
          ]}>
            <View style={[styles.heroDot, { backgroundColor: isOnline ? AppTheme.colors.accent : AppTheme.colors.dimText }]} />
            <Text style={[styles.heroBadgeText, { color: isOnline ? AppTheme.colors.accent : AppTheme.colors.dimText }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Owner Section */}
        <Text style={styles.sectionLabel}>Owner</Text>
        <View style={styles.detailsCard}>
          <View style={styles.ownerRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="person-outline" size={16} color={AppTheme.colors.mutedText} />
              <Text style={styles.detailLabel}>Assigned User</Text>
            </View>
            <View style={styles.ownerRight}>
              <Text style={[styles.detailValue, !assignedUser && { color: AppTheme.colors.dimText, fontStyle: 'italic' }]}>
                {assignedUser ?? 'Unassigned'}
              </Text>
              <Pressable
                onPress={() => {
                  setUsernameInput(assignedUser ?? '');
                  setEditingUser(v => !v);
                }}
                style={styles.editBtn}
              >
                <Ionicons
                  name={editingUser ? 'close-outline' : 'create-outline'}
                  size={16}
                  color={AppTheme.colors.accent}
                />
              </Pressable>
            </View>
          </View>

          {editingUser && (
            <View style={styles.assignForm}>
              <TextInput
                style={styles.assignInput}
                placeholder="Enter username (blank to unassign)"
                placeholderTextColor={AppTheme.colors.dimText}
                value={usernameInput}
                onChangeText={setUsernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Pressable
                style={[styles.assignSaveBtn, assignMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSaveAssignment}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.assignSaveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Technical Details */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Technical Details</Text>
        <View style={styles.detailsCard}>
          <DetailRow icon="cube-outline" label="Model" value={device.model || 'Unknown'} />
          <Divider />
          <DetailRow icon="finger-print-outline" label="Hardware ID" value={device.hw_id || 'N/A'} />
          <Divider />
          <DetailRow icon="code-slash-outline" label="Config Version" value={device.config_version || 'N/A'} />
          <Divider />
          <DetailRow icon="server-outline" label="Device ID" value={String(device.id)} />
          {device.last_heartbeat ? (
            <>
              <Divider />
              <DetailRow
                icon="time-outline"
                label="Last Heartbeat"
                value={fmtDateTimeIST(device.last_heartbeat)}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon, label, value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={16} color={AppTheme.colors.mutedText} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.full,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: AppTheme.colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  content: { padding: 16 },
  heroCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.xl,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: AppTheme.colors.accentGlow,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: AppTheme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroSerial: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: AppTheme.radii.full,
    borderWidth: 1,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: AppTheme.colors.dimText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 2,
  },
  detailsCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.xl,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  ownerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.radii.full,
    backgroundColor: AppTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppTheme.colors.borderAccent,
  },
  assignForm: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  assignInput: {
    backgroundColor: AppTheme.colors.cardElevated,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radii.md,
    color: AppTheme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  assignSaveBtn: {
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  assignSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14, color: AppTheme.colors.mutedText, fontWeight: '500' },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.colors.text,
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: AppTheme.colors.border, marginHorizontal: 14 },
});
