import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from '../theme/theme';

/**
 * Universal screen header for all main tab screens.
 *
 * - Text-first: large title + optional muted subtitle
 * - Optional right action (icon or text label)
 * - Optional back button (for modal/stack contexts)
 * - Does NOT manage safe-area padding — the parent View handles paddingTop
 */
export function ScreenHeader({
  title,
  subtitle,
  rightAction,
  backAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    onPress: () => void;
    destructive?: boolean;
  };
  backAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 10,
      }}
    >
      {/* Back button */}
      {backAction && (
        <Pressable
          onPress={backAction}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: AppTheme.colors.card,
            borderWidth: 1,
            borderColor: AppTheme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
            marginRight: 2,
          })}
        >
          <Ionicons name="chevron-back" size={18} color={AppTheme.colors.text} />
        </Pressable>
      )}

      {/* Title block */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: AppTheme.colors.text,
            fontSize: 26,
            fontWeight: '800',
            letterSpacing: -0.5,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: AppTheme.colors.mutedText,
              fontSize: 13,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right action */}
      {rightAction && (
        <Pressable
          onPress={rightAction.onPress}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: AppTheme.colors.card,
            borderColor: AppTheme.colors.border,
            borderWidth: 1,
            borderRadius: AppTheme.radii.sm,
            paddingHorizontal: rightAction.label ? 12 : 9,
            paddingVertical: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {rightAction.icon && (
            <Ionicons
              name={rightAction.icon}
              size={17}
              color={rightAction.destructive ? AppTheme.colors.danger : AppTheme.colors.mutedText}
            />
          )}
          {rightAction.label && (
            <Text
              style={{
                color: rightAction.destructive ? AppTheme.colors.danger : AppTheme.colors.text,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {rightAction.label}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
