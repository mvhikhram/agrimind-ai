import { Esp32HeartbeatPayload, Esp32TelemetryPayload, SensorData } from '../types';

export interface ParsedEsp32Message {
  type: 'heartbeat' | 'telemetry' | 'pump_state' | 'response' | 'raw_log';
  isJson: boolean;
  heartbeat?: Esp32HeartbeatPayload;
  telemetry?: {
    sensorData: Partial<SensorData>;
    rawPayload: Esp32TelemetryPayload;
  };
  pumpState?: {
    pump: number;
    state: 'ON' | 'OFF';
  };
  response?: Record<string, any>;
  raw: string;
  error?: string;
}

/**
 * Validates whether a given object resembles an ESP32 status / heartbeat message.
 */
export function isHeartbeatPayload(obj: any): obj is Esp32HeartbeatPayload {
  if (!obj || typeof obj !== 'object') return false;
  return (
    obj.type === 'heartbeat' ||
    obj.type === 'status' ||
    obj.device === 'ESP32' ||
    typeof obj.wifi_connected === 'boolean' ||
    typeof obj.backend_connected === 'boolean'
  );
}

/**
 * Validates whether a given object resembles a sensor telemetry message.
 */
export function isTelemetryPayload(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.type === 'telemetry') return true;
  
  // Check for common ESP32 sensor metrics
  const hasMetric = 
    typeof obj.soil_moisture === 'number' ||
    typeof obj.soil_moisture_1 === 'number' ||
    typeof obj.soil_moisture_2 === 'number' ||
    typeof obj.tank_level === 'number' ||
    typeof obj.tank_distance_cm === 'number' ||
    typeof obj.temperature === 'number' ||
    typeof obj.humidity === 'number' ||
    typeof obj.light_level === 'number' ||
    (obj.data && typeof obj.data === 'object');

  return Boolean(hasMetric);
}

/**
 * Parse an incoming line of text received from the ESP32 (Wi-Fi or Serial).
 */
export function parseEsp32Line(line: string): ParsedEsp32Message {
  const trimmed = line.trim();
  if (!trimmed) {
    return {
      type: 'raw_log',
      isJson: false,
      raw: line
    };
  }

  // Attempt JSON parsing
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);

      // Check for Pump State Confirmation Response
      if (
        parsed.type === 'pump_state' ||
        (typeof parsed.pump === 'number' && (parsed.state === 'ON' || parsed.state === 'OFF'))
      ) {
        return {
          type: 'pump_state',
          isJson: true,
          pumpState: {
            pump: Number(parsed.pump),
            state: (parsed.state === 'ON' || parsed.state === 'true' || parsed.state === true) ? 'ON' : 'OFF'
          },
          raw: trimmed
        };
      }

      // Check for Heartbeat / Status
      if (isHeartbeatPayload(parsed)) {
        const p = parsed as any;
        return {
          type: 'heartbeat',
          isJson: true,
          heartbeat: {
            device: p.device || 'ESP32',
            type: 'heartbeat',
            wifi_connected: Boolean(p.wifi_connected),
            backend_connected: Boolean(p.backend_connected),
            rssi: typeof p.rssi === 'number' ? p.rssi : undefined,
            uptime_seconds: typeof p.uptime_seconds === 'number' ? p.uptime_seconds : undefined,
            timestamp: p.timestamp || new Date().toISOString(),
            ip: p.ip,
            ssid: p.ssid,
            firmware_version: p.firmware_version
          },
          raw: trimmed
        };
      }

      // Check for Telemetry
      if (isTelemetryPayload(parsed)) {
        const sourceData = parsed.data || parsed;
        const sensorData: Partial<SensorData> = {};

        if (typeof sourceData.soil_moisture === 'number') sensorData.soil_moisture = Number(sourceData.soil_moisture);
        if (typeof sourceData.soil_moisture_1 === 'number') sensorData.soil_moisture_zone1 = Number(sourceData.soil_moisture_1);
        if (typeof sourceData.soil_moisture_2 === 'number') sensorData.soil_moisture_zone2 = Number(sourceData.soil_moisture_2);
        if (typeof sourceData.tank_distance_cm === 'number') sensorData.tank_distance_cm = Number(sourceData.tank_distance_cm);
        if (typeof sourceData.tank_level === 'number') sensorData.tank_distance_cm = Number(sourceData.tank_level);
        if (typeof sourceData.temperature === 'number') sensorData.temperature = Number(sourceData.temperature);
        if (typeof sourceData.humidity === 'number') sensorData.humidity = Number(sourceData.humidity);
        if (typeof sourceData.light_level === 'number') sensorData.light_level = Number(sourceData.light_level);
        if (typeof sourceData.pump_running === 'boolean') sensorData.pump_running = sourceData.pump_running;
        if (typeof sourceData.active_zone_id !== 'undefined') sensorData.active_zone_id = sourceData.active_zone_id;

        return {
          type: 'telemetry',
          isJson: true,
          telemetry: {
            sensorData,
            rawPayload: parsed
          },
          raw: trimmed
        };
      }

      // Generic JSON response / acknowledgment
      return {
        type: 'response',
        isJson: true,
        response: parsed,
        raw: trimmed
      };
    } catch (e: any) {
      return {
        type: 'raw_log',
        isJson: false,
        raw: trimmed,
        error: `JSON parse error: ${e.message}`
      };
    }
  }

  // Plain string / debugging log from ESP32
  return {
    type: 'raw_log',
    isJson: false,
    raw: trimmed
  };
}

/**
 * Format standard command for sending to ESP32 via Serial/USB.
 */
export function formatEsp32Command(cmd: string, args: Record<string, any> = {}): string {
  const payload = {
    cmd,
    ...args,
    ts: Date.now()
  };
  return JSON.stringify(payload) + '\n';
}
