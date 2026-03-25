import React, { useState } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, Alert, ScrollView,
  Pressable, Switch, StyleSheet,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme } from '../../theme/theme';
import {
  createUser, updateUser, deleteUser, type UserSummary,
  fetchUserDevices, fetchUserSite, createUserSite, type SiteDetail,
} from '../../api/smartSolar';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { fmtDateTimeIST } from '../../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'UserForm'>;

export function UserFormScreen({ route, navigation }: Props) {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const existingUser = route.params?.user;
  const isEditing = !!existingUser;

  const [form, setForm] = useState({
    username: existingUser?.username || '',
    email: existingUser?.email || '',
    first_name: existingUser?.first_name || '',
    last_name: existingUser?.last_name || '',
    mobile_number: existingUser?.mobile_number || '',
    address: existingUser?.address || '',
    password: '',
    is_staff: existingUser?.is_staff || false,
  });

  // ── Create site form state ────────────────────────────────────────────────
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [siteForm, setSiteForm] = useState({
    site_id: '',
    display_name: '',
    capacity_kw: '',
  });

  // ── Queries (only when editing) ───────────────────────────────────────────
  const devicesQuery = useQuery({
    queryKey: ['userDevices', existingUser?.id],
    queryFn: () => fetchUserDevices(existingUser!.id),
    enabled: isEditing,
    staleTime: 30_000,
  });

  const siteQuery = useQuery({
    queryKey: ['userSite', existingUser?.id],
    queryFn: () => fetchUserSite(existingUser!.id),
    enabled: isEditing && (devicesQuery.data?.length ?? 0) > 0,
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<UserSummary> & { password?: string } = { ...form };
      if (!payload.password) delete payload.password;
      return isEditing && existingUser
        ? updateUser(existingUser.id, payload)
        : createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Failed to save user. Check details and try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(existingUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Failed to delete user.'),
  });

  const createSiteMutation = useMutation({
    mutationFn: () => createUserSite(existingUser!.id, {
      site_id: siteForm.site_id.trim(),
      display_name: siteForm.display_name.trim(),
      capacity_kw: siteForm.capacity_kw ? parseFloat(siteForm.capacity_kw) : null,
      timezone: 'Asia/Kolkata',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSite', existingUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setShowCreateSite(false);
      setSiteForm({ site_id: '', display_name: '', capacity_kw: '' });
    },
    onError: (err: Error) => Alert.alert('Error', err.message || 'Failed to create site.'),
  });

  const handleDelete = () => {
    Alert.alert('Delete User', `Delete ${existingUser?.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  const site = siteQuery.data as SiteDetail | null | undefined;
  const devices = devicesQuery.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: AppTheme.colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={AppTheme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit User' : 'Add User'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Basic Info ── */}
        <SectionLabel text="Account Info" />

        <FieldLabel text="Username *" />
        <TextInput
          style={styles.input}
          placeholder="johndoe"
          placeholderTextColor={AppTheme.colors.mutedText}
          value={form.username}
          autoCapitalize="none"
          onChangeText={(v) => setForm({ ...form, username: v })}
        />

        <FieldLabel text="Email" />
        <TextInput
          style={styles.input}
          placeholder="johndoe@example.com"
          placeholderTextColor={AppTheme.colors.mutedText}
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(v) => setForm({ ...form, email: v })}
        />

        <FieldLabel text="First Name" />
        <TextInput
          style={styles.input}
          placeholder="John"
          placeholderTextColor={AppTheme.colors.mutedText}
          value={form.first_name}
          onChangeText={(v) => setForm({ ...form, first_name: v })}
        />

        <FieldLabel text="Last Name" />
        <TextInput
          style={styles.input}
          placeholder="Doe"
          placeholderTextColor={AppTheme.colors.mutedText}
          value={form.last_name}
          onChangeText={(v) => setForm({ ...form, last_name: v })}
        />

        <FieldLabel text="Mobile Number" />
        <TextInput
          style={styles.input}
          placeholder="+91 9876543210"
          placeholderTextColor={AppTheme.colors.mutedText}
          value={form.mobile_number}
          keyboardType="phone-pad"
          onChangeText={(v) => setForm({ ...form, mobile_number: v })}
        />

        <FieldLabel text="Address" />
        <TextInput
          style={styles.input}
          placeholder="123 Main St, City"
          placeholderTextColor={AppTheme.colors.mutedText}
          value={form.address}
          onChangeText={(v) => setForm({ ...form, address: v })}
        />

        <FieldLabel text={isEditing ? 'New Password (blank = unchanged)' : 'Password *'} />
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={AppTheme.colors.mutedText}
          secureTextEntry
          value={form.password}
          onChangeText={(v) => setForm({ ...form, password: v })}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Staff Access</Text>
          <Switch
            value={form.is_staff}
            onValueChange={(v) => setForm({ ...form, is_staff: v })}
            trackColor={{ false: AppTheme.colors.border, true: AppTheme.colors.accent }}
          />
        </View>

        {/* ── Save ── */}
        <Pressable
          style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Create User'}</Text>}
        </Pressable>

        {isEditing && (
          <Pressable
            style={[styles.deleteBtn, deleteMutation.isPending && { opacity: 0.7 }]}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? <ActivityIndicator color={AppTheme.colors.danger} />
              : <Text style={styles.deleteBtnText}>Delete User</Text>}
          </Pressable>
        )}

        {/* ── Assigned Devices (edit mode only) ── */}
        {isEditing && (
          <>
            <View style={styles.divider} />
            <SectionLabel text="Assigned Devices" />

            {devicesQuery.isLoading ? (
              <ActivityIndicator color={AppTheme.colors.accent} style={{ marginTop: 8 }} />
            ) : devicesQuery.isError ? (
              <Text style={styles.errorText}>Failed to load devices</Text>
            ) : devices.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="hardware-chip-outline" size={24} color={AppTheme.colors.dimText} />
                <Text style={styles.emptyText}>No devices assigned yet</Text>
                <Text style={styles.emptySubtext}>
                  Go to a device and assign it to @{existingUser?.username}
                </Text>
              </View>
            ) : (
              devices.map(d => (
                <View key={d.id} style={styles.deviceCard}>
                  <View style={[styles.deviceIcon, {
                    backgroundColor: d.is_online ? AppTheme.colors.accentSoft : AppTheme.colors.cardElevated,
                  }]}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={18}
                      color={d.is_online ? AppTheme.colors.accent : AppTheme.colors.dimText}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceSerial}>{d.device_serial}</Text>
                    <Text style={styles.deviceMeta}>
                      {[d.model, d.hw_id].filter(Boolean).join(' • ') || 'Unknown model'}
                      {d.last_heartbeat ? `  •  ${fmtDateTimeIST(d.last_heartbeat)}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, {
                    backgroundColor: d.is_online ? AppTheme.colors.accent : AppTheme.colors.dimText,
                  }]} />
                </View>
              ))
            )}

            {/* ── Solar Site (only if user has a device) ── */}
            {devices.length > 0 && (
              <>
                <View style={[styles.divider, { marginTop: 8 }]} />
                <SectionLabel text="Solar Site" />

                {siteQuery.isLoading ? (
                  <ActivityIndicator color={AppTheme.colors.accent} style={{ marginTop: 8 }} />
                ) : site ? (
                  <View style={styles.siteCard}>
                    <View style={styles.siteCardHeader}>
                      <Ionicons name="location" size={18} color={AppTheme.colors.accent} />
                      <Text style={styles.siteName}>{site.display_name}</Text>
                    </View>
                    <Text style={styles.siteId}>{site.site_id}</Text>
                    <View style={styles.siteMeta}>
                      {site.capacity_kw != null && (
                        <MetaPill icon="flash-outline" text={`${site.capacity_kw} kW`} />
                      )}
                      {site.latitude != null && site.longitude != null && (
                        <MetaPill icon="navigate-outline" text={`${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`} />
                      )}
                      <MetaPill icon="time-outline" text={site.timezone} />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.emptyCard}>
                      <Ionicons name="location-outline" size={24} color={AppTheme.colors.dimText} />
                      <Text style={styles.emptyText}>No site created yet</Text>
                      <Pressable
                        style={styles.createSiteBtn}
                        onPress={() => setShowCreateSite(v => !v)}
                      >
                        <Feather name={showCreateSite ? 'x' : 'plus'} size={14} color={AppTheme.colors.accent} />
                        <Text style={styles.createSiteBtnText}>
                          {showCreateSite ? 'Cancel' : 'Create Site'}
                        </Text>
                      </Pressable>
                    </View>

                    {showCreateSite && (
                      <View style={styles.createSiteForm}>
                        <FieldLabel text="Site ID *" />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. cust_001"
                          placeholderTextColor={AppTheme.colors.mutedText}
                          value={siteForm.site_id}
                          autoCapitalize="none"
                          onChangeText={v => setSiteForm({ ...siteForm, site_id: v })}
                        />
                        <FieldLabel text="Display Name *" />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. John's Rooftop Solar"
                          placeholderTextColor={AppTheme.colors.mutedText}
                          value={siteForm.display_name}
                          onChangeText={v => setSiteForm({ ...siteForm, display_name: v })}
                        />
                        <FieldLabel text="Capacity (kW)" />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 5.0"
                          placeholderTextColor={AppTheme.colors.mutedText}
                          value={siteForm.capacity_kw}
                          keyboardType="decimal-pad"
                          onChangeText={v => setSiteForm({ ...siteForm, capacity_kw: v })}
                        />
                        <Pressable
                          style={[styles.saveBtn, createSiteMutation.isPending && { opacity: 0.7 }]}
                          onPress={() => {
                            if (!siteForm.site_id.trim() || !siteForm.display_name.trim()) {
                              Alert.alert('Required', 'Site ID and Display Name are required.');
                              return;
                            }
                            createSiteMutation.mutate();
                          }}
                          disabled={createSiteMutation.isPending}
                        >
                          {createSiteMutation.isPending
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.saveBtnText}>Create Site</Text>}
                        </Pressable>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={styles.sectionLabel}>{text}</Text>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function MetaPill({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={11} color={AppTheme.colors.mutedText} />
      <Text style={styles.metaPillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.bg,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.full,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  headerTitle: { color: AppTheme.colors.text, fontSize: 18, fontWeight: '800' },
  sectionLabel: {
    color: AppTheme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  fieldLabel: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: AppTheme.colors.card,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: AppTheme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 24,
    marginTop: 8,
  },
  switchLabel: { color: AppTheme.colors.text, fontSize: 15, fontWeight: '500' },
  saveBtn: {
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    borderColor: 'rgba(239,68,68,0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteBtnText: { color: AppTheme.colors.danger, fontSize: 16, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
    marginVertical: 20,
  },
  emptyCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  emptyText: { color: AppTheme.colors.mutedText, fontWeight: '600', fontSize: 14 },
  emptySubtext: {
    color: AppTheme.colors.dimText,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: { color: AppTheme.colors.danger, fontSize: 13, marginTop: 4 },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSerial: { color: AppTheme.colors.text, fontWeight: '700', fontSize: 14 },
  deviceMeta: { color: AppTheme.colors.mutedText, fontSize: 11, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  siteCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderAccent,
    padding: 16,
    marginBottom: 4,
  },
  siteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  siteName: { color: AppTheme.colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  siteId: { color: AppTheme.colors.mutedText, fontSize: 12, marginBottom: 10, marginLeft: 26 },
  siteMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginLeft: 26 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppTheme.colors.cardElevated,
    borderRadius: AppTheme.radii.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaPillText: { color: AppTheme.colors.mutedText, fontSize: 11, fontWeight: '600' },
  createSiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.accentSoft,
    borderRadius: AppTheme.radii.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderAccent,
    marginTop: 4,
  },
  createSiteBtnText: { color: AppTheme.colors.accent, fontWeight: '700', fontSize: 13 },
  createSiteForm: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
  },
});
