export type Device = {
  id: number;
  device_serial: string;
  is_online?: boolean;
  last_heartbeat?: string;
  hw_id?: string;
  model?: string;
  config_version?: string;
  user?: string | null;
};
