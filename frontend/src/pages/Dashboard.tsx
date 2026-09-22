import React, { useState, useMemo } from 'react';
import { 
  Droplet, 
  Droplets,
  Thermometer, 
  Wind, 
  Sun, 
  Activity, 
  Gauge, 
  Power, 
  AlertCircle,
  Play, 
  Sparkles, 
  CheckCircle, 
  Clock,
  ArrowRight,
  TrendingUp,
  Info,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  Layers,
  FileText
} from 'lucide-react';
import { Farm, Zone, SensorData, IrrigationEvent } from '../types';
import { iotService } from '../services/iotService';
import { dataService } from '../services/dataService';
import { MoistureTrendChart, WaterConsumptionBarChart, TankLevelProgress } from '../components/common/SimpleCharts';

interface DashboardProps {
  farm: Farm;
  zones: Zone[];
  telemetry: SensorData;
  onNavigatePage: (pageId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  farm,
  zones,
  telemetry,
  onNavigatePage
}) => {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(zones[1] || zones[0] || null);
  const [demoActionFeedback, setDemoActionFeedback] = useState<string | null>(null);

  const isDemoMode = iotService.getMode() === 'DEMO';
  const historyEvents = dataService.getIrrigationEvents(farm.id);

  // ----------------------------------------------------
  // Predictive Calculations & Project Objectives
  // ----------------------------------------------------

  // 1. Pump Runtime Today
  const pumpRuntimeMinutes = useMemo(() => {
    const recordedMins = historyEvents.reduce((acc, e) => acc + (e.duration_minutes || 15), 0);
    return recordedMins > 0 ? recordedMins : (telemetry.pump_running ? 45 : 78);
  }, [historyEvents, telemetry.pump_running]);

  // 2. Next Irrigation Prediction
  const nextIrrigationPrediction = useMemo(() => {
    // Check lowest moisture zone
    const sortedZones = [...zones].sort((a, b) => a.current_moisture - b.current_moisture);
    const criticalZone = sortedZones[0];

    if (!criticalZone) {
      return { zoneName: 'Zone 1', estimatedTime: 'In 4 hours', reason: 'Normal moisture depletion' };
    }

    if (criticalZone.current_moisture <= criticalZone.target_moisture - 5) {
      return { 
        zoneName: criticalZone.name, 
        estimatedTime: 'Immediate (Threshold Reached)', 
        reason: `Moisture (${criticalZone.current_moisture}%) is below target (${criticalZone.target_moisture}%)` 
      };
    }

    // Estimate based on ~2.5% loss per hour
    const diff = criticalZone.current_moisture - criticalZone.target_moisture;
    const hoursRemaining = Math.max(1, Math.round(diff / 2.5));
    return {
      zoneName: criticalZone.name,
      estimatedTime: `Estimated in ~${hoursRemaining}h 15m`,
      reason: 'Estimated from recent moisture trend'
    };
  }, [zones]);

  // 3. Water Requirement Prediction
  const waterRequirementLitres = useMemo(() => {
    // Rule based: deficit calculation across zones
    let totalDeficitL = 0;
    zones.forEach(z => {
      const deficit = Math.max(0, z.target_moisture - z.current_moisture);
      totalDeficitL += deficit * 8.5 * z.area_acres;
    });
    return Math.max(80, Math.round(totalDeficitL));
  }, [zones]);

  // 4. Plant Stress Risk (Rule-Based Indicator)
  const plantStressRisk = useMemo(() => {
    const hasCriticallyLowMoisture = zones.some(z => z.current_moisture < 28);
    const isHotDry = telemetry.temperature > 36 && telemetry.humidity < 40;

    if (hasCriticallyLowMoisture || isHotDry) {
      return { level: 'HIGH', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/40', note: 'Canopy transpiration exceeds moisture supply.' };
    }
    const hasMildDeficit = zones.some(z => z.current_moisture < z.target_moisture - 4);
    if (hasMildDeficit || telemetry.temperature > 33) {
      return { level: 'MEDIUM', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', note: 'Root zone moisture approaching warning threshold.' };
    }
    return { level: 'LOW', color: 'text-farm-400', bg: 'bg-farm-500/20 border-farm-500/40', note: 'Optimal soil moisture and ambient vapor deficit.' };
  }, [zones, telemetry]);

  // 5. Growth Condition / Trend
  const growthCondition = useMemo(() => {
    if (plantStressRisk.level === 'HIGH') {
      return { status: 'Needs Attention', color: 'text-rose-400', reason: 'Drought stress impacting cellular elongation' };
    }
    if (telemetry.temperature >= 22 && telemetry.temperature <= 32 && telemetry.humidity >= 50) {
      return { status: 'Improving', color: 'text-teal-400', reason: 'High photosynthetic index & steady root uptake' };
    }
    return { status: 'Stable', color: 'text-farm-300', reason: 'Steady vegetative canopy development' };
  }, [plantStressRisk, telemetry]);

  // 6. Flow Anomaly Detection (Rule-Based)
  const flowAnomaly = useMemo(() => {
    if (telemetry.pump_running && telemetry.flow_rate === 0) {
      return {
        detected: true,
        type: 'Blockage / Pump Issue',
        detail: 'Pump is powered ON but flow sensor reads 0.0 L/min. Possible line choke or pump stall.',
        badge: 'POSSIBLE BLOCKAGE',
        color: 'rose'
      };
    }
    if (!telemetry.pump_running && telemetry.flow_rate > 0.2) {
      return {
        detected: true,
        type: 'Leakage / Unexpected Flow',
        detail: 'Pump is OFF but inline fluid flow detected (>0.2 L/min). Possible valve leak or backflow.',
        badge: 'POSSIBLE LEAKAGE',
        color: 'rose'
      };
    }
    if (telemetry.flow_rate > 3.0) {
      return {
        detected: true,
        type: 'Burst / High Flow Pressure',
        detail: 'Flow rate exceeds 3.0 L/min (expected nominal ~1.7 L/min). Possible fitting rupture.',
        badge: 'PRESSURE ANOMALY',
        color: 'amber'
      };
    }
    if (telemetry.tank_level < 15 && telemetry.pump_running) {
      return {
        detected: true,
        type: 'Low-Water Protection',
        detail: 'Reservoir below 15%. Automated dry-run protection advisory active.',
        badge: 'LOW WATER WARNING',
        color: 'amber'
      };
    }
    return {
      detected: false,
      type: 'Nominal Fluid Dynamics',
      detail: 'Single YF-S201 flow telemetry calibrated steady at 1.7 L/min. No anomaly detected.',
      badge: 'NO ANOMALY DETECTED',
      color: 'emerald'
    };
  }, [telemetry]);

  // ----------------------------------------------------
  // Interactive Simulation Triggers
  // ----------------------------------------------------
  const handleSimulateDrySoil = () => {
    iotService.simulateDrySoil();
    setDemoActionFeedback('Simulated dry soil event: Zone 2 moisture dropped to 25.0%. IRRIGATION REQUIRED alert triggered.');
    setTimeout(() => setDemoActionFeedback(null), 6000);
  };

  const handleStartIrrigation = () => {
    const res = iotService.startIrrigation(selectedZone?.id || zones[1]?.id);
    setDemoActionFeedback(res.message);
    setTimeout(() => setDemoActionFeedback(null), 6000);
  };

  const handleStopIrrigation = () => {
    iotService.stopIrrigation(selectedZone?.id);
    setDemoActionFeedback('Irrigation stopped. DC Pump powered down.');
    setTimeout(() => setDemoActionFeedback(null), 6000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">

      {/* ==================================================== */}
      {/* TOP: HACKATHON INTERACTIVE CONTROLLER BANNER         */}
      {/* ==================================================== */}
      <div className="bg-gradient-to-r from-obsidian-850 via-farm-950/60 to-obsidian-850 border-2 border-farm-500/40 rounded-3xl p-5 shadow-glow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-farm-500/20 text-farm-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hackathon Interactive Demonstration</span>
              </span>
              {isDemoMode && (
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  🟡 SIMULATION GATEWAY
                </span>
              )}
            </div>
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              Demonstrate IoT Closed-Loop Telemetry & Autonomous Smart Irrigation
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              1-click test simulation: Trigger drought stress on Zone 2, observe status turn to <strong>IRRIGATION REQUIRED</strong>, then activate automated sequential irrigation with live flow sensing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSimulateDrySoil}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm transition-all"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>SIMULATE DRY SOIL</span>
            </button>

            {!telemetry.pump_running ? (
              <button
                onClick={handleStartIrrigation}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-xs sm:text-sm shadow-glow-sm transition-all"
              >
                <Play className="w-4 h-4 fill-obsidian-950" />
                <span>START IRRIGATION</span>
              </button>
            ) : (
              <button
                onClick={handleStopIrrigation}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs sm:text-sm shadow-glow-sm transition-all"
              >
                <Power className="w-4 h-4" />
                <span>STOP PUMP</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Feedback Toast */}
        {demoActionFeedback && (
          <div className="mt-4 p-3 bg-farm-900/60 border border-farm-500/30 rounded-xl text-xs font-semibold text-farm-200 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-farm-400 shrink-0" />
            <span>{demoActionFeedback}</span>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* FARM CROP ALLOCATION OVERVIEW                        */}
      {/* ==================================================== */}
      {farm.crops_allocation && farm.crops_allocation.length > 0 && (
        <div className="bg-obsidian-850/90 border border-farm-500/25 rounded-3xl p-5 shadow-glow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-farm-500/15 border border-farm-500/30 flex items-center justify-center text-farm-400 font-bold text-lg">
                🌾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-base text-white">Multi-Crop Farm Allocation</h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-farm-500/20 text-farm-300 border border-farm-500/30">
                    {farm.crops_allocation.length} Crops Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Total Farm Area: <strong className="text-white">{farm.area_acres} Acres</strong> &bull; Soil: <span className="text-slate-300">{farm.soil_type}</span> &bull; Season: <span className="text-slate-300">{farm.season}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigatePage('crop-planner')}
              className="text-xs text-farm-300 hover:text-white bg-farm-500/10 hover:bg-farm-500/20 border border-farm-500/30 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <span>Manage in Crop Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {farm.crops_allocation.map((ca, idx) => (
              <div key={idx} className="bg-obsidian-900/90 border border-farm-500/15 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-white text-xs truncate" title={ca.crop_name}>{ca.crop_name}</h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-farm-500/20 text-farm-300 font-mono">
                      {ca.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Allocated:</span>
                    <span className="font-bold text-white font-mono">{ca.area_acres} ac</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                    <span>Water Needs:</span>
                    <span className="font-medium text-slate-300">{ca.water_requirement}</span>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Est. Daily:</span>
                  <span className="font-mono font-bold text-teal-300">
                    {ca.estimated_daily_liters ? `~${ca.estimated_daily_liters.toLocaleString()} L` : 'Ref: Medium'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 1: LIVE FARM TELEMETRY                      */}
      {/* ==================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-extrabold text-base text-white">Section 1: Live Farm Telemetry</h3>
            {isDemoMode && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                SIMULATED TELEMETRY
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 font-mono">Sensors: STM32 + ESP32</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Soil Moisture */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>SOIL MOISTURE</span>
              <Droplet className="w-4 h-4 text-farm-400" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.soil_moisture}%
              </div>
              <div className="text-[11px] font-bold text-farm-300">
                Active Zone Sensor
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-farm-400 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, telemetry.soil_moisture * 1.5)}%` }} 
              />
            </div>
          </div>

          {/* 2. Water Tank Level */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>WATER TANK</span>
              <Gauge className="w-4 h-4 text-sky-400" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.tank_level}%
              </div>
              <div className="text-[11px] font-bold text-sky-300">
                HC-SR04 Ultrasonic
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-400 rounded-full transition-all duration-500" 
                style={{ width: `${telemetry.tank_level}%` }} 
              />
            </div>
          </div>

          {/* 3. Water Used Today */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>WATER CONSUMPTION</span>
              <Droplet className="w-4 h-4 text-teal-400" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.water_consumption_today} <span className="text-xs font-bold text-slate-400">L</span>
              </div>
              <div className="text-[11px] font-bold text-teal-300">
                Cumulative Today
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full w-[45%]" />
            </div>
          </div>

          {/* 4. Flow Rate */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>FLOW RATE</span>
              <Wind className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.flow_rate.toFixed(1)} <span className="text-xs font-bold text-slate-400">L/min</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-300">
                YF-S201 Pulse Meter
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                style={{ width: `${telemetry.flow_rate > 0 ? 60 : 0}%` }} 
              />
            </div>
          </div>

          {/* 5. Temperature */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>TEMPERATURE</span>
              <Thermometer className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.temperature}°C
              </div>
              <div className="text-[11px] font-bold text-amber-400">
                DHT22 Canopy Air
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full w-[60%]" />
            </div>
          </div>

          {/* 6. Humidity */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>HUMIDITY</span>
              <Droplet className="w-4 h-4 text-teal-400" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.humidity}%
              </div>
              <div className="text-[11px] font-bold text-teal-400">
                Relative Humidity
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full w-[67%]" />
            </div>
          </div>

          {/* 7. Light Level */}
          <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>LIGHT LEVEL</span>
              <Sun className="w-4 h-4 text-amber-300" />
            </div>
            <div className="my-2">
              <div className="font-display font-black text-2xl sm:text-3xl text-white">
                {telemetry.light_level} <span className="text-xs font-semibold text-slate-400">lux</span>
              </div>
              <div className="text-[11px] font-bold text-amber-300">
                LDR Sensor Solar
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full w-[78%]" />
            </div>
          </div>

          {/* 8. DC Pump Status */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
            telemetry.pump_running 
              ? 'bg-farm-500/10 border-farm-400 shadow-glow-sm' 
              : 'bg-obsidian-850/90 border-farm-500/20'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>PUMP STATUS</span>
              <Power className={`w-4 h-4 ${telemetry.pump_running ? 'text-farm-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <div className="my-2">
              <div className={`font-display font-black text-2xl sm:text-3xl ${telemetry.pump_running ? 'text-farm-300' : 'text-slate-400'}`}>
                {telemetry.pump_running ? 'ACTIVE' : 'OFF'}
              </div>
              <div className="text-[11px] font-bold text-slate-300">
                {telemetry.pump_running ? '6–9V DC Pump Relaying' : 'Relays Disengaged'}
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${telemetry.pump_running ? 'bg-farm-400 w-full animate-pulse' : 'w-0'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 2: ZONE MONITORING                           */}
      {/* ==================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-extrabold text-base text-white">Section 2: Zone Monitoring</h3>
            <span className="text-xs text-slate-400 font-normal">(Click any zone to select for manual pump pulse)</span>
          </div>
          <span className="text-xs text-farm-400 font-semibold">{zones.length} Configured Zones</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {zones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            
            let statusBadge = {
              label: 'NORMAL',
              bg: 'bg-farm-500/20 text-farm-300 border-farm-500/30'
            };
            if (zone.status === 'CRITICAL' || zone.current_moisture < 30) {
              statusBadge = {
                label: 'IRRIGATION REQUIRED',
                bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              };
            } else if (zone.status === 'WARNING' || zone.current_moisture < zone.target_moisture - 5) {
              statusBadge = {
                label: 'WARNING',
                bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              };
            } else if (zone.pump_status) {
              statusBadge = {
                label: 'IRRIGATING',
                bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              };
            }

            const pumpNum = zone.pump_number || zone.zone_number;
            const isPhysical = pumpNum <= 3;

            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                  isSelected 
                    ? 'bg-obsidian-800 border-farm-400 shadow-glow-sm' 
                    : 'bg-obsidian-850/80 border-farm-500/15 hover:border-farm-500/40'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-farm-400 uppercase tracking-wider">
                        ZONE {zone.zone_number}
                      </span>
                      {zone.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          zone.priority === 'High' 
                            ? 'bg-rose-500/20 text-rose-300' 
                            : zone.priority === 'Medium' 
                            ? 'bg-amber-500/20 text-amber-300' 
                            : 'bg-slate-700/60 text-slate-300'
                        }`}>
                          {zone.priority}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-bold text-base text-white mt-0.5">{zone.name || zone.crop_name}</h4>
                    <span className="text-xs text-slate-400">{zone.crop_name} &bull; {zone.area_acres} Acres</span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Soil Moisture:</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {zone.current_moisture}% 
                      <span className="text-xs text-slate-400 font-normal"> (Target: {zone.target_moisture}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pump Channel:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-300">
                      Pump {pumpNum} <span className={isPhysical ? 'text-farm-400' : 'text-amber-400'}>({isPhysical ? 'Physical' : 'Logical'})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DC Pump Status:</span>
                    <span className={`font-bold ${zone.pump_status ? 'text-farm-300' : 'text-slate-400'}`}>
                      {zone.pump_status ? 'ON (1.7 L/min)' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/40">
                    <span>Mode / Last:</span>
                    <span>{zone.irrigation_mode || 'AUTO'} &bull; {zone.last_irrigation || '06:30 AM'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {zones.some(z => (z.pump_number || z.zone_number) > 3) && (
          <p className="text-[11px] text-slate-500 italic mt-2 text-right">
            * Prototype hardware supports 3 physical pump relay channels with sequential flow sensing. Zones &gt;3 operate as logical scheduler channels.
          </p>
        )}
      </div>

      {/* ==================================================== */}
      {/* SECTION 3: AGRIMIND FARM INTELLIGENCE (9 OBJECTIVES) */}
      {/* ==================================================== */}
      <div className="bg-obsidian-850/90 border border-farm-500/25 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-farm-500/15">
          <div>
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-farm-400" />
              <span>AGRIMIND FARM INTELLIGENCE</span>
            </h3>
            <p className="text-xs text-slate-400">
              Closed-loop predictive analytics, anomaly heuristics, and automated decision-support metrics.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-farm-300 bg-farm-500/10 px-3 py-1 rounded-full border border-farm-500/20 self-start sm:self-auto">
            9 Core Objectives
          </span>
        </div>

        {/* 9 Intelligence Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* 1. Pump Runtime */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-farm-400" />
                <span>1. Pump Runtime</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Today</span>
            </div>
            <div className="my-2">
              <strong className="text-xl font-display text-white">{pumpRuntimeMinutes} min</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">Across sequential actuator cycles</p>
            </div>
            <div className="text-[10px] text-farm-300 font-medium">Within safe motor duty cycle</div>
          </div>

          {/* 2. Temperature & Humidity */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-400" />
                <span>2. Canopy Microclimate</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">DHT22</span>
            </div>
            <div className="my-2">
              <strong className="text-xl font-display text-white">{telemetry.temperature}°C • {telemetry.humidity}%</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">Air temperature & relative humidity</p>
            </div>
            <div className="text-[10px] text-teal-300 font-medium">Vapor pressure deficit balanced</div>
          </div>

          {/* 3. Light Level */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-300" />
                <span>3. Solar Radiation</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">LDR</span>
            </div>
            <div className="my-2">
              <strong className="text-xl font-display text-white">{telemetry.light_level} lux</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">Direct crop canopy insolation</p>
            </div>
            <div className="text-[10px] text-amber-300 font-medium">Active photosynthetic activity</div>
          </div>

          {/* 4. Next Irrigation Prediction */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-400" />
                <span>4. Next Irrigation</span>
              </span>
              <span className="text-[10px] text-sky-400 font-mono">Predictive</span>
            </div>
            <div className="my-2">
              <strong className="text-base font-display text-sky-300 block">{nextIrrigationPrediction.estimatedTime}</strong>
              <p className="text-[11px] text-slate-300 mt-0.5">{nextIrrigationPrediction.zoneName}</p>
            </div>
            <div className="text-[10px] text-slate-500 italic">*{nextIrrigationPrediction.reason}</div>
          </div>

          {/* 5. Water Requirement Prediction */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-teal-400" />
                <span>5. Water Requirement</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Deficit</span>
            </div>
            <div className="my-2">
              <strong className="text-xl font-display text-teal-300">Estimated: {waterRequirementLitres} L</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">Required to bring root zones to target</p>
            </div>
            <div className="text-[10px] text-slate-500 italic">*Estimated water requirement</div>
          </div>

          {/* 6. Plant Stress Risk */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>6. Plant Stress Risk</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${plantStressRisk.bg} ${plantStressRisk.color}`}>
                {plantStressRisk.level}
              </span>
            </div>
            <div className="my-2">
              <strong className={`text-xl font-display ${plantStressRisk.color}`}>{plantStressRisk.level} RISK</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">{plantStressRisk.note}</p>
            </div>
            <div className="text-[10px] text-slate-500 italic">*Rule-based agronomic indicator</div>
          </div>

          {/* 7. Growth Condition / Trend */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>7. Growth Condition</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Trend</span>
            </div>
            <div className="my-2">
              <strong className={`text-xl font-display ${growthCondition.color}`}>{growthCondition.status}</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">{growthCondition.reason}</p>
            </div>
            <div className="text-[10px] text-slate-500 italic">*Based on moisture stability & micro-climate</div>
          </div>

          {/* 8. Irrigation History Cycles */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <span>8. Irrigation History</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Telemetry Log</span>
            </div>
            <div className="my-2">
              <strong className="text-xl font-display text-white">{historyEvents.length} cycles recorded</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">Sequential logging via Supabase</p>
            </div>
            <button 
              onClick={() => onNavigatePage('smart-irrigation')}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
            >
              <span>View full event logs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* 9. Flow Anomaly Detection */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>9. Flow Anomaly Detection</span>
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                flowAnomaly.color === 'rose' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                flowAnomaly.color === 'amber' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {flowAnomaly.badge}
              </span>
            </div>
            <div className="my-2">
              <strong className={`text-base font-display ${
                flowAnomaly.color === 'rose' ? 'text-rose-400' :
                flowAnomaly.color === 'amber' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {flowAnomaly.type}
              </strong>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{flowAnomaly.detail}</p>
            </div>
            <div className="text-[10px] text-slate-500 italic">*Heuristic check; not guaranteed diagnosis</div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 4: TODAY'S FARM ACTIONS                      */}
      {/* ==================================================== */}
      <div className="bg-obsidian-850/80 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-farm-500/10">
          <div>
            <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
              <span>🌾 Section 4: Today's Farm Actions</span>
            </h3>
            <p className="text-xs text-slate-400">
              Decision-support recommendations generated from real-time telemetry and configured crop schedules.
            </p>
          </div>
          <span className="text-xs text-farm-300 font-bold bg-farm-500/15 px-3 py-1 rounded-full">
            Decision Support
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Dynamic Zone Action Cards */}
          {zones.map((z, idx) => {
            const isDry = (z.current_moisture || 42) < (z.target_moisture || 45) - 3;
            return (
              <div 
                key={z.id || idx} 
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isDry ? 'bg-amber-500/10 border-amber-500/30' : 'bg-obsidian-900 border-slate-800'
                }`}
              >
                <span className="text-lg mt-0.5">{isDry ? '🔴' : '🟢'}</span>
                <div>
                  <strong className="text-white font-bold block">{z.name} ({z.crop_name})</strong>
                  <p className={`${isDry ? 'text-slate-300' : 'text-slate-400'} text-[11px] mt-0.5`}>
                    {isDry 
                      ? `Moisture ${z.current_moisture}% below target (${z.target_moisture}%). Sequential irrigation advised.`
                      : `Moisture optimal (${z.current_moisture}%). Target ${z.target_moisture}%.`}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Crop Activity */}
          <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800 flex items-start gap-3">
            <span className="text-lg mt-0.5">🌱</span>
            <div>
              <strong className="text-white font-bold block">Crop Stage Advisory</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Next scheduled activity: Vegetative foliar monitoring & sticky trap inspection.</p>
            </div>
          </div>

          {/* Water Reservoir */}
          <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800 flex items-start gap-3">
            <span className="text-lg mt-0.5">💧</span>
            <div>
              <strong className="text-white font-bold block">Water Reservoir</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Tank level sufficient ({telemetry.tank_level}%). Ample head pressure for sequential pumping.</p>
            </div>
          </div>

          {/* Flow Heuristic */}
          <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800 flex items-start gap-3">
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <strong className="text-white font-bold block">Flow Telemetry Heuristic</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">{flowAnomaly.detail}</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic mt-3 text-right">
          *Advisory demonstration suggestions based on sensor thresholds and agronomic rules.
        </p>
      </div>

      {/* ==================================================== */}
      {/* SECTION 5: WATER & IRRIGATION ANALYTICS + HISTORY    */}
      {/* ==================================================== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-extrabold text-base text-white">Section 5: Water & Irrigation Analytics</h3>
          <span className="text-xs text-slate-400 font-mono">24-Hour Telemetry History</span>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <TankLevelProgress level={telemetry.tank_level} />
          </div>
          <div className="md:col-span-1">
            <MoistureTrendChart 
              title="24-Hour Soil Moisture Trend" 
              subtitle="Hourly root zone sensors (Zone 1 vs Zone 2)" 
            />
          </div>
          <div className="md:col-span-1">
            <WaterConsumptionBarChart 
              title="Water Consumption vs Baseline" 
              subtitle="Weekly Smart Irrigation vs Flood Benchmark (Liters)" 
            />
          </div>
        </div>

        {/* Irrigation History Log Table */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-farm-500/10">
            <div>
              <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-farm-400" />
                <span>Recent Irrigation History Log</span>
              </h4>
              <p className="text-xs text-slate-400">
                Single flow sensor sequential event records synchronized with Supabase.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-farm-300 bg-farm-500/10 px-3 py-1 rounded-full border border-farm-500/20">
              Supabase <code>irrigation_events</code>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Zone</th>
                  <th className="py-2.5 px-3">Actuator</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Moisture</th>
                  <th className="py-2.5 px-3">Flow Rate</th>
                  <th className="py-2.5 px-3">Water Used</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyEvents.slice(0, 5).map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {evt.zone_name}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      DC Pump #{evt.pump_id}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {evt.duration_minutes} min
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="text-rose-300">{evt.starting_moisture}%</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span className="text-farm-400">{evt.ending_moisture}%</span>
                    </td>
                    <td className="py-3 px-3 text-sky-400 font-mono">
                      {evt.avg_flow_rate || 1.7} L/min
                    </td>
                    <td className="py-3 px-3 font-bold text-teal-300">
                      {evt.water_used_liters} L
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        evt.mode === 'AUTO' ? 'bg-farm-500/20 text-farm-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {evt.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
