import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { OverviewScreen } from '../../screens/Overview/OverviewScreen';
import { DevicesScreen } from '../../screens/Devices/DevicesScreen';
import { AlertsScreen } from '../../screens/Alerts/AlertsScreen';
import { SiteScreen } from '../../screens/SiteTab/SiteScreen';
import { CustomTabBar } from './CustomTabBar';

export type MainTabParamList = {
  Overview: undefined;
  Devices: undefined;
  Alerts: undefined;
  Site: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Site" component={SiteScreen} />
    </Tab.Navigator>
  );
}
