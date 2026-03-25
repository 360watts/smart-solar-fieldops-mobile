import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppTheme } from '../theme/theme';

export function KpiCard({
  title,
  value,
  subtitle,
  accent = AppTheme.colors.accent,
  iconName,
  renderIcon,
  isActive = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accent?: string;
  iconName?: keyof typeof Feather.glyphMap;
  renderIcon?: (props: { color: string; size: number }) => React.ReactNode;
  /** When true adds a subtle glow border to highlight the card */
  isActive?: boolean;
}) {
  // Fade-in pulse for new values
  const fadeAnim = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [value]);

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: AppTheme.colors.card,
        borderColor: isActive ? `${accent}50` : AppTheme.colors.border,
        borderWidth: 1,
        borderRadius: AppTheme.radii.lg,
        padding: 13,
        minHeight: 100,
        overflow: 'hidden',
        ...(isActive ? AppTheme.shadows.glow(accent) : {}),
      }}
    >
      {/* Subtle corner glow decoration — same pattern as 21st.dev KPI */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -18,
          right: -18,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: `${accent}0A`,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: `${accent}0D`,
        }}
      />

      {/* Header row: icon + label + optional sparkline */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{
            width: 30,
            height: 30,
            borderRadius: AppTheme.radii.sm,
            backgroundColor: `${accent}18`,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: `${accent}25`,
          }}>
            {renderIcon
              ? renderIcon({ color: accent, size: 15 })
              : iconName
                ? <Feather name={iconName} size={15} color={accent} />
                : null}
          </View>
          <Text
            style={{ color: AppTheme.colors.mutedText, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      </View>

      {/* Value */}
      <Animated.Text
        style={{ color: AppTheme.colors.text, fontSize: 21, fontWeight: '900', marginTop: 8, opacity: fadeAnim }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Animated.Text>

      {/* Subtitle */}
      {subtitle ? (
        <Text style={{ color: AppTheme.colors.dimText, marginTop: 3, fontSize: 11 }} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}

      {/* Accent bottom baseline bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 14, width: 24, height: 2, borderRadius: 1, backgroundColor: `${accent}50`, marginBottom: 8 }} />
    </View>
  );
}
