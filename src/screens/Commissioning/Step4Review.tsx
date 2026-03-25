import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import { LinearGradient } from 'expo-linear-gradient';
import { AppTheme } from '../../theme/theme';
import {
  createUser,
  createUserSite,
  assignDeviceToUser,
} from '../../api/smartSolar';
import { useSite } from '../../site/SiteContext';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;
type Route = RouteProp<CommissioningParamList, 'Step4Review'>;

function ReviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icon as any} size={16} color={AppTheme.colors.mutedText} style={{ width: 20 }} />
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
    width: 100,
  },
  value: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});

export function Step4Review() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const p = route.params;
  const { selectSite } = useSite();
  const queryClient = useQueryClient();

  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    setActivating(true);
    try {
      // 1. Create or get the owner user
      let userId: number;
      let ownerUsername: string;

      if (p.ownerType === 'new') {
        const newUser = await createUser({
          first_name: p.ownerFirstName,
          last_name: p.ownerLastName,
          username: p.ownerUsername!,
          email: p.ownerEmail,
          mobile_number: p.ownerPhone,
          password: p.ownerPassword,
        });
        userId = newUser.id;
        ownerUsername = newUser.username;
      } else {
        userId = p.ownerUserId!;
        ownerUsername = p.ownerUsername!;
      }

      // 2. Assign device to user
      await assignDeviceToUser(p.deviceId, ownerUsername);

      // 3. Create site linked to user
      const newSite = await createUserSite(userId, {
        site_id: p.siteId,
        display_name: p.displayName,
        capacity_kw: p.capacityKw,
        latitude: p.latitude,
        longitude: p.longitude,
        timezone: p.timezone,
      });

      // 4. Invalidate queries
      // Force refetch of devices/sites so the "unassigned" list updates immediately.
      // (Worksites devices query key is parameterized; use exact:false prefix matching.)
      await queryClient.invalidateQueries({ queryKey: ['sites'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['devices'], exact: false });
      await queryClient.refetchQueries({ queryKey: ['sites'], exact: false });
      await queryClient.refetchQueries({ queryKey: ['devices'], exact: false });

      // 5. Enter site
      await selectSite({ site_id: newSite.site_id, display_name: newSite.display_name });

      // 6. Navigate to site ops (close commissioning modal + enter site)
      navigation.getParent()?.reset({
        index: 1,
        routes: [{ name: 'Worksites' }, { name: 'SiteOps' }],
      });
    } catch (err: any) {
      Alert.alert(
        'Activation Failed',
        err?.message ?? 'An error occurred. Please check your entries and try again.',
      );
    } finally {
      setActivating(false);
    }
  }

  const ownerName =
    p.ownerType === 'new'
      ? [p.ownerFirstName, p.ownerLastName].filter(Boolean).join(' ') || p.ownerUsername!
      : p.ownerUsername!;

  return (
    <View style={styles.root}>
      <StepHeader
        currentStep={4}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.getParent()?.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Review & Activate</Text>
        <Text style={styles.sub}>
          Confirm everything looks correct before activating the site.
        </Text>

        {/* Device */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="hardware-chip" size={16} color={AppTheme.colors.accent} />
            <Text style={styles.cardTitle}>Device</Text>
          </View>
          <ReviewRow icon="barcode-outline" label="Serial" value={p.deviceSerial} />
          <ReviewRow icon="layers-outline" label="ID" value={String(p.deviceId)} />
        </View>

        {/* Site */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="business" size={16} color={AppTheme.colors.accent} />
            <Text style={styles.cardTitle}>Site</Text>
          </View>
          <ReviewRow icon="text-outline" label="Name" value={p.displayName} />
          <ReviewRow icon="key-outline" label="Site ID" value={p.siteId} />
          <ReviewRow icon="flash-outline" label="Capacity" value={p.capacityKw ? `${p.capacityKw} kW` : '—'} />
          <ReviewRow icon="time-outline" label="Timezone" value={p.timezone} />
          <ReviewRow
            icon="location-outline"
            label="Coordinates"
            value={p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : '—'}
          />
        </View>

        {/* Owner */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="person-circle" size={16} color={AppTheme.colors.accent} />
            <Text style={styles.cardTitle}>Owner</Text>
            <View style={styles.ownerTypeBadge}>
              <Text style={styles.ownerTypeBadgeText}>
                {p.ownerType === 'new' ? 'New account' : 'Existing'}
              </Text>
            </View>
          </View>
          <ReviewRow icon="person-outline" label="Name" value={ownerName} />
          {p.ownerEmail && <ReviewRow icon="mail-outline" label="Email" value={p.ownerEmail} />}
          {p.ownerPhone && <ReviewRow icon="call-outline" label="Phone" value={p.ownerPhone} />}
        </View>

        {/* What happens */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={AppTheme.colors.info} />
          <Text style={styles.infoText}>
            Activating will create the site, link the device, {p.ownerType === 'new' ? 'create the owner account, ' : ''}and open the site dashboard.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.activateBtn, activating && styles.activateBtnLoading]}
          onPress={handleActivate}
          disabled={activating}
        >
          <LinearGradient
            colors={AppTheme.gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activateBtnGradient}
          >
            {activating ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.activateBtnText}>Activating…</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.activateBtnText}>Activate Site</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
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
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radii.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  ownerTypeBadge: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderRadius: AppTheme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ownerTypeBadgeText: {
    color: AppTheme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: AppTheme.colors.infoSoft,
    borderRadius: AppTheme.radii.md,
    padding: 14,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: AppTheme.colors.info,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  activateBtn: {
    borderRadius: AppTheme.radii.md,
    overflow: 'hidden',
    shadowColor: AppTheme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  activateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 8,
  },
  activateBtnLoading: { opacity: 0.7 },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
