import { apiRequest } from './http';

export type TelemetryRow = Record<string, any> & {
  timestamp?: string;
};

export type ForecastRow = Record<string, any> & {
  timestamp?: string;
  forecast_for?: string;
  ghi_wm2?: number;
  predicted_pv_kw?: number;
  pv1_power_w?: number;
  pv2_power_w?: number;
};

export type AlertItem = {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  device_id: string;
  timestamp: string;
  resolved: boolean;
  generated?: boolean;
  fault_code?: string;
  status?: 'active' | 'acknowledged' | 'resolved';
};

export type UserSummary = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number?: string | null;
  address?: string | null;
  role?: string;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
};

export async function fetchSiteTelemetry(siteId: string, params: { start_date: string; end_date?: string; days?: number }) {
  const qs = new URLSearchParams();
  qs.set('start_date', params.start_date);
  if (params.end_date) qs.set('end_date', params.end_date);
  if (params.days != null) qs.set('days', String(params.days));
  return apiRequest<TelemetryRow[]>(`/sites/${siteId}/telemetry/?${qs.toString()}`, {}, { auth: 'required' });
}

export async function fetchSiteForecast(siteId: string, params: { start_date?: string; end_date?: string; date?: string }) {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  if (params.start_date) qs.set('start_date', params.start_date);
  if (params.end_date) qs.set('end_date', params.end_date);
  return apiRequest<ForecastRow[]>(`/sites/${siteId}/forecast/${qs.toString() ? `?${qs.toString()}` : ''}`, {}, { auth: 'required' });
}

export async function fetchSiteHistory(siteId: string, params: { start_date: string; end_date: string }) {
  const qs = new URLSearchParams(params);
  return apiRequest<TelemetryRow[]>(`/sites/${siteId}/history/?${qs.toString()}`, {}, { auth: 'required' });
}

export async function fetchSiteWeather(siteId: string) {
  return apiRequest<{
    current: any | null;
    hourly_forecast: any[];
  }>(`/sites/${siteId}/weather/`, {}, { auth: 'required' });
}

export async function fetchAlerts() {
  return apiRequest<AlertItem[]>('/alerts/', {}, { auth: 'required' });
}

export async function fetchSiteAlerts(siteId: string) {
  return apiRequest<AlertItem[]>(`/sites/${siteId}/alerts/`, {}, { auth: 'required' });
}

export async function acknowledgeAlert(alertId: string) {
  return apiRequest(
    `/alerts/${alertId}/acknowledge/`,
    { method: 'POST' },
    { auth: 'required' }
  );
}

export async function resolveAlert(alertId: string) {
  return apiRequest(
    `/alerts/${alertId}/resolve/`,
    { method: 'POST' },
    { auth: 'required' }
  );
}

