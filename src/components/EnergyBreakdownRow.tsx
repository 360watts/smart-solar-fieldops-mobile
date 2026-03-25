import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppTheme } from '../theme/theme';

export function EnergyBreakdownRow({
  latest,
}: {
  latest: any; // Using any to match the loose typing of the hook
}) {
  if (!latest) return null;

  const items = [
    { label: 'PV Yield', value: latest.pv_today_kwh, color: '#F07522', icon: 'sun' as const },
    { label: 'Grid In', value: latest.grid_buy_today_kwh, color: '#3b82f6', icon: 'arrow-down-circle' as const },
    { label: 'Grid Out', value: latest.grid_sell_today_kwh, color: '#10b981', icon: 'arrow-up-circle' as const },
    { label: 'Batt Chg', value: latest.batt_charge_today_kwh, color: '#8b5cf6', icon: 'arrow-up' as const },
    { label: 'Batt Dchg', value: latest.batt_discharge_today_kwh, color: '#ec4899', icon: 'arrow-down' as const },
    { label: 'Consumption', value: latest.load_today_kwh, color: '#6b7280', icon: 'home' as const },
  ].filter((e) => e.value != null);

  if (!items.length) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: AppTheme.colors.mutedText, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 }}>
        TODAY'S ENERGY BREAKDOWN
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {items.map((e) => (
          <View
            key={e.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: `${e.color}15`,
              borderColor: `${e.color}30`,
              borderWidth: 1,
              borderRadius: 20,
              paddingVertical: 6,
              paddingHorizontal: 12,
              gap: 6,
            }}
          >
            <Feather name={e.icon} size={12} color={e.color} />
            <Text style={{ color: AppTheme.colors.mutedText, fontSize: 11, fontWeight: '600' }}>
              {e.label}:
            </Text>
            <Text style={{ color: AppTheme.colors.text, fontSize: 12, fontWeight: '800' }}>
              {Number(e.value).toFixed(2)}
            </Text>
            <Text style={{ color: AppTheme.colors.mutedText, fontSize: 10 }}>kWh</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
