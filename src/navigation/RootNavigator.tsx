import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { SplashScreen } from '../screens/Splash/SplashScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { WorksitesScreen } from '../screens/Worksites/WorksitesScreen';
import { SiteOpsNavigator } from './SiteOpsNavigator';
import { CommissioningNavigator } from '../screens/Commissioning/CommissioningNavigator';
import { UserFormScreen } from '../screens/Users/UserFormScreen';
import type { UserSummary } from '../api/smartSolar';

export type RootStackParamList = {
  Login: undefined;
  Worksites: undefined;
  SiteOps: undefined;
  Commissioning: undefined;
  UserForm: { user?: UserSummary };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Worksites" component={WorksitesScreen} />
          <Stack.Screen
            name="SiteOps"
            component={SiteOpsNavigator}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Commissioning"
            component={CommissioningNavigator}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="UserForm"
            component={UserFormScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
