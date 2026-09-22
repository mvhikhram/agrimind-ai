import React, { useState } from 'react';
import { 
  Droplets, 
  Power, 
  Play, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Wifi, 
  Activity,
  History,
  Info
} from 'lucide-react';
import { Farm, Zone, SensorData, IrrigationEvent } from '../types';
import { iotService } from '../services/iotService';
import { dataService } from '../services/dataService';

interface SmartIrrigationProps {
  farm: Farm;
  zones: Zone[];
  telemetry: SensorData;
}

export const SmartIrrigation: React.FC<SmartIrrigationProps> = ({
  farm,
  zones,
  telemetry
}) => {
  const [irrigationMode, setIrrigationMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[1]?.id || zones[0]?.id || '');
  const [confirmModalZone, setConfirmModalZone] = useState<Zone | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const historyEvents = dataService.getIrrigationEvents(farm.id);
  const deviceStatus = iotService.getDeviceStatus();

  const handleTriggerStart = (zone: Zone) => {
    setConfirmModalZone(zone);
  };

  const confirmAndStartPump = () => {
    if (!confirmModalZone) return;
    const res = iotService.startIrrigation(confirmModalZone.id);
    setStatusMessage(res.message);
    setConfirmModalZone(null);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleStopPump = (zoneId: string) => {
    iotService.stopIrrigation(zoneId);
    setStatusMessage('Pump relay disengaged. Pump powered down.');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
            <Droplets className="w-6 h-6 text-sky-400" />
            <span>Smart Sequential Irrigation Command Center</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Closed-loop soil moisture regulation using single YF-S201 inline flow telemetry & multi-channel relay actuators.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-obsidian-850 p-1.5 rounded-2xl border border-farm-500/20">
          <button
            onClick={() => setIrrigationMode('AUTO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              irrigationMode === 'AUTO' 
                ? 'bg-farm-500 text-obsidian-950 shadow-glow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AUTO PILOT
          </button>
          <button
            onClick={() => setIrrigationMode('MANUAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              irrigationMode === 'MANUAL' 
                ? 'bg-amber-500 text-obsidian-950 shadow-glow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MANUAL OVERRIDE
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {statusMessage && (
        <div className="p-4 bg-farm-900/60 border border-farm-500/40 rounded-2xl text-xs font-bold text-farm-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-farm-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Hardware Constraint & Single Flow Sensor Notice */}
      <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-sky-200">Prototype Hardware Model: Single YF-S201 Flow Telemetry</strong>
          <p className="text-slate-300 mt-0.5">
            Sequential irrigation with single YF-S201 flow telemetry. The platform operates 3 × 6–9V DC mini water pumps sequentially through relay channels so one flow sensor accurately logs individual zone volumes (1.7 L/min nominal).
          </p>
        </div>
      </div>

      {/* Active Zones Grid with Live Pump Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {zones.map((zone) => {
          const isActivelyIrrigating = telemetry.pump_running && telemetry.active_zone_id === zone.id;
          const isDry = zone.current_moisture < zone.target_moisture - 5;
          const pumpNum = zone.pump_number || zone.zone_number;
          const isPhysical = pumpNum <= 3;

          return (
            <div
              key={zone.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isActivelyIrrigating
                  ? 'bg-sky-950/40 border-sky-400 shadow-glow-sm animate-pulse'
                  : isDry
                  ? 'bg-obsidian-850 border-amber-500/40'
                  : 'bg-obsidian-850/80 border-farm-500/15'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase text-farm-400 tracking-wider">
                        ZONE #{zone.zone_number}
                      </span>
                      {zone.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          zone.priority === 'High'
                            ? 'bg-rose-500/20 text-rose-300'
                            : zone.priority === 'Medium'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {zone.priority}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base text-white">{zone.name}</h3>
                    <span className="text-xs text-slate-400">{zone.crop_name} &bull; {zone.area_acres} ac</span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                    isActivelyIrrigating 
                      ? 'bg-sky-500 text-obsidian-950 border-sky-400 font-black' 
                      : isDry 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-farm-500/20 text-farm-300 border-farm-500/30'
                  }`}>
                    {isActivelyIrrigating ? 'IRRIGATING' : isDry ? 'IRRIGATION REQUIRED' : 'NORMAL'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-2 text-xs py-3 border-y border-slate-700/50">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">Soil Moisture:</span>
                    <span className="font-mono font-bold text-base text-white">
                      {zone.current_moisture}% 
                      <span className="text-xs text-slate-400 font-normal"> / Target: {zone.target_moisture}%</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pump Channel:</span>
                    <span className="font-mono text-slate-200 font-bold">
                      Pump #{pumpNum} <span className={isPhysical ? 'text-farm-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {isPhysical ? '(Physical)' : '(Logical)'}
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flow Rate:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {isActivelyIrrigating ? `${telemetry.flow_rate.toFixed(1)} L/min` : '0.0 L/min'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mode:</span>
                    <span className="font-semibold text-slate-300">{zone.irrigation_mode || irrigationMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Irrigation:</span>
                    <span className="text-slate-300">{zone.last_irrigation || 'Today, 06:30 AM'}</span>
                  </div>
                </div>

                {!isPhysical && (
                  <p className="text-[10px] text-amber-300/80 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 mt-2.5">
                    Logical scheduler channel. Cycles sequentially through prototype relays.
                  </p>
                )}
              </div>

              {/* Pump Toggle Button */}
              <div className="mt-4">
                {isActivelyIrrigating ? (
                  <button
                    onClick={() => handleStopPump(zone.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow-glow-sm transition-all"
                  >
                    <Power className="w-4 h-4" />
                    <span>STOP PUMP #{pumpNum}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleTriggerStart(zone)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-xs shadow-glow-sm transition-all"
                  >
                    <Play className="w-4 h-4 fill-obsidian-950" />
                    <span>START PUMP #{pumpNum} ({irrigationMode})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* IoT Hardware Status Bar */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <h3 className="font-display font-bold text-base text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-farm-400" />
          <span>Physical IoT Device Telemetry Bus</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Main MCU Controller</span>
            <strong className="text-white text-sm mt-1 block">STM32F410RB Nucleo</strong>
            <span className="text-farm-400 font-bold text-[11px] mt-1 inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-farm-400"></span> ONLINE
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">IoT Gateway Transceiver</span>
            <strong className="text-white text-sm mt-1 block">ESP32 2.4GHz Wi-Fi</strong>
            <span className="text-farm-400 font-bold text-[11px] mt-1 inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-farm-400"></span> ONLINE
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Sensors Connected</span>
            <strong className="text-white text-sm mt-1 block">6 Active Probes</strong>
            <span className="text-slate-400 text-[11px] mt-1 block">2 Moisture, Flow, Level, DHT22, LDR</span>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Operating Mode</span>
            <strong className="text-farm-300 text-sm mt-1 block">DEMO SIMULATION</strong>
            <span className="text-slate-400 text-[11px] mt-1 block">Ready for UART Bridge</span>
          </div>
        </div>
      </div>

      {/* Irrigation History Table */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-farm-400" />
              <span>Irrigation Log & Volumetric Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-400">Historical records of automated and manual watering sessions.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Logged to Supabase</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-farm-500/15 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Zone</th>
                <th className="pb-3 font-semibold">Mode</th>
                <th className="pb-3 font-semibold">Duration</th>
                <th className="pb-3 font-semibold">Water Used</th>
                <th className="pb-3 font-semibold">Moisture Before / After</th>
                <th className="pb-3 font-semibold text-right">Avg Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {historyEvents.map((e) => (
                <tr key={e.id} className="hover:bg-farm-900/10">
                  <td className="py-3 font-medium text-slate-300">
                    {new Date(e.start_time).toLocaleDateString()} {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 font-bold text-white">{e.zone_name}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      e.mode === 'AUTO' ? 'bg-farm-500/20 text-farm-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {e.mode}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300">{e.duration_minutes} Mins</td>
                  <td className="py-3 font-mono font-bold text-sky-400">{e.water_used_liters} Liters</td>
                  <td className="py-3 text-slate-300">
                    <span className="text-rose-400">{e.starting_moisture}%</span> → <span className="text-farm-400">{e.ending_moisture}%</span>
                  </td>
                  <td className="py-3 font-mono text-slate-300 text-right">{e.avg_flow_rate} L/min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-obsidian-900 border border-farm-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-display font-bold text-lg text-white">Confirm Pump Activation</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              You are about to manually activate <strong>DC Pump #{confirmModalZone.zone_number}</strong> for <strong>{confirmModalZone.name}</strong>. 
              The shared YF-S201 flow meter will monitor this line exclusively until target moisture is replenished.
            </p>
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setConfirmModalZone(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndStartPump}
                className="px-5 py-2 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black shadow-glow-sm"
              >
                Confirm & Engage Relay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
