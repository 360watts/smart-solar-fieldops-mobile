import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Step1SelectDevice } from './Step1SelectDevice';
import { Step2SiteInfo } from './Step2SiteInfo';
import { Step3Owner } from './Step3Owner';
import { Step4Review } from './Step4Review';

export type CommissioningParamList = {
  Step1SelectDevice: undefined;
  Step2SiteInfo: { deviceId: number; deviceSerial: string };
  Step3Owner: {
    deviceId: number;
    deviceSerial: string;
    siteId: string;
    displayName: string;
    capacityKw: number | null;
    timezone: string;
    latitude: number | null;
    longitude: number | null;
  };
  Step4Review: {
    deviceId: number;
    deviceSerial: string;
    siteId: string;
    displayName: string;
    capacityKw: number | null;
    timezone: string;
    latitude: number | null;
    longitude: number | null;
    ownerType: 'new' | 'existing';
    ownerUserId?: number;
    ownerUsername?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    ownerPassword?: string;
  };
};

const Stack = createNativeStackNavigator<CommissioningParamList>();

export function CommissioningNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Step1SelectDevice" component={Step1SelectDevice} />
      <Stack.Screen name="Step2SiteInfo" component={Step2SiteInfo} />
      <Stack.Screen name="Step3Owner" component={Step3Owner} />
      <Stack.Screen name="Step4Review" component={Step4Review} />
    </Stack.Navigator>
  );
}
