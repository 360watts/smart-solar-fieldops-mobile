import React from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme } from '../theme/theme';

export function Screen({
  children,
  scroll = true,
  scrollEnabled = true,
  contentStyle,
  noTopInset = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  contentStyle?: ViewProps['style'];
  /** When true, use minimal top padding (screens under fixed navbar). */
  noTopInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = noTopInset ? 12 : Math.max(16, insets.top + 12);
  const paddingBottom = Math.max(24, insets.bottom + 16);

  if (!scroll) {
    return (
      <View
        style={[
          { flex: 1, backgroundColor: AppTheme.colors.bg, paddingHorizontal: 16, paddingTop, overflow: 'hidden' },
          contentStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: AppTheme.colors.bg }}
      contentContainerStyle={[
        { paddingHorizontal: 16, paddingTop, paddingBottom, flexGrow: 1 },
        contentStyle,
      ]}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
