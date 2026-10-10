import { 
  SensorData, 
  Zone, 
  IoTDeviceStatus, 
  FlowAlert, 
  Esp32LiveStatus, 
  HardwareStatus, 
  LatestSensorReadings 
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from './dataService';
import { webSerialService } from './webSerialService';
import { ParsedEsp32Message } from './esp32Protocol';

type TelemetryListener = (data: SensorData) => void;
type StatusListener = (status: Esp32LiveStatus) => void;

// Timeout Thresholds for Real IoT Heartbeat & Telemetry
export const HEARTBEAT_ONLINE_THRESHOLD_SEC = 30; // <= 30s is ONLINE
export const HEARTBEAT_STALE_THRESHOLD_SEC = 120; // 31-120s is STALE, >120s is OFFLINE
export const REAL_IOT_POLL_INTERVAL_MS = 3000;    // Poll Supabase every 3s

// Automatic Irrigation Thresholds
export const DRY_THRESHOLD = 35.0; // Moisture < 35% triggers Pump ON
export const WET_THRESHOLD = 55.0; // Moisture >= 55% triggers Pump OFF
export const MAX_PUMP_RUNTIME_SAFETY_MS = 10000; // 10-second safety timeout for physical pump

// Known Standard Zone IDs
export const DEMO_FARM_ID = '00000000-0000-0000-0000-000000000001';
export const ZONE_1_ID = '00000000-0000-0000-0000-000000000011';
export const ZONE_2_ID = '00000000-0000-0000-0000-000000000012';
export const ZONE_3_ID = '00000000-0000-0000-0000-000000000013';

function getStoredMode(): 'DEMO' | 'REAL_IOT' {
  try {
    const saved = localStorage.getItem('agrimind_iot_mode');
    if (saved === 'REAL_IOT' || saved === 'DEMO') {
      return saved;
    }
  } catch (e) {
    console.warn('Could not read saved IoT mode:', e);
  }
  return 'DEMO';
}

class IoTService {
  private mode: 'DEMO' | 'REAL_IOT' = getStoredMode();
  private activeZoneId: string | null = null;

  // Real-IoT Physical Relay States (Active LOW: LOW=ON, HIGH=OFF)
  private confirmedRelayStates: Record<number, boolean> = {
    1: false, // Relay 1 IN1 -> GPIO25
    2: false, // Relay 2 IN2 -> GPIO26
    3: false  // Relay 3 IN3 -> GPIO27
  };
  private safetyTimeoutTimer: any = null;

  // Real-IoT Extracted Telemetry State from Supabase
  private realMoistureZone1: number | null = null;
  private realMoistureZone2: number | null = null;
  private realTemperature: number | null = null;
  private realHumidity: number | null = null;
  private realLight: number | null = null;
  private realTankDistanceCm: number | null = null;
  private realLastTimestamp: string | null = null;
  private realHardwareStatus: HardwareStatus = 'NO_DATA';
  private realLastDataAgeSec: number | null = null;

  // Demo / Simulation In-Memory State
  private demoFlowRate: number = 0.0;
  private demoWaterConsumptionToday: number = 1280.0;
  private demoTankLevel: number = 64.0;
  private demoTemp: number = 31.0;
  private demoHumidity: number = 67.0;
  private demoLightLevel: number = 780.0;
  private isPumpRunning: boolean = false;

  // Timers
  private simulationInterval: any = null;
  private realIoTPollInterval: any = null;
  private stalenessCheckInterval: any = null;
  private isPollingActive: boolean = false;

  private listeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private esp32Status: Esp32LiveStatus = {
    mode: this.mode,
    wifi: 'NOT_CONNECTED',
    backend: 'NOT_CONNECTED',
    hardware_status: 'NO_DATA',
    last_heartbeat_timestamp: null,
    last_heartbeat_epoch: null,
    last_telemetry_timestamp: null,
    last_telemetry_summary: null,
    rssi: null,
    uptime_seconds: null,
    is_stale: false,
    heartbeat_timeout_seconds: HEARTBEAT_ONLINE_THRESHOLD_SEC,
    serial_connected: false,
    serial_port_name: null,
    serial_baud_rate: 115200,
    latest_readings: {
      soil_moisture_zone1: null,
      soil_moisture_zone2: null,
      temperature: null,
      humidity: null,
      light: null,
      tank_distance_cm: null,
      timestamp: null
    },
    relay_states: {
      relay1: false,
      relay2: false,
      relay3: false
    },
    last_relay_confirmed_at: null
  };

  private deviceStatus: IoTDeviceStatus = {
    esp32_status: 'OFFLINE',
    connected_sensors_count: 5,
    last_data_received: 'No packets received',
    active_mode: this.mode
  };

  constructor() {
    this.initSerialListeners();
    this.startStalenessWatcher();

    if (this.mode === 'REAL_IOT') {
      this.startRealIoTPolling();
    } else {
      this.startSimulation();
    }
  }

  private initSerialListeners(): void {
    webSerialService.onPacket((parsed: ParsedEsp32Message) => {
      this.handleIncomingEsp32Packet(parsed);
    });

    webSerialService.subscribe((status) => {
      this.esp32Status.serial_connected = status === 'CONNECTED';
      this.esp32Status.serial_port_name = webSerialService.getPortInfo();
      this.esp32Status.serial_baud_rate = webSerialService.getSelectedBaudRate();
      this.notifyStatus();
    });
  }

  getEsp32Status(): Esp32LiveStatus {
    return { ...this.esp32Status };
  }

  getDeviceStatus(): IoTDeviceStatus {
    if (this.mode === 'DEMO') {
      return {
        esp32_status: 'ONLINE',
        connected_sensors_count: 5,
        last_data_received: 'Demo stream active',
        active_mode: 'DEMO'
      };
    }
    return {
      esp32_status: this.realHardwareStatus === 'ONLINE' ? 'ONLINE' : (this.realHardwareStatus === 'STALE' ? 'STALE' : 'OFFLINE'),
      connected_sensors_count: 5,
      last_data_received: this.realLastTimestamp ? `${this.realLastDataAgeSec ?? 0}s ago` : 'No data in Supabase',
      active_mode: 'REAL_IOT'
    };
  }

  setMode(mode: 'DEMO' | 'REAL_IOT'): void {
    this.mode = mode;
    this.esp32Status.mode = mode;
    this.deviceStatus.active_mode = mode;

    try {
      localStorage.setItem('agrimind_iot_mode', mode);
    } catch (e) {
      console.warn('Could not save IoT mode to localStorage:', e);
    }

    if (mode === 'REAL_IOT') {
      this.stopSimulation();
      this.startRealIoTPolling();
      this.pollRealIoTDataFromSupabase(); // Immediate initial fetch
    } else {
      this.stopRealIoTPolling();
      this.startSimulation();
    }

    this.notifyStatus();
    this.notify();
  }

  getMode(): 'DEMO' | 'REAL_IOT' {
    return this.mode;
  }

  setHeartbeatTimeout(seconds: number): void {
    this.esp32Status.heartbeat_timeout_seconds = Math.max(5, seconds);
    this.notifyStatus();
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentData());
    return () => this.listeners.delete(listener);
  }

  subscribeEsp32Status(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getEsp32Status());
    return () => this.statusListeners.delete(listener);
  }

  private notify(): void {
    const data = this.getCurrentData();
    this.listeners.forEach((l) => l(data));
  }

  private notifyStatus(): void {
    const status = this.getEsp32Status();
    this.statusListeners.forEach((l) => l(status));
  }

  /**
   * Continuous Poller for Real IoT mode from Supabase.
   */
  private startRealIoTPolling(): void {
    if (this.realIoTPollInterval) clearInterval(this.realIoTPollInterval);
    this.pollRealIoTDataFromSupabase();
    this.realIoTPollInterval = setInterval(() => {
      this.pollRealIoTDataFromSupabase();
    }, REAL_IOT_POLL_INTERVAL_MS);
  }

  private stopRealIoTPolling(): void {
    if (this.realIoTPollInterval) {
      clearInterval(this.realIoTPollInterval);
      this.realIoTPollInterval = null;
    }
  }

  /**
   * Fetches latest ESP32 readings from public.sensor_readings and pump status from public.zones.
   * Single Real-IoT Data Flow:
   * ESP32 -> Wi-Fi -> Supabase -> IoTService -> React State -> Dashboard
   */
  async pollRealIoTDataFromSupabase(): Promise<void> {
    if (this.mode !== 'REAL_IOT' || this.isPollingActive) {
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      this.esp32Status.backend = 'NOT_CONNECTED';
      this.realHardwareStatus = 'OFFLINE';
      this.esp32Status.hardware_status = 'OFFLINE';
      this.esp32Status.is_stale = true;
      this.notifyStatus();
      this.notify();
      return;
    }

    this.isPollingActive = true;

    try {
      const activeFarmId = dataService.getActiveFarmId() || DEMO_FARM_ID;

      // 1. Fetch newest sensor readings (limit 100)
      const { data: readings, error: readingsErr } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      // 2. Fetch current zone states
      const { data: remoteZones, error: zonesErr } = await supabase
        .from('zones')
        .select('*')
        .order('zone_number', { ascending: true });

      if (readingsErr || zonesErr) {
        this.esp32Status.backend = 'NOT_CONNECTED';
        console.warn('Supabase Real-IoT fetch error:', readingsErr || zonesErr);
      } else {
        this.esp32Status.backend = 'CONNECTED';
      }

      if (readings && readings.length > 0) {
        // Find latest timestamp across all readings
        const newestReading = readings[0];
        const newestTimestamp = newestReading.timestamp;
        const nowMs = Date.now();
        const readingMs = new Date(newestTimestamp).getTime();
        const ageSec = Math.max(0, Math.floor((nowMs - readingMs) / 1000));

        this.realLastTimestamp = newestTimestamp;
        this.realLastDataAgeSec = ageSec;
        this.esp32Status.last_telemetry_timestamp = newestTimestamp;
        this.esp32Status.last_heartbeat_timestamp = newestTimestamp;
        this.esp32Status.last_heartbeat_epoch = readingMs;

        // Freshness determination based on strict constant thresholds:
        // <= 30s: ONLINE
        // 31 - 120s: STALE
        // > 120s: OFFLINE
        if (ageSec <= HEARTBEAT_ONLINE_THRESHOLD_SEC) {
          this.realHardwareStatus = 'ONLINE';
          this.esp32Status.hardware_status = 'ONLINE';
          this.esp32Status.is_stale = false;
          this.esp32Status.wifi = 'CONNECTED';
        } else if (ageSec <= HEARTBEAT_STALE_THRESHOLD_SEC) {
          this.realHardwareStatus = 'STALE';
          this.esp32Status.hardware_status = 'STALE';
          this.esp32Status.is_stale = true;
          this.esp32Status.wifi = 'CONNECTED';
        } else {
          this.realHardwareStatus = 'OFFLINE';
          this.esp32Status.hardware_status = 'OFFLINE';
          this.esp32Status.is_stale = true;
          this.esp32Status.wifi = 'NOT_CONNECTED';
        }

        // Extract latest readings per sensor type
        // Soil Moisture 1 (Zone 1) & Soil Moisture 2 (Zone 2)
        const moistureReadings = readings.filter(r => 
          r.sensor_type === 'soil_moisture' || r.sensor_type === 'moisture'
        );
        
        // Zone 1 soil moisture
        const zone1Moisture = moistureReadings.find(r => 
          r.zone_id === ZONE_1_ID || 
          r.zone_id?.endsWith('11') ||
          (r.zone_number && Number(r.zone_number) === 1)
        ) || moistureReadings[0];

        // Zone 2 soil moisture
        const zone2Moisture = moistureReadings.find(r => 
          r.zone_id === ZONE_2_ID || 
          r.zone_id?.endsWith('12') ||
          (r.zone_number && Number(r.zone_number) === 2)
        ) || (moistureReadings.length > 1 ? moistureReadings[1] : null);

        if (zone1Moisture && typeof zone1Moisture.value !== 'undefined' && zone1Moisture.value !== null) {
          this.realMoistureZone1 = Number(zone1Moisture.value);
        }
        if (zone2Moisture && typeof zone2Moisture.value !== 'undefined' && zone2Moisture.value !== null) {
          this.realMoistureZone2 = Number(zone2Moisture.value);
        }

        // Temperature (DHT22)
        const tempReading = readings.find(r => r.sensor_type === 'temperature' || r.sensor_type === 'temp');
        if (tempReading && typeof tempReading.value !== 'undefined' && tempReading.value !== null) {
          this.realTemperature = Number(tempReading.value);
        }

        // Humidity (DHT22)
        const humReading = readings.find(r => r.sensor_type === 'humidity' || r.sensor_type === 'hum');
        if (humReading && typeof humReading.value !== 'undefined' && humReading.value !== null) {
          this.realHumidity = Number(humReading.value);
        }

        // Light (LDR)
        const lightReading = readings.find(r => r.sensor_type === 'light' || r.sensor_type === 'light_level' || r.sensor_type === 'ldr');
        if (lightReading && typeof lightReading.value !== 'undefined' && lightReading.value !== null) {
          this.realLight = Number(lightReading.value);
        }

        // Tank Distance (HC-SR04 ultrasonic distance in cm)
        const tankReading = readings.find(r => 
          r.sensor_type === 'tank_level' || r.sensor_type === 'tank' || r.sensor_type === 'tank_distance' || r.sensor_type === 'tank_distance_cm'
        );
        if (tankReading && typeof tankReading.value !== 'undefined' && tankReading.value !== null) {
          this.realTankDistanceCm = Number(tankReading.value);
        }

        // Update latest readings cache
        this.esp32Status.latest_readings = {
          soil_moisture_zone1: this.realMoistureZone1,
          soil_moisture_zone2: this.realMoistureZone2,
          temperature: this.realTemperature,
          humidity: this.realHumidity,
          light: this.realLight,
          tank_distance_cm: this.realTankDistanceCm,
          timestamp: newestTimestamp
        };

        const summaryParts: string[] = [];
        if (this.realMoistureZone1 !== null) summaryParts.push(`M1: ${this.realMoistureZone1}%`);
        if (this.realMoistureZone2 !== null) summaryParts.push(`M2: ${this.realMoistureZone2}%`);
        if (this.realTemperature !== null) summaryParts.push(`Temp: ${this.realTemperature}°C`);
        if (this.realHumidity !== null) summaryParts.push(`Hum: ${this.realHumidity}%`);
        if (this.realLight !== null) summaryParts.push(`Light: ${this.realLight}%`);
        if (this.realTankDistanceCm !== null) summaryParts.push(`Tank: ${this.realTankDistanceCm}cm`);
        this.esp32Status.last_telemetry_summary = summaryParts.join(' | ');

      } else {
        // No records in table
        this.realHardwareStatus = 'NO_DATA';
        this.esp32Status.hardware_status = 'NO_DATA';
        this.esp32Status.is_stale = true;
        this.esp32Status.wifi = 'NOT_CONNECTED';
      }

      // Update Zones in DataService with live Supabase values
      if (remoteZones && remoteZones.length > 0) {
        let anyPumpActive = false;
        const currentLocalZones = dataService.getZones(activeFarmId);

        currentLocalZones.forEach(z => {
          const remoteZ = remoteZones.find(rz => rz.id === z.id || rz.zone_number === z.zone_number);
          if (remoteZ) {
            z.pump_status = Boolean(remoteZ.pump_status);
            if (z.pump_status) anyPumpActive = true;

            // Apply specific zone moisture if available
            if (z.zone_number === 1 && this.realMoistureZone1 !== null) {
              z.current_moisture = this.realMoistureZone1;
            } else if (z.zone_number === 2 && this.realMoistureZone2 !== null) {
              z.current_moisture = this.realMoistureZone2;
            } else if (typeof remoteZ.current_moisture === 'number') {
              z.current_moisture = Number(remoteZ.current_moisture);
            }
          }
        });

        this.isPumpRunning = anyPumpActive;
      }

      this.notifyStatus();
      this.notify();
    } catch (err) {
      console.warn('Exception during Real-IoT polling from Supabase:', err);
    } finally {
      this.isPollingActive = false;
    }
  }

  /**
   * Handle validated incoming ESP32 message from serial (if connected).
   */
  handleIncomingEsp32Packet(parsed: ParsedEsp32Message): void {
    const now = Date.now();
    const nowIso = new Date().toISOString();

    if (parsed.type === 'pump_state' && parsed.pumpState) {
      const { pump, state } = parsed.pumpState;
      const isOn = state === 'ON';
      if (pump >= 1 && pump <= 3) {
        this.confirmedRelayStates[pump] = isOn;
        this.esp32Status.relay_states = {
          relay1: Boolean(this.confirmedRelayStates[1]),
          relay2: Boolean(this.confirmedRelayStates[2]),
          relay3: Boolean(this.confirmedRelayStates[3])
        };
        this.esp32Status.last_relay_confirmed_at = nowIso;

        // Sync corresponding zone pump_status in DataService
        const zones = dataService.getZones();
        const zone = zones.find(z => (z.pump_number || z.zone_number) === pump);
        if (zone) {
          zone.pump_status = isOn;
          zone.status = isOn ? 'IRRIGATING' : (zone.current_moisture < zone.target_moisture - 5 ? 'WARNING' : 'NORMAL');
          dataService.updateZone(zone);
        }

        this.isPumpRunning = Object.values(this.confirmedRelayStates).some(Boolean);
        this.notify();
        this.notifyStatus();
      }
    } else if (parsed.type === 'heartbeat' && parsed.heartbeat) {
      const hb = parsed.heartbeat;
      this.esp32Status.last_heartbeat_epoch = now;
      this.esp32Status.last_heartbeat_timestamp = hb.timestamp || nowIso;
      this.esp32Status.wifi = hb.wifi_connected ? 'CONNECTED' : 'NOT_CONNECTED';
      this.esp32Status.backend = hb.backend_connected ? 'CONNECTED' : 'NOT_CONNECTED';

      if (typeof hb.rssi === 'number') this.esp32Status.rssi = hb.rssi;
      if (typeof hb.uptime_seconds === 'number') this.esp32Status.uptime_seconds = hb.uptime_seconds;
      this.esp32Status.is_stale = false;
      this.esp32Status.hardware_status = 'ONLINE';

      this.deviceStatus.esp32_status = 'ONLINE';
      this.deviceStatus.last_data_received = 'Just now (Serial)';

      this.notifyStatus();
    } else if (parsed.type === 'telemetry' && parsed.telemetry) {
      const data = parsed.telemetry.sensorData;
      this.esp32Status.last_telemetry_timestamp = nowIso;
      this.esp32Status.hardware_status = 'ONLINE';

      if (this.mode === 'REAL_IOT') {
        if (typeof data.soil_moisture === 'number') this.realMoistureZone1 = data.soil_moisture;
        if (typeof data.soil_moisture_zone1 === 'number') this.realMoistureZone1 = data.soil_moisture_zone1;
        if (typeof data.soil_moisture_zone2 === 'number') this.realMoistureZone2 = data.soil_moisture_zone2;
        if (typeof data.temperature === 'number') this.realTemperature = data.temperature;
        if (typeof data.humidity === 'number') this.realHumidity = data.humidity;
        if (typeof data.light_level === 'number') this.realLight = data.light_level;
        if (typeof data.tank_distance_cm === 'number') this.realTankDistanceCm = data.tank_distance_cm;
        if (typeof data.tank_level === 'number') this.realTankDistanceCm = data.tank_level;
        if (typeof data.pump_running === 'boolean') this.isPumpRunning = data.pump_running;

        this.evaluateAutoIrrigation();
        this.notify();
      }

      this.notifyStatus();
    }
  }

  /**
   * Evaluates automatic irrigation rules:
   * Moisture < 35% -> Turn pump ON (PUMPX_ON)
   * Moisture >= 55% -> Turn pump OFF (PUMPX_OFF)
   * Between 35% and 55% -> Maintain previous state
   */
  evaluateAutoIrrigation(): void {
    const zones = dataService.getZones();
    zones.forEach((zone) => {
      if (zone.irrigation_mode === 'AUTO' || zone.irrigation_mode === undefined) {
        const moisture = zone.current_moisture;
        if (typeof moisture === 'number' && moisture > 0) {
          if (moisture < DRY_THRESHOLD && !zone.pump_status) {
            console.info(`[AUTO-IRRIGATION] Zone ${zone.zone_number} moisture (${moisture}%) < ${DRY_THRESHOLD}%. Activating pump.`);
            this.startIrrigation(zone.id);
          } else if (moisture >= WET_THRESHOLD && zone.pump_status) {
            console.info(`[AUTO-IRRIGATION] Zone ${zone.zone_number} moisture (${moisture}%) >= ${WET_THRESHOLD}%. Deactivating pump.`);
            this.stopIrrigation(zone.id);
          }
        }
      }
    });
  }

  /**
   * Monitor heartbeat timeout for staleness calculation.
   */
  private startStalenessWatcher(): void {
    if (this.stalenessCheckInterval) clearInterval(this.stalenessCheckInterval);

    this.stalenessCheckInterval = setInterval(() => {
      if (this.mode === 'REAL_IOT') {
        if (this.realLastTimestamp) {
          const elapsedSec = Math.floor((Date.now() - new Date(this.realLastTimestamp).getTime()) / 1000);
          this.realLastDataAgeSec = elapsedSec;

          let newStatus: HardwareStatus = 'OFFLINE';
          if (elapsedSec <= HEARTBEAT_ONLINE_THRESHOLD_SEC) {
            newStatus = 'ONLINE';
          } else if (elapsedSec <= HEARTBEAT_STALE_THRESHOLD_SEC) {
            newStatus = 'STALE';
          } else {
            newStatus = 'OFFLINE';
          }

          if (newStatus !== this.realHardwareStatus) {
            this.realHardwareStatus = newStatus;
            this.esp32Status.hardware_status = newStatus;
            this.esp32Status.is_stale = newStatus !== 'ONLINE';
            this.notifyStatus();
            this.notify();
          }
        }
      }
    }, 2000);
  }

  getCurrentData(): SensorData {
    if (this.mode === 'REAL_IOT') {
      const zones = dataService.getZones();
      const targetZone = zones.find((z) => z.id === this.activeZoneId) || zones[1] || zones[0];

      // Primary soil moisture: prioritize target zone's real moisture or Zone 1/2
      let activeMoisture: number | null = null;
      if (targetZone?.zone_number === 2 && this.realMoistureZone2 !== null) {
        activeMoisture = this.realMoistureZone2;
      } else if (this.realMoistureZone1 !== null) {
        activeMoisture = this.realMoistureZone1;
      } else if (this.realMoistureZone2 !== null) {
        activeMoisture = this.realMoistureZone2;
      }

      const ageText = this.realLastDataAgeSec !== null 
        ? `${this.realLastDataAgeSec}s ago` 
        : 'Waiting for ESP32';

      return {
        soil_moisture: activeMoisture,
        soil_moisture_zone1: this.realMoistureZone1,
        soil_moisture_zone2: this.realMoistureZone2,
        tank_distance_cm: this.realTankDistanceCm,
        tank_level: null, // Flow/Tank % is not fabricated in REAL_IOT mode
        water_consumption_today: null, // Flow sensor not connected to ESP32
        flow_rate: null, // Flow sensor not connected to ESP32
        temperature: this.realTemperature,
        humidity: this.realHumidity,
        light_level: this.realLight,
        pump_running: this.isPumpRunning,
        active_zone_id: this.activeZoneId,
        last_updated: this.realHardwareStatus === 'ONLINE' 
          ? `Real IoT Live (${ageText})` 
          : (this.realHardwareStatus === 'STALE' ? `Stale Data (${ageText})` : 'ESP32 data unavailable'),
        is_real_iot: true,
        hardware_status: this.realHardwareStatus,
        last_sensor_timestamp: this.realLastTimestamp,
        last_sensor_age_sec: this.realLastDataAgeSec
      };
    }

    // In DEMO Mode: In-browser simulation
    const zones = dataService.getZones();
    const targetZone = zones.find((z) => z.id === this.activeZoneId) || zones[1] || zones[0];
    const moisture = targetZone ? targetZone.current_moisture : 42.0;

    return {
      soil_moisture: Math.round(moisture * 10) / 10,
      soil_moisture_zone1: Math.round(moisture * 10) / 10,
      soil_moisture_zone2: Math.max(20, Math.round((moisture - 4) * 10) / 10),
      tank_level: Math.round(this.demoTankLevel * 10) / 10,
      tank_distance_cm: Math.round((100 - this.demoTankLevel) * 0.4),
      water_consumption_today: Math.round(this.demoWaterConsumptionToday),
      flow_rate: this.isPumpRunning ? this.demoFlowRate : 0.0,
      temperature: Math.round(this.demoTemp * 10) / 10,
      humidity: Math.round(this.demoHumidity * 10) / 10,
      light_level: Math.round(this.demoLightLevel),
      pump_running: this.isPumpRunning,
      active_zone_id: this.activeZoneId,
      last_updated: 'Demo simulation',
      is_real_iot: false,
      hardware_status: 'ONLINE',
      last_sensor_timestamp: new Date().toISOString(),
      last_sensor_age_sec: 0
    };
  }

  /**
   * Demo Hackathon Trigger: SIMULATE DRY SOIL
   */
  simulateDrySoil(): void {
    if (this.mode === 'REAL_IOT') {
      console.info('Simulation disabled in REAL_IOT mode.');
      return;
    }
    const zones = dataService.getZones();
    const zone2 = zones.find((z) => z.zone_number === 2) || zones[1];
    if (zone2) {
      zone2.current_moisture = 25.0;
      zone2.status = 'CRITICAL';
      zone2.pump_status = false;
      dataService.updateZone(zone2);
    }
    this.notify();
  }

  /**
   * Starts irrigation for a specified zone.
   * Physical Relay Wiring (Active LOW: LOW=ON, HIGH=OFF):
   *   Relay 1 IN1 -> GPIO25 (Zone 1)
   *   Relay 2 IN2 -> GPIO26 (Zone 2)
   *   Relay 3 IN3 -> GPIO27 (Zone 3)
   *
   * Commands: PUMP1_ON, PUMP2_ON, PUMP3_ON
   * Safety: 10-second maximum pump runtime timeout.
   */
  async startIrrigation(zoneId?: string): Promise<{ success: boolean; message: string }> {
    const zones = dataService.getZones();
    const target = zoneId 
      ? zones.find((z) => z.id === zoneId) 
      : (zones.find((z) => z.status === 'CRITICAL' || z.status === 'WARNING') || zones[1] || zones[0]);

    if (!target) {
      return { success: false, message: 'Target zone not found.' };
    }

    const pumpNum = Math.min(3, Math.max(1, target.pump_number || target.zone_number || 1));
    const pinMap: Record<number, string> = { 1: 'GPIO25', 2: 'GPIO26', 3: 'GPIO27' };
    const targetPin = pinMap[pumpNum] || 'GPIO25';
    const commandStr = `PUMP${pumpNum}_ON`;

    // In REAL_IOT Mode:
    if (this.mode === 'REAL_IOT') {
      let serialSent = false;
      if (webSerialService.getStatus() === 'CONNECTED') {
        const sendRes = await webSerialService.send(commandStr);
        serialSent = sendRes.success;
      }

      // Update Supabase zone pump_status
      target.pump_status = true;
      target.status = 'IRRIGATING';
      await dataService.updateZone(target);

      // Start 10-second maximum pump runtime safety timeout
      if (this.safetyTimeoutTimer) clearTimeout(this.safetyTimeoutTimer);
      this.safetyTimeoutTimer = setTimeout(() => {
        console.warn(`[SAFETY] 10s maximum pump runtime reached for Zone ${pumpNum} (${targetPin}). Auto-stopping.`);
        this.stopIrrigation(target.id);
      }, MAX_PUMP_RUNTIME_SAFETY_MS);

      this.activeZoneId = target.id;
      this.isPumpRunning = true;
      this.confirmedRelayStates[pumpNum] = true;
      this.esp32Status.relay_states = {
        relay1: Boolean(this.confirmedRelayStates[1]),
        relay2: Boolean(this.confirmedRelayStates[2]),
        relay3: Boolean(this.confirmedRelayStates[3])
      };
      this.notify();
      this.notifyStatus();

      return {
        success: true,
        message: serialSent
          ? `Dispatched ${commandStr} to ESP32 -> ${targetPin} LOW (Relay ON). 10s safety timeout active.`
          : `Dispatched ${commandStr} (Cloud state updated to Supabase). Connect USB WebSerial for direct hardware serial confirmation.`
      };
    }

    // In DEMO Mode:
    this.isPumpRunning = true;
    this.activeZoneId = target.id;
    this.demoFlowRate = 1.7;
    target.pump_status = true;
    target.status = 'IRRIGATING';
    await dataService.updateZone(target);

    this.notify();
    return { 
      success: true, 
      message: `[DEMO] Pump relay activated for ${target.name} (Channel ${pumpNum}).` 
    };
  }

  /**
   * Stops irrigation for a specified zone or all zones.
   * Commands: PUMP1_OFF, PUMP2_OFF, PUMP3_OFF, ALL_PUMPS_OFF
   */
  async stopIrrigation(zoneId?: string): Promise<{ success: boolean; message: string }> {
    const zones = dataService.getZones();
    const target = zones.find((z) => z.id === (zoneId || this.activeZoneId));
    const pumpNum = target ? Math.min(3, Math.max(1, target.pump_number || target.zone_number || 1)) : 1;
    const pinMap: Record<number, string> = { 1: 'GPIO25', 2: 'GPIO26', 3: 'GPIO27' };
    const targetPin = pinMap[pumpNum] || 'GPIO25';
    const commandStr = zoneId ? `PUMP${pumpNum}_OFF` : 'ALL_PUMPS_OFF';

    // Clear safety timeout timer
    if (this.safetyTimeoutTimer) {
      clearTimeout(this.safetyTimeoutTimer);
      this.safetyTimeoutTimer = null;
    }

    if (this.mode === 'REAL_IOT') {
      let serialSent = false;
      if (webSerialService.getStatus() === 'CONNECTED') {
        const sendRes = await webSerialService.send(commandStr);
        serialSent = sendRes.success;
      }

      if (target) {
        target.pump_status = false;
        target.status = target.current_moisture < target.target_moisture - 5 ? 'WARNING' : 'NORMAL';
        target.last_irrigation = 'Just now';
        await dataService.updateZone(target);
        this.confirmedRelayStates[pumpNum] = false;
      } else {
        zones.forEach(z => {
          z.pump_status = false;
          dataService.updateZone(z);
        });
        this.confirmedRelayStates = { 1: false, 2: false, 3: false };
      }

      this.esp32Status.relay_states = {
        relay1: Boolean(this.confirmedRelayStates[1]),
        relay2: Boolean(this.confirmedRelayStates[2]),
        relay3: Boolean(this.confirmedRelayStates[3])
      };

      this.isPumpRunning = Object.values(this.confirmedRelayStates).some(Boolean);
      this.activeZoneId = null;
      this.notify();
      this.notifyStatus();

      return {
        success: true,
        message: serialSent
          ? `Dispatched ${commandStr} to ESP32 -> ${targetPin} HIGH (Relay OFF).`
          : `Dispatched ${commandStr}. Zone pump status updated in Supabase.`
      };
    }

    // In DEMO Mode:
    if (target) {
      target.pump_status = false;
      target.status = target.current_moisture < target.target_moisture - 5 ? 'WARNING' : 'NORMAL';
      target.last_irrigation = 'Just now';
      await dataService.updateZone(target);
    }

    this.isPumpRunning = false;
    this.demoFlowRate = 0.0;
    this.activeZoneId = null;
    this.notify();

    return {
      success: true,
      message: 'Pump stopped. Relays disengaged.'
    };
  }

  /**
   * Continuous background simulation clock for DEMO mode only.
   */
  private startSimulation(): void {
    if (this.simulationInterval) clearInterval(this.simulationInterval);

    this.simulationInterval = setInterval(() => {
      if (this.mode === 'REAL_IOT') {
        return; // Never run simulation in REAL_IOT mode
      }

      if (this.isPumpRunning && this.activeZoneId) {
        const zones = dataService.getZones();
        const activeZone = zones.find((z) => z.id === this.activeZoneId);

        if (activeZone) {
          this.demoWaterConsumptionToday += 0.57;
          this.demoTankLevel = Math.max(10, this.demoTankLevel - 0.05);
          activeZone.current_moisture = Math.min(60, activeZone.current_moisture + 1.2);
          this.demoFlowRate = 1.65 + Math.random() * 0.1;

          if (activeZone.current_moisture >= 42.0) {
            const startingM = 25.0;
            const endingM = activeZone.current_moisture;
            this.stopIrrigation(activeZone.id);

            dataService.addIrrigationEvent({
              farm_id: activeZone.farm_id,
              zone_id: activeZone.id,
              zone_name: activeZone.name,
              pump_id: activeZone.zone_number,
              mode: 'AUTO',
              start_time: new Date(Date.now() - 15 * 60000).toISOString(),
              end_time: new Date().toISOString(),
              duration_minutes: 15,
              water_used_liters: 25.5,
              starting_moisture: startingM,
              ending_moisture: endingM,
              avg_flow_rate: 1.7
            });
            return;
          }

          dataService.updateZone(activeZone);
        }
      } else if (this.mode === 'DEMO') {
        this.demoTemp = Math.max(26, Math.min(34, this.demoTemp + (Math.random() - 0.5) * 0.1));
        this.demoHumidity = Math.max(55, Math.min(75, this.demoHumidity + (Math.random() - 0.5) * 0.2));
      }

      this.notify();
    }, 2000);
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  detectFlowAnomalies(): FlowAlert[] {
    const alerts: FlowAlert[] = [];
    if (this.mode === 'REAL_IOT') {
      // Flow sensor is not connected on real hardware
      return alerts;
    }

    if (this.isPumpRunning && this.demoFlowRate === 0) {
      alerts.push({
        id: 'alert-1',
        type: 'BLOCKAGE',
        severity: 'CRITICAL',
        message: 'Pump is ON but detected flow is 0 L/min. Possible airlock or mainline valve blockage.',
        timestamp: 'Just now'
      });
    }
    if (!this.isPumpRunning && this.demoFlowRate > 0.2) {
      alerts.push({
        id: 'alert-2',
        type: 'LEAKAGE',
        severity: 'WARNING',
        message: 'Pump is OFF but positive water flow is detected on line.',
        timestamp: 'Just now'
      });
    }
    if (this.demoTankLevel < 20 && this.isPumpRunning) {
      alerts.push({
        id: 'alert-3',
        type: 'LOW_WATER',
        severity: 'CRITICAL',
        message: 'Water tank level low (< 20%). Risk of DC pump dry cavitation.',
        timestamp: 'Just now'
      });
    }
    return alerts;
  }
}

export const iotService = new IoTService();
