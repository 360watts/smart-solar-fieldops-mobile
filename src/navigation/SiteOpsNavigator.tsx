import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from './tabs/MainTabs';
import { DeviceDetailScreen } from '../screens/Devices/DeviceDetailScreen';
import type { Device } from '../screens/Devices/types';

export type SiteOpsStackParamList = {
  MainTabs: undefined;
  DeviceDetail: { device: Device };
};

const Stack = createNativeStackNavigator<SiteOpsStackParamList>();

export function SiteOpsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="DeviceDetail"
        component={DeviceDetailScreen}
        options={{
          animation: Platform.OS === 'ios' ? 'slide_from_bottom' : 'slide_from_right',
          presentation: Platform.OS === 'ios' ? 'modal' : 'card',
        }}
      />
    </Stack.Navigator>
  );
}
