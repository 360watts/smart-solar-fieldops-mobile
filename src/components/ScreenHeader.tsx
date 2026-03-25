import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';

import { AppTheme } from '../theme/theme';

const MARK = require('../../assets/360watts-mark.png');

export function ScreenHeader({
  title,
  subtitle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor: AppTheme.colors.card,
              borderColor: AppTheme.colors.border,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Image source={MARK} resizeMode="contain" style={{ width: 26, height: 26 }} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: AppTheme.colors.text, fontSize: 22, fontWeight: '900' }} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: AppTheme.colors.mutedText, marginTop: 3 }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            style={({ pressed }) => ({
              backgroundColor: AppTheme.colors.card,
              borderColor: AppTheme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: AppTheme.colors.text, fontWeight: '900' }}>{rightAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

