import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../theme/theme';
import { fetchDevices } from '../../api/smartSolar';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;

export function Step1SelectDevice() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedSerial, setSelectedSerial] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['devices', { page: 1, pageSize: 100 }],
    queryFn: () => fetchDevices({ page: 1, pageSize: 100 }),
  });

  const devices: any[] = data?.results ?? [];

  // Show all unassigned devices (no site linked)
  const filtered = useMemo(() => {
    const base = devices.filter((d: any) => {
      const userVal = d.user;
      const hasUser = userVal != null && String(userVal).trim().length > 0;

      const siteVal = d.site_id ?? d.site;
      const hasSite = siteVal != null && String(siteVal).trim().length > 0;

      return !hasUser && !hasSite;
    });
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (d: any) =>
        d.device_serial?.toLowerCase().includes(q) ||
        d.model?.toLowerCase().includes(q) ||
        d.hw_id?.toLowerCase().includes(q)
    );
  }, [devices, search]);

  function handleNext() {
    if (!selected) return;
    navigation.navigate('Step2SiteInfo', {
      deviceId: selected,
      deviceSerial: selectedSerial,
    });
  }

  return (
    <View style={styles.root}>
      <StepHeader
        currentStep={1}
        onClose={() => navigation.getParent()?.goBack()}
      />

      <View style={styles.body}>
        <Text style={styles.heading}>Select a Device</Text>
        <Text style={styles.sub}>
          Choose the provisioned device to anchor this site. The device must already exist in the system.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color={AppTheme.colors.dimText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Serial, model or HW ID…"
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

        {isLoading ? (
          <ActivityIndicator color={AppTheme.colors.accent} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="hardware-chip-outline" size={28} color={AppTheme.colors.dimText} />
            </View>
            <Text style={styles.emptyTitle}>No unassigned devices</Text>
            <Text style={styles.emptySub}>
              {search ? 'No devices match your search' : 'All provisioned devices are already assigned to sites'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => {
              const isSelected = selected === item.id;
              return (
                <Pressable
                  style={[styles.deviceRow, isSelected && styles.deviceRowSelected]}
                  onPress={() => {
                    setSelected(item.id);
                    setSelectedSerial(item.device_serial);
                  }}
                >
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.deviceIconWrap}>
                    <Ionicons
                      name="hardware-chip"
                      size={20}
                      color={isSelected ? AppTheme.colors.accent : AppTheme.colors.mutedText}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceSerial}>{item.device_serial}</Text>
                    <Text style={styles.deviceMeta}>
                      {[item.model, item.hw_id].filter(Boolean).join(' · ') || 'No model info'}
                    </Text>
                  </View>
                  <View style={[
                    styles.onlineDot,
                    { backgroundColor: item.is_online ? AppTheme.colors.success : AppTheme.colors.dimText }
                  ]} />
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <LinearGradient
            colors={AppTheme.gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>Continue — Site Info</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  deviceRowSelected: {
    borderColor: AppTheme.colors.accent,
    backgroundColor: AppTheme.colors.accentSoft,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: AppTheme.colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppTheme.colors.accent,
  },
  deviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppTheme.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSerial: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  deviceMeta: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
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
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    color: AppTheme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
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
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
