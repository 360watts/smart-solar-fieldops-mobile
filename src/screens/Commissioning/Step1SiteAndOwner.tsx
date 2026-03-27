import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { AppTheme } from '../../theme/theme';
import { fetchUsers, createUser, createSiteStaff } from '../../api/smartSolar';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;

type OwnerMode = 'existing' | 'new';

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Dubai',
  'UTC',
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  hint,
  mono = false,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  hint?: string;
  mono?: boolean;
  secureTextEntry?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, mono && fieldStyles.mono, focused && fieldStyles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={AppTheme.colors.dimText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppTheme.colors.text,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: AppTheme.colors.accent,
    backgroundColor: AppTheme.colors.accentSoft,
  },
  mono: { fontFamily: 'monospace' },
  hint: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
});

export function Step1SiteAndOwner() {
  const navigation = useNavigation<Nav>();

  // ── Site fields ──
  const [siteId, setSiteId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [capacityKw, setCapacityKw] = useState('5');
  const [latitude, setLatitude] = useState('11.0');
  const [longitude, setLongitude] = useState('77.0');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inverterCapacityKw, setInverterCapacityKw] = useState('');
  const [tiltDeg, setTiltDeg] = useState('');
  const [azimuthDeg, setAzimuthDeg] = useState('');
  const [loggerSerial, setLoggerSerial] = useState('');

  // ── Owner fields ──
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('existing');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState('');
  // New user fields
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [busy, setBusy] = useState(false);

  // ── Users query ──
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', { search: ownerSearch }],
    queryFn: () => fetchUsers({ search: ownerSearch, pageSize: 20 }),
    enabled: ownerMode === 'existing',
    staleTime: 30_000,
  });
  const users = usersData?.results ?? [];

  const selectedOwner = useMemo(
    () => users.find(u => u.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  const isExistingValid = ownerMode === 'existing' && !!selectedUserId && siteId.trim().length > 0;
  const isNewValid =
    ownerMode === 'new' &&
    newFirstName.trim().length > 0 &&
    newUsername.trim().length > 0 &&
    newEmail.trim().length > 0 &&
    newPassword.length >= 6 &&
    siteId.trim().length > 0;
  const canSubmit = isExistingValid || isNewValid;

  async function handleCreate() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      // 1. Create user if needed
      let userId: number;
      if (ownerMode === 'new') {
        const newUser = await createUser({
          first_name: newFirstName.trim(),
          last_name: newLastName.trim(),
          username: newUsername.trim(),
          email: newEmail.trim(),
          mobile_number: newPhone.trim() || undefined,
          password: newPassword,
        });
        userId = newUser.id;
      } else {
        userId = selectedUserId!;
      }

      // 2. Create site
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const cap = parseFloat(capacityKw);
      const invCap = inverterCapacityKw.trim() ? parseFloat(inverterCapacityKw) : undefined;
      const tilt = tiltDeg.trim() ? parseFloat(tiltDeg) : undefined;
      const azimuth = azimuthDeg.trim() ? parseFloat(azimuthDeg) : undefined;
      const logger = loggerSerial.trim() ? parseInt(loggerSerial, 10) : undefined;

      const newSite = await createSiteStaff({
        site_id: siteId.trim(),
        owner_user_id: userId,
        display_name: displayName.trim(),
        latitude: Number.isFinite(lat) ? lat : undefined,
        longitude: Number.isFinite(lon) ? lon : undefined,
        capacity_kw: Number.isFinite(cap) ? cap : undefined,
        inverter_capacity_kw: invCap,
        tilt_deg: tilt,
        azimuth_deg: azimuth,
        timezone: timezone || undefined,
        logger_serial: logger,
      });

      navigation.navigate('Step2AssignGateway', {
        createdSiteId: newSite.site_id,
        displayName: newSite.display_name || displayName.trim(),
      });
    } catch (err: any) {
      Alert.alert('Failed to Create Site', err?.message ?? 'Please check your entries and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <StepHeader currentStep={1} onClose={() => navigation.getParent()?.goBack()} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Configure Site Details</Text>
          <Text style={styles.sub}>
            Establish the core record for this installation before assigning equipment.
          </Text>

          {/* ── Identity ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Identity</Text>
            <Field
              label="Site ID"
              value={siteId}
              onChangeText={v => setSiteId(v.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="e.g. jpr_001"
              hint="Lowercase, underscores only. Cannot be changed later."
              mono
            />
            <Field
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Sharma Residence — Jaipur"
            />
          </View>

          {/* ── Owner ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Owner User</Text>
            <View style={styles.modeToggle}>
              {(['existing', 'new'] as OwnerMode[]).map(m => (
                <Pressable
                  key={m}
                  style={[styles.modeBtn, ownerMode === m && styles.modeBtnActive]}
                  onPress={() => setOwnerMode(m)}
                >
                  <Ionicons
                    name={m === 'existing' ? 'people-outline' : 'person-add-outline'}
                    size={15}
                    color={ownerMode === m ? AppTheme.colors.accent : AppTheme.colors.mutedText}
                  />
                  <Text style={[styles.modeBtnText, ownerMode === m && styles.modeBtnTextActive]}>
                    {m === 'existing' ? 'Existing User' : 'New Account'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {ownerMode === 'existing' ? (
              <>
                <View style={styles.searchWrap}>
                  <Ionicons name="search-outline" size={15} color={AppTheme.colors.dimText} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, username or email…"
                    placeholderTextColor={AppTheme.colors.dimText}
                    value={ownerSearch}
                    onChangeText={setOwnerSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {usersLoading ? (
                  <ActivityIndicator color={AppTheme.colors.accent} style={{ marginVertical: 12 }} />
                ) : users.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {ownerSearch ? 'No users match your search' : 'Start typing to search'}
                  </Text>
                ) : (
                  users.map(u => {
                    const isSelected = selectedUserId === u.id;
                    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
                    return (
                      <Pressable
                        key={u.id}
                        style={[styles.userRow, isSelected && styles.userRowSelected]}
                        onPress={() => { setSelectedUserId(u.id); setSelectedUsername(u.username); }}
                      >
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>{fullName[0]?.toUpperCase() ?? '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{fullName}</Text>
                          <Text style={styles.userSub}>@{u.username} · {u.email}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="First Name" value={newFirstName} onChangeText={setNewFirstName} placeholder="Raj" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Last Name" value={newLastName} onChangeText={setNewLastName} placeholder="Sharma" />
                  </View>
                </View>
                <Field
                  label="Username"
                  value={newUsername}
                  onChangeText={v => setNewUsername(v.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="raj.sharma"
                />
                <Field label="Email" value={newEmail} onChangeText={setNewEmail} placeholder="raj@example.com" keyboardType="email-address" />
                <Field label="Mobile" value={newPhone} onChangeText={setNewPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
                <Field label="Temporary Password" value={newPassword} onChangeText={setNewPassword} placeholder="Min 6 characters" secureTextEntry />
              </>
            )}
          </View>

          {/* ── Technical ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Technical</Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={fieldStyles.label}>Timezone</Text>
              <Pressable
                style={[fieldStyles.input, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setShowTzPicker(!showTzPicker)}
              >
                <Text style={{ flex: 1, color: AppTheme.colors.text, fontSize: 15 }}>{timezone}</Text>
                <Ionicons name={showTzPicker ? 'chevron-up' : 'chevron-down'} size={16} color={AppTheme.colors.mutedText} />
              </Pressable>
              {showTzPicker && (
                <View style={styles.tzDropdown}>
                  {TIMEZONES.map(tz => (
                    <Pressable
                      key={tz}
                      style={[styles.tzOption, tz === timezone && styles.tzOptionSelected]}
                      onPress={() => { setTimezone(tz); setShowTzPicker(false); }}
                    >
                      <Text style={[styles.tzOptionText, tz === timezone && styles.tzOptionTextSelected]}>{tz}</Text>
                      {tz === timezone && <Ionicons name="checkmark" size={16} color={AppTheme.colors.accent} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ── Location ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Latitude" value={latitude} onChangeText={setLatitude} placeholder="11.0086" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Longitude" value={longitude} onChangeText={setLongitude} placeholder="76.9909" keyboardType="decimal-pad" />
              </View>
            </View>
          </View>

          {/* ── Advanced toggle ── */}
          <Pressable style={styles.advancedToggle} onPress={() => setShowAdvanced(v => !v)}>
            <Text style={styles.advancedToggleText}>{showAdvanced ? 'Hide' : 'Show'} advanced details</Text>
            <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={14} color={AppTheme.colors.dimText} />
          </Pressable>

          {showAdvanced && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Optional — editable later</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Panel Capacity (kW)" value={capacityKw} onChangeText={setCapacityKw} placeholder="e.g. 5.0" keyboardType="decimal-pad" hint="Total installed PV capacity" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Inverter Capacity (kW)" value={inverterCapacityKw} onChangeText={setInverterCapacityKw} placeholder="e.g. 8" keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Logger Serial" value={loggerSerial} onChangeText={setLoggerSerial} placeholder="Numeric" keyboardType="numeric" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Tilt (°)" value={tiltDeg} onChangeText={setTiltDeg} placeholder="e.g. 18" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Azimuth (°)" value={azimuthDeg} onChangeText={setAzimuthDeg} placeholder="e.g. 180" keyboardType="decimal-pad" />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.nextBtn, (!canSubmit || busy) && styles.nextBtnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit || busy}
          >
            <LinearGradient
              colors={AppTheme.gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              )}
              <Text style={styles.nextBtnText}>{busy ? 'Creating…' : 'Create Site Record'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  heading: { color: AppTheme.colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: AppTheme.colors.mutedText, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: AppTheme.colors.cardElevated,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 3,
    marginBottom: 14,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: AppTheme.radii.sm,
  },
  modeBtnActive: { backgroundColor: AppTheme.colors.accentSoft },
  modeBtnText: { color: AppTheme.colors.mutedText, fontSize: 13, fontWeight: '600' },
  modeBtnTextActive: { color: AppTheme.colors.accent },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.cardElevated,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 14, paddingVertical: 0 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: AppTheme.radii.sm,
    marginBottom: 2,
  },
  userRowSelected: { backgroundColor: AppTheme.colors.accentSoft },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: AppTheme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: AppTheme.colors.accent },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppTheme.colors.accent },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: AppTheme.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: AppTheme.colors.accent, fontSize: 14, fontWeight: '800' },
  userName: { color: AppTheme.colors.text, fontSize: 14, fontWeight: '600' },
  userSub: { color: AppTheme.colors.mutedText, fontSize: 12, marginTop: 1 },
  emptyText: { color: AppTheme.colors.mutedText, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  tzDropdown: {
    backgroundColor: AppTheme.colors.cardElevated,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  tzOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: AppTheme.colors.borderMuted,
  },
  tzOptionSelected: { backgroundColor: AppTheme.colors.accentSoft },
  tzOptionText: { color: AppTheme.colors.text, fontSize: 14 },
  tzOptionTextSelected: { color: AppTheme.colors.accent, fontWeight: '700' },
  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 8,
  },
  advancedToggleText: { color: AppTheme.colors.dimText, fontSize: 13, fontWeight: '600' },
  footer: {
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  nextBtn: { borderRadius: AppTheme.radii.md, overflow: 'hidden' },
  nextBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
