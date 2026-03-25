import { useAuth } from './AuthContext';

export type UserRole = 'admin' | 'staff' | 'viewer';

export function usePermissions() {
  const { user } = useAuth();

  const isAdmin = !!user?.is_superuser;
  const isStaff = !!user?.is_staff; // true for both staff and superusers in Django

  const role: UserRole = isAdmin ? 'admin' : isStaff ? 'staff' : 'viewer';

  return {
    role,
    isAdmin,
    isStaff,
    isViewer: role === 'viewer',

    // Site management
    canEditSite: isAdmin,
    canCommission: isStaff,
    canSwitchSite: isStaff,

    // Devices
    canViewUnassigned: isStaff,

    // Alerts
    canAcknowledgeAlerts: isStaff,
    canResolveAlerts: isStaff,
  };
}
