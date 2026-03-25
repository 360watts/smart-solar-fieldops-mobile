import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { AppTheme } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.54;

/** Animated arc progress ring */
function ArcProgress({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const animPct = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animPct, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;

  const strokeDashoffset = animPct.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`${color}20`}
          strokeWidth={4}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center pct label */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: 11, fontWeight: '900' }}>{pct}%</Text>
      </View>
    </View>
  );
}

export function SolarInsights({ latest }: { latest: any }) {
  if (!latest) return null;

  const pvKwh = Number(latest.pv_today_kwh ?? 0);
  const loadKwh = Number(latest.load_today_kwh ?? 0);
  const gridBuy = Number(latest.grid_buy_today_kwh ?? 0);

  if (pvKwh === 0 && loadKwh === 0) return null;

  const co2Kg = pvKwh * 0.82;
  const selfSufPct = loadKwh > 0
    ? Math.max(0, Math.min(100, Math.round(((loadKwh - gridBuy) / loadKwh) * 100)))
    : null;
  const gridDepPct = loadKwh > 0
    ? Math.max(0, Math.min(100, Math.round((gridBuy / loadKwh) * 100)))
    : null;

  const items: Array<{
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
    sub?: string;
    color: string;
    pct?: number;
  }> = [];

  if (pvKwh > 0) {
    items.push({
      icon: 'wind',
      label: 'CO₂ Avoided',
      value: co2Kg >= 1 ? `${co2Kg.toFixed(2)} kg` : `${(co2Kg * 1000).toFixed(0)} g`,
      sub: 'vs grid (0.82 kg/kWh)',
      color: AppTheme.colors.success,
    });
  }
  if (selfSufPct != null) {
    const color = selfSufPct >= 70 ? AppTheme.colors.accent : selfSufPct >= 40 ? AppTheme.colors.warning : AppTheme.colors.danger;
    items.push({
      icon: 'zap',
      label: 'Self-Sufficiency',
      value: `${selfSufPct}%`,
      sub: 'load met by solar + batt',
      color,
      pct: selfSufPct,
    });
  }
  if (gridDepPct != null) {
    const color = gridDepPct <= 20 ? AppTheme.colors.success : gridDepPct <= 50 ? AppTheme.colors.warning : AppTheme.colors.danger;
    items.push({
      icon: 'activity',
      label: 'Grid Dependency',
      value: `${gridDepPct}%`,
      sub: 'portion from grid',
      color,
      pct: gridDepPct,
    });
  }

  if (!items.length) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: AppTheme.colors.mutedText, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
        Solar Insights
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>
        {items.map(item => (
          <View
            key={item.label}
            style={{
              backgroundColor: `${item.color}0D`,
              borderColor: `${item.color}28`,
              borderWidth: 1,
              borderRadius: AppTheme.radii.lg,
              paddingVertical: 12,
              paddingHorizontal: 13,
              width: CARD_WIDTH,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Arc progress or icon */}
            {item.pct != null ? (
              <ArcProgress pct={item.pct} color={item.color} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${item.color}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${item.color}28` }}>
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ color: AppTheme.colors.mutedText, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {item.label}
              </Text>
              <Text style={{ color: item.color, fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                {item.value}
              </Text>
              {item.sub ? (
                <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, marginTop: 2 }}>{item.sub}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
