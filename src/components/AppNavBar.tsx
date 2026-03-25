import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

import { AppTheme } from '../theme/theme';
import { useSite } from '../site/SiteContext';

const MARK = require('../../assets/360watts-mark.png');

/**
 * Gold-standard top nav bar.
 * Shows:
 *  - 360watts logo mark
 *  - Screen title + active site name
 *  - Live connection pulse dot (green = fresh data, yellow = stale)
 *  - Alert badge count (pulled from React Query cache)
 */
export function AppNavBar({ title, alertCount }: { title: string; alertCount?: number }) {
  const insets = useSafeAreaInsets();
  const { activeSite } = useSite();
  const subtitle = activeSite?.display_name || activeSite?.site_id;

  // Pulse animation for the live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.8, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const showBadge = alertCount != null && alertCount > 0;

  return (
    <View style={[styles.bar, { paddingTop: Math.max(12, insets.top) }]}>
      <View style={styles.row}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={MARK} resizeMode="contain" style={styles.logo} />
        </View>

        {/* Title + site */}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {/* Pulsing live dot */}
              <View style={styles.dotWrapper}>
                <Animated.View style={[styles.dotPulse, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
                <View style={styles.dotCore} />
              </View>
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
          ) : null}
        </View>

        {/* Alert badge */}
        {showBadge && (
          <View style={styles.badgeWrap}>
            <Feather name="bell" size={18} color={AppTheme.colors.warning} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{alertCount! > 99 ? '99+' : alertCount}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.radii.md,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 24, height: 24 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: AppTheme.colors.mutedText,
    fontSize: 12,
  },
  dotWrapper: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.colors.accent,
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.accent,
  },
  badgeWrap: {
    position: 'relative',
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radii.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
