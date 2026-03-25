import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { LinearGradient } from 'expo-linear-gradient';
import { AppTheme } from '../../theme/theme';
import { fetchUsers } from '../../api/smartSolar';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;
type Route = RouteProp<CommissioningParamList, 'Step3Owner'>;

type OwnerMode = 'new' | 'existing';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, focused && fieldStyles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={AppTheme.colors.dimText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: AppTheme.colors.cardElevated,
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
});

export function Step3Owner() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params;

  const [mode, setMode] = useState<OwnerMode>('new');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState('');

  // New user fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', { search: userSearch }],
    queryFn: () => fetchUsers({ search: userSearch, pageSize: 20 }),
    enabled: mode === 'existing',
    staleTime: 30_000,
  });

  const users = usersData?.results ?? [];

  const isNewValid = firstName.trim() && username.trim() && email.trim() && password.length >= 6;
  const isExistingValid = !!selectedUserId;
  const canContinue = mode === 'new' ? isNewValid : isExistingValid;

  function handleNext() {
    if (!canContinue) return;
    navigation.navigate('Step4Review', {
      ...params,
      ownerType: mode,
      ...(mode === 'existing'
        ? { ownerUserId: selectedUserId!, ownerUsername: selectedUsername }
        : {
            ownerFirstName: firstName.trim(),
            ownerLastName: lastName.trim(),
            ownerUsername: username.trim(),
            ownerEmail: email.trim(),
            ownerPhone: phone.trim(),
            ownerPassword: password,
          }),
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <StepHeader
          currentStep={3}
          onBack={() => navigation.goBack()}
          onClose={() => navigation.getParent()?.goBack()}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Site Owner</Text>
          <Text style={styles.sub}>
            Assign a customer or owner to this site. You can create a new account or link an existing one.
          </Text>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['new', 'existing'] as OwnerMode[]).map(m => (
              <Pressable
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
              >
                <Ionicons
                  name={m === 'new' ? 'person-add-outline' : 'people-outline'}
                  size={16}
                  color={mode === m ? AppTheme.colors.accent : AppTheme.colors.mutedText}
                />
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'new' ? 'New Account' : 'Existing User'}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'new' ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>New Owner Account</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Raj" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Sharma" />
                </View>
              </View>
              <Field
                label="Username"
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s+/g, ''))}
                placeholder="raj.sharma"
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="raj@example.com"
                keyboardType="email-address"
              />
              <Field
                label="Mobile Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
              <Field
                label="Temporary Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                secureTextEntry
              />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Search Existing Users</Text>
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color={AppTheme.colors.dimText} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Name, username or email…"
                  placeholderTextColor={AppTheme.colors.dimText}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {usersLoading ? (
                <ActivityIndicator color={AppTheme.colors.accent} style={{ marginVertical: 20 }} />
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>
                  {userSearch ? 'No users match your search' : 'Start typing to search'}
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
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.nextBtn, !canContinue && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canContinue}
          >
            <LinearGradient
              colors={AppTheme.gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>Review & Activate</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
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
  heading: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  sub: {
    color: AppTheme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: AppTheme.radii.sm,
  },
  modeBtnActive: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  modeBtnText: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: AppTheme.colors.accent,
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
  },
  sectionLabel: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
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
  searchInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: AppTheme.radii.sm,
    marginBottom: 4,
  },
  userRowSelected: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: AppTheme.colors.accent },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.colors.accent,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: AppTheme.colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  userName: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  userSub: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  nextBtn: {
    borderRadius: AppTheme.radii.md,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
