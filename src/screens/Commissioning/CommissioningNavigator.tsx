import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Step1SiteAndOwner } from './Step1SiteAndOwner';
import { Step2AssignGateway } from './Step2AssignGateway';
import { Step3Complete } from './Step3Complete';

export type CommissioningParamList = {
  Step1SiteAndOwner: undefined;
  Step2AssignGateway: { createdSiteId: string; displayName: string };
  Step3Complete: { createdSiteId: string; displayName: string };
};

const Stack = createNativeStackNavigator<CommissioningParamList>();

export function CommissioningNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Step1SiteAndOwner" component={Step1SiteAndOwner} />
      <Stack.Screen name="Step2AssignGateway" component={Step2AssignGateway} />
      <Stack.Screen name="Step3Complete" component={Step3Complete} />
    </Stack.Navigator>
  );
}
