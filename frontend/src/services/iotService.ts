import { SensorData, Zone, IoTDeviceStatus, FlowAlert } from '../types';
import { dataService } from './dataService';

type TelemetryListener = (data: SensorData) => void;

class IoTService {
  private mode: 'DEMO' | 'REAL_IOT' = 'DEMO';
  private activeZoneId: string | null = null;
  private flowRate: number = 0.0; // Single YF-S201 flow sensor reading
  private waterConsumptionToday: number = 1280.0; // Base demo consumption in Liters
  private tankLevel: number = 64.0; // HC-SR04 Tank percentage
  private temp: number = 31.0; // DHT22
  private humidity: number = 67.0; // DHT22
  private lightLevel: number = 780.0; // LDR in lux
  private isPumpRunning: boolean = false;
  private simulationInterval: any = null;
  private listeners: Set<TelemetryListener> = new Set();

  private deviceStatus: IoTDeviceStatus = {
    stm32_status: 'ONLINE',
    esp32_status: 'ONLINE',
    connected_sensors_count: 6,
    last_data_received: '5 seconds ago',
    active_mode: 'DEMO'
  };

  constructor() {
    this.startSimulation();
  }

  getDeviceStatus(): IoTDeviceStatus {
    return { ...this.deviceStatus };
  }

  setMode(mode: 'DEMO' | 'REAL_IOT'): void {
    this.mode = mode;
    this.deviceStatus.active_mode = mode;
  }

  getMode(): 'DEMO' | 'REAL_IOT' {
    return this.mode;
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentData());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const data = this.getCurrentData();
    this.listeners.forEach(l => l(data));
  }

  getCurrentData(): SensorData {
    // Current soil moisture from active or first zone
    const zones = dataService.getZones();
    const targetZone = zones.find(z => z.id === this.activeZoneId) || zones[1] || zones[0];
    const moisture = targetZone ? targetZone.current_moisture : 42.0;

    return {
      soil_moisture: Math.round(moisture * 10) / 10,
      tank_level: Math.round(this.tankLevel * 10) / 10,
      water_consumption_today: Math.round(this.waterConsumptionToday),
      flow_rate: this.isPumpRunning ? this.flowRate : 0.0,
      temperature: Math.round(this.temp * 10) / 10,
      humidity: Math.round(this.humidity * 10) / 10,
      light_level: Math.round(this.lightLevel),
      pump_running: this.isPumpRunning,
      active_zone_id: this.activeZoneId,
      last_updated: 'Just now'
    };
  }

  /**
   * Demo Hackathon Trigger: SIMULATE DRY SOIL
   * Drops Zone 2 moisture to 25% and triggers IRRIGATION REQUIRED status.
   */
  simulateDrySoil(): void {
    const zones = dataService.getZones();
    const zone2 = zones.find(z => z.zone_number === 2) || zones[1];
    if (zone2) {
      zone2.current_moisture = 25.0;
      zone2.status = 'CRITICAL';
      zone2.pump_status = false;
      dataService.updateZone(zone2);
    }
    this.notify();
  }

  /**
   * Starts sequential irrigation for a specified zone.
   * Single flow sensor (YF-S201) constraint: only 1 pump can be actively monitored at once.
   */
  startIrrigation(zoneId?: string): { success: boolean; message: string } {
    const zones = dataService.getZones();
    const target = zoneId 
      ? zones.find(z => z.id === zoneId) 
      : (zones.find(z => z.status === 'CRITICAL' || z.status === 'WARNING') || zones[1]);

    if (!target) {
      return { success: false, message: 'Target zone not found.' };
    }

    if (this.isPumpRunning && this.activeZoneId !== target.id) {
      return {
        success: false,
        message: 'Sequential Rule: Pump is currently running for another zone. Shared YF-S201 flow meter allows one active zone at a time.'
      };
    }

    // Turn ON
    this.isPumpRunning = true;
    this.activeZoneId = target.id;
    this.flowRate = 1.7; // YF-S201 calibrated 1.7 L/min
    target.pump_status = true;
    target.status = 'IRRIGATING';
    dataService.updateZone(target);

    this.notify();
    return { success: true, message: `Pump activated for ${target.name}. Flow: 1.7 L/min.` };
  }

  stopIrrigation(zoneId?: string): void {
    const zones = dataService.getZones();
    const target = zones.find(z => z.id === (zoneId || this.activeZoneId));

    if (target) {
      target.pump_status = false;
      target.status = target.current_moisture < target.target_moisture - 5 ? 'WARNING' : 'NORMAL';
      target.last_irrigation = 'Just now';
      dataService.updateZone(target);
    }

    this.isPumpRunning = false;
    this.flowRate = 0.0;
    this.activeZoneId = null;
    this.notify();
  }

  /**
   * Continuous background simulation clock
   */
  private startSimulation(): void {
    if (this.simulationInterval) clearInterval(this.simulationInterval);

    this.simulationInterval = setInterval(() => {
      if (this.isPumpRunning && this.activeZoneId) {
        // Pump is ON: Increase moisture gradually, consume water, deplete tank slightly
        const zones = dataService.getZones();
        const activeZone = zones.find(z => z.id === this.activeZoneId);

        if (activeZone) {
          // Flow: 1.7 L/min -> ~0.56 L per 2-second tick
          const addedWater = 0.57;
          this.waterConsumptionToday += addedWater;
          this.tankLevel = Math.max(10, this.tankLevel - 0.05);

          // Moisture rises gradually
          activeZone.current_moisture = Math.min(60, activeZone.current_moisture + 1.2);
          this.flowRate = 1.65 + (Math.random() * 0.1); // subtle jitter around 1.7 L/min

          // Check if target moisture (e.g. 42% - 45%) is reached
          if (activeZone.current_moisture >= 42.0) {
            // Target moisture reached: auto stop pump
            const startingM = 25.0;
            const endingM = activeZone.current_moisture;
            this.stopIrrigation(activeZone.id);

            // Record completed event in history
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
      } else {
        // Natural subtle atmospheric variations
        this.temp = Math.max(26, Math.min(34, this.temp + (Math.random() - 0.5) * 0.1));
        this.humidity = Math.max(55, Math.min(75, this.humidity + (Math.random() - 0.5) * 0.2));
      }

      this.notify();
    }, 2000);
  }

  detectFlowAnomalies(): FlowAlert[] {
    const alerts: FlowAlert[] = [];
    if (this.isPumpRunning && this.flowRate === 0) {
      alerts.push({
        id: 'alert-1',
        type: 'BLOCKAGE',
        severity: 'CRITICAL',
        message: 'Pump is ON but YF-S201 detects 0 L/min flow. Possible pump airlock or mainline valve blockage.',
        timestamp: 'Just now'
      });
    }
    if (!this.isPumpRunning && this.flowRate > 0.2) {
      alerts.push({
        id: 'alert-2',
        type: 'LEAKAGE',
        severity: 'WARNING',
        message: 'Pump is OFF but positive water flow is detected on line. Check for gravity backflow or manifold leakage.',
        timestamp: 'Just now'
      });
    }
    if (this.tankLevel < 20 && this.isPumpRunning) {
      alerts.push({
        id: 'alert-3',
        type: 'LOW_WATER',
        severity: 'CRITICAL',
        message: 'Water tank level critically low (< 20%). Risk of DC pump dry-running cavitation.',
        timestamp: 'Just now'
      });
    }
    return alerts;
  }
}

export const iotService = new IoTService();
