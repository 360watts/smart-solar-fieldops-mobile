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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { AppTheme } from '../../theme/theme';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;
type Route = RouteProp<CommissioningParamList, 'Step2SiteInfo'>;

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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  hint?: string;
  mono?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, mono && fieldStyles.mono]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={AppTheme.colors.dimText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
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
  mono: { fontFamily: 'monospace' },
  hint: {
    color: AppTheme.colors.dimText,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
});

export function Step2SiteInfo() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { deviceId, deviceSerial } = route.params;

  const [displayName, setDisplayName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [capacityKw, setCapacityKw] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [showTzPicker, setShowTzPicker] = useState(false);

  const isValid = displayName.trim().length > 0 && siteId.trim().length > 0;

  function handleNext() {
    if (!isValid) return;
    navigation.navigate('Step3Owner', {
      deviceId,
      deviceSerial,
      siteId: siteId.trim(),
      displayName: displayName.trim(),
      capacityKw: capacityKw ? parseFloat(capacityKw) : null,
      timezone,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.root}>
        <StepHeader
          currentStep={2}
          onBack={() => navigation.goBack()}
          onClose={() => navigation.getParent()?.goBack()}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Site Information</Text>
          <Text style={styles.sub}>Enter details for the new installation site.</Text>

          {/* Device anchor */}
          <View style={styles.deviceTag}>
            <Ionicons name="hardware-chip" size={15} color={AppTheme.colors.accent} />
            <Text style={styles.deviceTagText}>Device: {deviceSerial}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Identity</Text>
            <Field
              label="Site Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Sharma Residence — Jaipur"
            />
            <Field
              label="Site ID"
              value={siteId}
              onChangeText={(v) => setSiteId(v.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="e.g. jpr_001"
              hint="Lowercase, underscores only. Cannot be changed later."
              mono
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Technical</Text>
            <Field
              label="System Capacity (kW)"
              value={capacityKw}
              onChangeText={setCapacityKw}
              placeholder="e.g. 5.0"
              keyboardType="decimal-pad"
              hint="Total installed PV capacity"
            />

            {/* Timezone picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={fieldStyles.label}>Timezone</Text>
              <Pressable
                style={[fieldStyles.input, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setShowTzPicker(!showTzPicker)}
              >
                <Text style={{ flex: 1, color: AppTheme.colors.text, fontSize: 15 }}>{timezone}</Text>
                <Ionicons
                  name={showTzPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={AppTheme.colors.mutedText}
                />
              </Pressable>
              {showTzPicker && (
                <View style={styles.tzDropdown}>
                  {TIMEZONES.map(tz => (
                    <Pressable
                      key={tz}
                      style={[styles.tzOption, tz === timezone && styles.tzOptionSelected]}
                      onPress={() => { setTimezone(tz); setShowTzPicker(false); }}
                    >
                      <Text style={[styles.tzOptionText, tz === timezone && styles.tzOptionTextSelected]}>
                        {tz}
                      </Text>
                      {tz === timezone && (
                        <Ionicons name="checkmark" size={16} color={AppTheme.colors.accent} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Location (optional)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Latitude"
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="11.0086"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Longitude"
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="76.9909"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isValid}
          >
            <Text style={styles.nextBtnText}>Continue — Owner</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
    marginBottom: 16,
  },
  deviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.accentSoft,
    borderRadius: AppTheme.radii.full,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  deviceTagText: {
    color: AppTheme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
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
  tzDropdown: {
    backgroundColor: AppTheme.colors.cardElevated,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  tzOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.borderMuted,
  },
  tzOptionSelected: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  tzOptionText: {
    color: AppTheme.colors.text,
    fontSize: 14,
  },
  tzOptionTextSelected: {
    color: AppTheme.colors.accent,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radii.md,
    height: 52,
    gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
