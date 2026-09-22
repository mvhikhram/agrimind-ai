import React from 'react';
import { 
  BarChart3, 
  Droplets, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  Percent,
  CheckCircle,
  AlertOctagon,
  Info
} from 'lucide-react';
import { Farm, Zone, SensorData } from '../types';
import { iotService } from '../services/iotService';
import { WaterConsumptionBarChart, MoistureTrendChart } from '../components/common/SimpleCharts';

interface AnalyticsProps {
  farm: Farm;
  zones: Zone[];
  telemetry: SensorData;
}

export const Analytics: React.FC<AnalyticsProps> = ({ farm, zones, telemetry }) => {
  const anomalies = iotService.detectFlowAnomalies();

  // Baseline water calculation
  const baselineWaterLiters = 1600;
  const currentWaterUsed = telemetry.water_consumption_today || 1280;
  const estimatedWaterSavingPct = Math.round(((baselineWaterLiters - currentWaterUsed) / baselineWaterLiters) * 100);

  // Dynamic Average Soil Moisture
  const avgSoilMoisture = zones.length > 0
    ? (zones.reduce((sum, z) => sum + (z.current_moisture || 45), 0) / zones.length).toFixed(1)
    : '46.5';

  const totalFarmAcres = zones.reduce((sum, z) => sum + (z.area_acres || 1), 0) || farm.area_acres || 1;

  // Irrigation effectiveness demo figure
  const moistureGain = 16; // %
  const litersPerCycle = 420;
  const moisturePerLiter = (moistureGain / litersPerCycle).toFixed(3);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-farm-400" />
          <span>Farm Volumetric Analytics & Efficiency Auditing</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Empirical evaluation of water savings, pump runtime distribution, and real-time hydraulic flow anomalies.
        </p>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Estimated Water Saving */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>ESTIMATED WATER SAVING</span>
            <Percent className="w-4 h-4 text-farm-400" />
          </div>
          <div className="my-2">
            <div className="font-display font-black text-2xl sm:text-3xl text-farm-400">
              +{estimatedWaterSavingPct}%
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              vs. Conventional Flood Irrigation
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Configured baseline: 1,600 L / day
          </div>
        </div>

        {/* Total Pump Runtime */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>PUMP RUNTIME TODAY</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-2">
            <div className="font-display font-black text-2xl sm:text-3xl text-white">
              78 <span className="text-sm font-bold text-slate-400">Mins</span>
            </div>
            <div className="text-[11px] text-sky-400 font-medium">
              3 Sequential Cycles Completed
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Single YF-S201 flow telemetry
          </div>
        </div>

        {/* Irrigation Effectiveness */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>IRRIGATION EFFECTIVENESS</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-2">
            <div className="font-display font-black text-2xl sm:text-3xl text-white">
              {moisturePerLiter} <span className="text-xs font-bold text-slate-400">% / L</span>
            </div>
            <div className="text-[11px] text-teal-400 font-medium">
              Moisture improvement per litre
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Project-defined efficiency metric
          </div>
        </div>

        {/* Average Soil Moisture */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>AVG SOIL MOISTURE</span>
            <Droplets className="w-4 h-4 text-farm-400" />
          </div>
          <div className="my-2">
            <div className="font-display font-black text-2xl sm:text-3xl text-white">
              {avgSoilMoisture}%
            </div>
            <div className="text-[11px] text-farm-400 font-medium">
              Weighted across {zones.length} Zones
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Root zone sensor telemetry
          </div>
        </div>
      </div>

      {/* Hydraulic Flow Anomaly Detection Hub */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-farm-500/10">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Real-Time Hydraulic Flow Anomaly Sentinel</span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic heuristic monitoring comparing DC relay state against inline YF-S201 pulses.
            </p>
          </div>
          <span className="text-xs font-mono text-farm-400 bg-farm-500/10 px-3 py-1 rounded-full border border-farm-500/20">
            Rules Active
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {anomalies.length > 0 ? (
            anomalies.map((a) => (
              <div key={a.id} className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-200">{a.type} Detected:</strong>
                  <p className="text-slate-300 mt-0.5">{a.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-2xl bg-farm-950/30 border border-farm-500/20 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-farm-400 shrink-0" />
              <div>
                <strong className="text-farm-200">Hydraulic Line Status: Normal</strong>
                <p className="text-slate-400 mt-0.5">
                  No blockages, cavitation, or uncommanded gravity leaks detected on YF-S201 sensor manifold.
                </p>
              </div>
            </div>
          )}

          {/* Anomaly Rule Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-[11px] text-slate-400">
            <div className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800">
              <span className="font-semibold text-slate-300">Rule 1: Blockage Check</span>
              <p className="mt-0.5">If Pump = ON and Flow = 0 L/min → Possible mainline valve lock.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800">
              <span className="font-semibold text-slate-300">Rule 2: Leakage Check</span>
              <p className="mt-0.5">If Pump = OFF and Flow &gt; 0.2 L/min → Backflow or drip line leak.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800">
              <span className="font-semibold text-slate-300">Rule 3: Low Tank Protection</span>
              <p className="mt-0.5">If Tank &lt; 20% and Pump = ON → Disengage relay to protect impeller.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WaterConsumptionBarChart 
          title="Daily & Weekly Water Consumption (Liters)" 
          subtitle="Smart drip automation vs. traditional flood benchmark" 
        />
        <MoistureTrendChart 
          title="Root Zone Moisture Recovery Curves" 
          subtitle="Moisture retention delta after sequential irrigation events" 
        />
      </div>

      {/* Zone Water Distribution Breakdown */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Zone Water Allocation Distribution (This Week)
            </h3>
            <p className="text-xs text-slate-400">
              Acreage-weighted volumetric water distribution across all {zones.length} configured farm zones.
            </p>
          </div>
          <span className="text-xs font-mono text-farm-300 font-semibold">{totalFarmAcres.toFixed(1)} Total Acres</span>
        </div>

        <div className="space-y-4 text-xs">
          {zones.map((z) => {
            const pct = Math.max(5, Math.round(((z.area_acres || 1) / totalFarmAcres) * 100));
            const estWeeklyLiters = Math.round(1280 * 7 * (pct / 100));
            const pumpNum = z.pump_number || z.zone_number;

            return (
              <div key={z.id} className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between text-slate-300 font-semibold mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-farm-400 font-mono font-bold">Zone {z.zone_number}:</span>
                    <strong className="text-white">{z.name}</strong>
                    <span className="text-slate-400 font-normal">({z.crop_name} &bull; {z.area_acres} ac)</span>
                    {z.priority && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        z.priority === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {z.priority}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-farm-300 font-mono font-bold">{pct}%</span>
                    <span className="text-slate-400 text-[11px] ml-1.5 font-mono">(~{estWeeklyLiters.toLocaleString()} L / wk)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-farm-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
                  <span>Channel: Pump #{pumpNum} {pumpNum > 3 ? '(Logical)' : '(Physical Relay)'}</span>
                  <span>Target Moisture: {z.target_moisture}% &bull; Current: {z.current_moisture}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
