import React, { useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { AppTheme } from '../../theme/theme';
import { fetchSiteAlerts } from '../../api/smartSolar';
import { useAuth } from '../../auth/AuthContext';
import { useSite } from '../../site/SiteContext';

const PILL_HEIGHT = 68;

type TabCfg = {
  focused: keyof typeof Ionicons.glyphMap;
  unfocused: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TAB_CONFIG: Record<string, TabCfg> = {
  Overview:  { focused: 'pulse',           unfocused: 'pulse-outline',           label: 'Overview' },
  Devices:   { focused: 'hardware-chip',   unfocused: 'hardware-chip-outline',   label: 'Devices'  },
  Alerts:    { focused: 'alert-circle',    unfocused: 'alert-circle-outline',    label: 'Alerts'   },
  Site:      { focused: 'business',        unfocused: 'business-outline',        label: 'Site'     },
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { activeSite } = useSite();

  // One scale value per tab slot — static count so hooks are safe
  const scaleRefs = useRef(state.routes.map(() => new Animated.Value(1)));

  const { data: alerts } = useQuery({
    queryKey: ['siteAlerts', activeSite?.site_id],
    queryFn: () => fetchSiteAlerts(activeSite!.site_id),
    staleTime: 60_000,
    enabled: isAuthenticated && !!activeSite,
    meta: { persist: false },
  });

  const criticalCount =
    alerts?.filter(a => a.severity === 'critical' && a.status !== 'resolved').length ?? 0;

  const bottomPad = Math.max(insets.bottom, 8);
  const containerHeight = PILL_HEIGHT + bottomPad + 8;

  return (
    <View style={{ height: containerHeight }}>
      <View
        style={{
          position: 'absolute',
          bottom: bottomPad,
          left: 16,
          right: 16,
          height: PILL_HEIGHT,
          backgroundColor: AppTheme.colors.tabBar,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: AppTheme.colors.border,
          flexDirection: 'row',
          paddingVertical: 6,
          paddingHorizontal: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.50,
          shadowRadius: 24,
          elevation: 14,
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          const iconName = isFocused ? cfg.focused : cfg.unfocused;
          const showBadge = route.name === 'Alerts' && criticalCount > 0;
          const scaleAnim = scaleRefs.current[index];

          const onPressIn = () => {
            Animated.spring(scaleAnim, {
              toValue: 0.90,
              useNativeDriver: true,
              ...AppTheme.animation.spring,
            }).start();
          };

          const onPressOut = () => {
            Animated.spring(scaleAnim, {
              toValue: 1,
              useNativeDriver: true,
              ...AppTheme.animation.spring,
            }).start();
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: isFocused ? AppTheme.colors.accentSoft : 'transparent',
                borderWidth: isFocused ? 1 : 0,
                borderColor: isFocused ? AppTheme.colors.borderAccent : 'transparent',
                gap: 3,
              }}
            >
              <Animated.View
                style={{
                  alignItems: 'center',
                  gap: 3,
                  transform: [{ scale: scaleAnim }],
                }}
              >
                <View style={{ position: 'relative' }}>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={isFocused ? AppTheme.colors.accent : AppTheme.colors.mutedText}
                  />
                  {showBadge && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -5,
                        backgroundColor: AppTheme.colors.danger,
                        borderRadius: 99,
                        minWidth: 14,
                        height: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 2,
                        borderWidth: 1.5,
                        borderColor: AppTheme.colors.tabBar,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>
                        {criticalCount > 9 ? '9+' : String(criticalCount)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Label — always visible, accent when focused */}
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: isFocused ? '700' : '500',
                    letterSpacing: 0.2,
                    color: isFocused ? AppTheme.colors.accent : AppTheme.colors.dimText,
                  }}
                >
                  {cfg.label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
