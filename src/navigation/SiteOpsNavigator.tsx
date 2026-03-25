import React from 'react';
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
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
