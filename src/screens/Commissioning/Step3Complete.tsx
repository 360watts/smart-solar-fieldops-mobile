import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { AppTheme } from '../../theme/theme';
import { useSite } from '../../site/SiteContext';
import { StepHeader } from './StepHeader';
import type { CommissioningParamList } from './CommissioningNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<CommissioningParamList & RootStackParamList>;
type Route = RouteProp<CommissioningParamList, 'Step3Complete'>;

export function Step3Complete() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { createdSiteId, displayName } = route.params;
  const { selectSite } = useSite();

  async function handleEnterSite() {
    await selectSite({ site_id: createdSiteId, display_name: displayName });
    navigation.getParent()?.reset({
      index: 1,
      routes: [{ name: 'Worksites' }, { name: 'SiteOps' }],
    });
  }

  function handleAllSites() {
    navigation.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Worksites' }],
    });
  }

  return (
    <View style={styles.root}>
      <StepHeader currentStep={3} onClose={() => navigation.getParent()?.goBack()} />

      <View style={styles.body}>
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={56} color={AppTheme.colors.accent} />
        </View>

        <Text style={styles.heading}>Site Provisioned</Text>
        <Text style={styles.sub}>
          The foundational setup for{' '}
          <Text style={styles.siteIdInline}>{createdSiteId}</Text>{' '}
          is complete. You can now proceed to map physical hardware to this location.
        </Text>

        {/* Site ID badge */}
        <View style={styles.siteBadge}>
          <Ionicons name="business" size={14} color={AppTheme.colors.accent} />
          <Text style={styles.siteBadgeName} numberOfLines={1}>{displayName || createdSiteId}</Text>
          <Text style={styles.siteBadgeId}>{createdSiteId}</Text>
        </View>

        <View style={styles.actions}>
          {/* Primary — enter site */}
          <Pressable style={styles.primaryBtn} onPress={handleEnterSite}>
            <LinearGradient
              colors={AppTheme.gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="speedometer-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Enter Site Dashboard</Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary — all sites */}
          <Pressable style={styles.secondaryBtn} onPress={handleAllSites}>
            <Ionicons name="list-outline" size={18} color={AppTheme.colors.text} />
            <Text style={styles.secondaryBtnText}>Back to All Worksites</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.bg },
  body: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: AppTheme.colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    color: AppTheme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    color: AppTheme.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  siteIdInline: {
    color: AppTheme.colors.accent,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  siteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppTheme.colors.accentSoft,
    borderRadius: AppTheme.radii.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.accent + '44',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 40,
    alignSelf: 'stretch',
  },
  siteBadgeName: { flex: 1, color: AppTheme.colors.text, fontSize: 14, fontWeight: '700' },
  siteBadgeId: { color: AppTheme.colors.accent, fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  actions: { alignSelf: 'stretch', gap: 12 },
  primaryBtn: { borderRadius: AppTheme.radii.md, overflow: 'hidden' },
  primaryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: AppTheme.radii.md, borderWidth: 1,
    borderColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.card,
  },
  secondaryBtnText: { color: AppTheme.colors.text, fontSize: 15, fontWeight: '600' },
});