export async function fetchUsers(params: { search?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('page_size', String(params.pageSize));

  type UsersEnvelope = {
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    results: UserSummary[];
  };

  return apiRequest<UsersEnvelope>(
    `/users/${qs.toString() ? `?${qs.toString()}` : ''}`,
    {},
    { auth: 'required' },
  );
}

export async function createUser(data: Partial<UserSummary> & { password?: string }) {
  return apiRequest<UserSummary>(
    '/users/create/',
    { method: 'POST', body: JSON.stringify(data) },
    { auth: 'required' }
  );
}

export async function updateUser(id: number, data: Partial<UserSummary> & { password?: string }) {
  return apiRequest<UserSummary>(
    `/users/${id}/`,
    { method: 'PUT', body: JSON.stringify(data) },
    { auth: 'required' }
  );
}

export async function deleteUser(id: number) {
  return apiRequest(
    `/users/${id}/delete/`,
    { method: 'DELETE' },
    { auth: 'required' }
  );
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export type SiteStatus = 'draft' | 'commissioning' | 'active' | 'inactive' | 'archived';

export type SiteItem = {
  site_id: string;
  display_name: string;
  capacity_kw: number | null;
  inverter_capacity_kw: number | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  is_active?: boolean;
  updated_at?: string;
  site_status?: SiteStatus;
  devices: { device_id: number; device_serial: string; is_online: boolean }[];
  gateway_device?: {
    is_online?: boolean;
    last_seen_at?: string | null;
    signal_strength_dbm?: number | null;
    heartbeat_health?: { severity?: 'ok' | 'warn' | 'critical' } | null;
  } | null;
};

export async function fetchSites(params?: { includeInactive?: boolean }) {
  const q = params?.includeInactive ? '?include_inactive=1' : '';
  return apiRequest<SiteItem[]>(`/sites/${q}`, {}, { auth: 'required' });
}

export async function createSiteStaff(data: {
  site_id: string;
  owner_user_id: number;
  display_name?: string;
  latitude?: number;
  longitude?: number;
  capacity_kw?: number;
  inverter_capacity_kw?: number;
  tilt_deg?: number;
  azimuth_deg?: number;
  timezone?: string;
  logger_serial?: number;
}) {
  return apiRequest<{ site_id: string; display_name: string }>(
    '/sites/create/',
    { method: 'POST', body: JSON.stringify(data) },
    { auth: 'required' }
  );
}

export async function siteAttachDevice(siteId: string, devicePk: number) {
  return apiRequest(
    `/sites/${encodeURIComponent(siteId)}/devices/${devicePk}/attach/`,
    { method: 'POST' },
    { auth: 'required' }
  );
}



// --- Feature Parity Endpoints ---

export async function fetchSystemHealth() {
  return apiRequest<any>('/health/system/', {}, { auth: 'required' });
}

export async function fetchDevices(params: { search?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('page_size', String(params.pageSize));
  
  return apiRequest<any>(
    `/devices/${qs.toString() ? `?${qs.toString()}` : ''}`,
    {},
    { auth: 'required' }
  );
}

export async function fetchGlobalSlaves() {
  return apiRequest<any[]>('/configurations/global-slaves/', {}, { auth: 'required' });
}

export async function fetchPresets() {
  return apiRequest<any[]>('/presets/', {}, { auth: 'required' });
}

export async function fetchFirmwareLayout() {
  return apiRequest<any>('/firmware/', {}, { auth: 'required' });
}

// ── User-device & user-site relationships ────────────────────────────────────

export type SiteDetail = {
  id: number;
  site_id: string;
  display_name: string;
  latitude: number | null;
  longitude: number | null;
  capacity_kw: number | null;
  inverter_capacity_kw: number | null;
  tilt_deg: number | null;
  azimuth_deg: number | null;
  timezone: string;
  is_active: boolean;
  logger_serial: string | null;
  devices: { device_id: number; device_serial: string; is_online: boolean }[];
};

export async function fetchUserDevices(userId: number) {
  return apiRequest<Array<{
    id: number; device_serial: string; hw_id: string | null; model: string | null;
    config_version: string | null; is_online: boolean; last_heartbeat: string | null;
  }>>(`/users/${userId}/devices/`, {}, { auth: 'required' });
}

export async function fetchUserSite(userId: number) {
  return apiRequest<SiteDetail | null>(`/users/${userId}/site/`, {}, { auth: 'required' });
}

export async function createUserSite(userId: number, data: {
  site_id: string; display_name: string; capacity_kw?: number | null;
  inverter_capacity_kw?: number | null; latitude?: number | null; longitude?: number | null;
  timezone?: string; tilt_deg?: number | null; azimuth_deg?: number | null;
  logger_serial?: number | null;
}) {
  return apiRequest<SiteDetail>(
    `/users/${userId}/site/`,
    { method: 'POST', body: JSON.stringify(data) },
    { auth: 'required' }
  );
}

export async function updateUserSite(userId: number, data: Partial<SiteDetail>) {
  return apiRequest<SiteDetail>(
    `/users/${userId}/site/update/`,
    { method: 'PUT', body: JSON.stringify(data) },
    { auth: 'required' }
  );
}

export async function assignDeviceToUser(deviceId: number, username: string | null) {
  return apiRequest(
    `/devices/${deviceId}/`,
    { method: 'PUT', body: JSON.stringify({ user: username ?? '' }) },
    { auth: 'required' }
  );
}

export async function fetchEmployees(params: { search?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('page_size', String(params.pageSize));
  
  return apiRequest<any>(
    `/users/employees/${qs.toString() ? `?${qs.toString()}` : ''}`,
    {},
    { auth: 'required' }
  );
}
