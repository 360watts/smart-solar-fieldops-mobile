import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, type ViewStyle } from 'react-native';
import { AppTheme } from '../theme/theme';

/**
 * Gold-standard shimmer skeleton for any loading state.
 * Usage: <SkeletonLoader width={120} height={16} borderRadius={8} />
 *        <SkeletonLoader style={{ flex: 1 }} height={96} />
 */
export function SkeletonLoader({
  width,
  height = 16,
  borderRadius = AppTheme.radii.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: AppTheme.colors.cardElevated,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** KPI card skeleton — matches KpiCard layout */
export function KpiCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SkeletonLoader width={28} height={28} borderRadius={8} />
        <SkeletonLoader width={60} height={12} />
      </View>
      <SkeletonLoader width={90} height={22} style={{ marginTop: 10 }} />
      <SkeletonLoader width={70} height={11} style={{ marginTop: 6 }} />
    </View>
  );
}

/** Alert row skeleton */
export function AlertRowSkeleton() {
  return (
    <View style={[styles.card, { marginBottom: 8 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLoader width="70%" height={14} />
        <SkeletonLoader width={64} height={24} borderRadius={AppTheme.radii.full} />
      </View>
      <SkeletonLoader width="40%" height={11} style={{ marginTop: 10 }} />
    </View>
  );
}

/** Device row skeleton */
export function DeviceRowSkeleton() {
  return (
    <View style={[styles.card, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <SkeletonLoader width={36} height={36} borderRadius={AppTheme.radii.sm} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLoader width="55%" height={14} />
        <SkeletonLoader width="35%" height={11} />
      </View>
      <SkeletonLoader width={16} height={16} borderRadius={AppTheme.radii.full} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.card,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radii.lg,
    padding: 14,
    flex: 1,
  },
});
