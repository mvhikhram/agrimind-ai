import React from 'react';

interface ChartProps {
  title: string;
  subtitle?: string;
}

// 1. Soil Moisture Line Chart (SVG)
export const MoistureTrendChart: React.FC<ChartProps> = ({ title, subtitle }) => {
  const points = [
    { time: '00:00', z1: 49, z2: 43 },
    { time: '04:00', z1: 48, z2: 41 },
    { time: '08:00', z1: 46, z2: 38 },
    { time: '12:00', z1: 44, z2: 32 },
    { time: '16:00', z1: 42, z2: 27 },
    { time: '20:00', z1: 48, z2: 42 },
  ];

  const width = 450;
  const height = 180;
  const padding = 30;

  // Scale points to SVG path
  const scaleX = (index: number) => padding + (index * (width - 2 * padding)) / (points.length - 1);
  const scaleY = (val: number) => height - padding - ((val - 20) / (60 - 20)) * (height - 2 * padding);

  const pathZ1 = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.z1)}`).join(' ');
  const pathZ2 = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.z2)}`).join(' ');

  return (
    <div className="bg-obsidian-850/80 border border-farm-500/20 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-display font-bold text-sm text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-farm-400">
            <span className="w-2.5 h-1 bg-farm-400 rounded-full"></span> Zone 1
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-1 bg-amber-400 rounded-full"></span> Zone 2
          </span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
          {/* Horizontal gridlines */}
          {[30, 40, 50].map((level) => (
            <g key={level}>
              <line 
                x1={padding} 
                y1={scaleY(level)} 
                x2={width - padding} 
                y2={scaleY(level)} 
                stroke="#1e293b" 
                strokeDasharray="4 4" 
              />
              <text x={padding - 8} y={scaleY(level) + 3} fill="#64748b" fontSize="9" textAnchor="end">
                {level}%
              </text>
            </g>
          ))}

          {/* Paths */}
          <path d={pathZ1} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
          <path d={pathZ2} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={scaleX(i)} cy={scaleY(p.z1)} r="3.5" fill="#22c55e" />
              <circle cx={scaleX(i)} cy={scaleY(p.z2)} r="3.5" fill="#f59e0b" />
              <text x={scaleX(i)} y={height - 8} fill="#94a3b8" fontSize="9" textAnchor="middle">
                {p.time}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

// 2. Water Consumption Bar Chart (SVG)
export const WaterConsumptionBarChart: React.FC<ChartProps> = ({ title, subtitle }) => {
  const days = [
    { day: 'Mon', liters: 980, baseline: 1500 },
    { day: 'Tue', liters: 1120, baseline: 1500 },
    { day: 'Wed', liters: 840, baseline: 1500 },
    { day: 'Thu', liters: 1280, baseline: 1500 },
    { day: 'Fri', liters: 950, baseline: 1500 },
    { day: 'Sat', liters: 790, baseline: 1500 },
    { day: 'Sun', liters: 1040, baseline: 1500 },
  ];

  const maxVal = 1600;

  return (
    <div className="bg-obsidian-850/80 border border-farm-500/20 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 bg-sky-400 rounded-sm"></span> Smart Drip
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-0.5 bg-slate-500"></span> Flood Baseline
          </span>
        </div>
      </div>

      <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
        {days.map((d, i) => {
          const heightPct = (d.liters / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
              <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {d.liters}L
              </div>
              <div className="w-full bg-slate-800/80 rounded-t-lg relative flex items-end justify-center overflow-hidden h-28">
                {/* Flood Baseline Marker */}
                <div 
                  className="absolute w-full border-t border-dashed border-slate-500/60 z-10" 
                  style={{ bottom: `${(d.baseline / maxVal) * 100}%` }}
                />
                <div 
                  className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-lg transition-all duration-500"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-400">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. Tank Level Gauge Card
export const TankLevelProgress: React.FC<{ level: number }> = ({ level }) => {
  return (
    <div className="bg-obsidian-850/80 border border-farm-500/20 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display font-bold text-sm text-white">Water Storage Tank</h3>
        <span className="text-xs font-bold text-sky-400">HC-SR04 Sensor</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Cylindrical tank visual */}
        <div className="w-20 h-28 border-2 border-sky-400/40 rounded-xl relative p-1 bg-sky-950/20 overflow-hidden flex flex-col justify-end">
          <div 
            className="w-full bg-gradient-to-t from-sky-600 via-sky-500 to-sky-400 rounded-lg transition-all duration-500"
            style={{ height: `${level}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-display font-black text-lg text-white drop-shadow">
            {level}%
          </div>
        </div>

        <div className="space-y-2 text-xs flex-1">
          <div className="flex justify-between text-slate-400">
            <span>Capacity:</span>
            <span className="font-semibold text-slate-200">5,000 Liters</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Current Volume:</span>
            <span className="font-semibold text-sky-300">~{Math.round(5000 * (level / 100))} Liters</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Cycles Remaining:</span>
            <span className="font-semibold text-farm-300">8 Full Cycles</span>
          </div>
          <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2 text-[11px] text-farm-400">
            <span className="w-2 h-2 rounded-full bg-farm-400"></span>
            <span>Refill Inflow: Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
