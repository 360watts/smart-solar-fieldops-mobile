import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppTheme } from '../../theme/theme';
import { fetchDevices, siteAttachDevice } from '../../api/smartSolar';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;
type Route = RouteProp<CommissioningParamList, 'Step2AssignGateway'>;

export function Step2AssignGateway() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { createdSiteId, displayName } = route.params;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['devices', { page: 1, pageSize: 100 }],
    queryFn: () => fetchDevices({ page: 1, pageSize: 100 }),
    staleTime: 0,
    refetchOnMount: true,
  });

  const unassigned: any[] = useMemo(() => {
    const all: any[] = data?.results ?? [];
    const base = all.filter((d: any) => {
      const hasUser = d.user != null && String(d.user).trim().length > 0;
      const hasSite = (d.site_id ?? d.site) != null && String(d.site_id ?? d.site).trim().length > 0;
      return !hasUser && !hasSite;
    });
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (d: any) =>
        d.device_serial?.toLowerCase().includes(q) ||
        d.model?.toLowerCase().includes(q) ||
        d.hw_id?.toLowerCase().includes(q),
    );
  }, [data, search]);

  async function handleAttach() {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await siteAttachDevice(createdSiteId, selectedId);
      await queryClient.invalidateQueries({ queryKey: ['sites'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['devices'], exact: false });
      navigation.navigate('Step3Complete', { createdSiteId, displayName });
    } catch (err: any) {
      Alert.alert('Attach Failed', err?.message ?? 'Could not attach gateway. Check device ID and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    await queryClient.invalidateQueries({ queryKey: ['sites'], exact: false });
    navigation.navigate('Step3Complete', { createdSiteId, displayName });
  }

  return (
    <View style={styles.root}>
      <StepHeader
        currentStep={2}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.getParent()?.goBack()}
      />

      <View style={styles.body}>
        <Text style={styles.heading}>Establish Connectivity</Text>
        <Text style={styles.sub}>
          Link a physical gateway device to enable telemetry and monitoring.
        </Text>

        {/* Target site banner */}
        <View style={styles.siteBanner}>
          <Ionicons name="business" size={14} color={AppTheme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.siteBannerLabel}>Target Site</Text>
            <Text style={styles.siteBannerValue} numberOfLines={1}>{displayName || createdSiteId}</Text>
          </View>
          <Text style={styles.siteBannerId}>{createdSiteId}</Text>
        </View>

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
          <ActivityIndicator color={AppTheme.colors.accent} style={{ marginTop: 32 }} />
        ) : unassigned.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="hardware-chip-outline" size={28} color={AppTheme.colors.dimText} />
            </View>
            <Text style={styles.emptyTitle}>No unassigned devices</Text>
            <Text style={styles.emptySub}>
              {search
                ? 'No devices match your search'
                : 'All provisioned devices are already assigned. You can attach a gateway later from the site settings.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={unassigned}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedId === item.id;
              return (
                <Pressable
                  style={[styles.deviceRow, isSelected && styles.deviceRowSelected]}
                  onPress={() => setSelectedId(isSelected ? null : item.id)}
                >
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.deviceIconWrap}>
                    <Ionicons
                      name="hardware-chip"
                      size={18}
                      color={isSelected ? AppTheme.colors.accent : AppTheme.colors.mutedText}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceSerial}>{item.device_serial}</Text>
                    <Text style={styles.deviceMeta}>
                      {[item.model, item.hw_id].filter(Boolean).join(' · ') || `ID: ${item.id}`}
                    </Text>
                  </View>
                  <View style={[styles.onlineDot, { backgroundColor: item.is_online ? AppTheme.colors.success : AppTheme.colors.dimText }]} />
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.attachBtn, (!selectedId || busy) && styles.btnDisabled]}
          onPress={handleAttach}
          disabled={!selectedId || busy}
        >
          <LinearGradient
            colors={AppTheme.gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="wifi" size={18} color="#fff" />}
            <Text style={styles.btnText}>{busy ? 'Attaching…' : 'Attach Gateway'}</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={handleSkip} disabled={busy}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  heading: { color: AppTheme.colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  sub: { color: AppTheme.colors.mutedText, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  siteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppTheme.colors.accentSoft,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.accent + '44',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  siteBannerLabel: { color: AppTheme.colors.mutedText, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  siteBannerValue: { color: AppTheme.colors.text, fontSize: 14, fontWeight: '700' },
  siteBannerId: { color: AppTheme.colors.accent, fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md, borderWidth: 1, borderColor: AppTheme.colors.border,
    paddingHorizontal: 12, height: 44, gap: 8, marginBottom: 16,
  },
  searchInput: { flex: 1, color: AppTheme.colors.text, fontSize: 15, paddingVertical: 0 },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.md, borderWidth: 1, borderColor: AppTheme.colors.border,
    padding: 14, marginBottom: 8, gap: 10,
  },
  deviceRowSelected: { borderColor: AppTheme.colors.accent, backgroundColor: AppTheme.colors.accentSoft },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: AppTheme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: AppTheme.colors.accent },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppTheme.colors.accent },
  deviceIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: AppTheme.colors.cardElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  deviceSerial: { color: AppTheme.colors.text, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  deviceMeta: { color: AppTheme.colors.mutedText, fontSize: 12, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: AppTheme.colors.card, borderWidth: 1, borderColor: AppTheme.colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { color: AppTheme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: { color: AppTheme.colors.mutedText, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  footer: {
    padding: 20, paddingBottom: 36, gap: 10,
    borderTopWidth: 1, borderTopColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  attachBtn: { borderRadius: AppTheme.radii.md, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: AppTheme.radii.md,
    backgroundColor: AppTheme.colors.card, borderWidth: 1, borderColor: AppTheme.colors.border,
  },
  skipBtnText: { color: AppTheme.colors.mutedText, fontSize: 15, fontWeight: '600' },
});
