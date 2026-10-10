import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Wifi, 
  Cloud, 
  Radio, 
  Activity, 
  Terminal, 
  Play, 
  Square, 
  Copy, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Send, 
  Code2, 
  Info, 
  Sliders, 
  Check, 
  Droplet, 
  Thermometer, 
  Sun, 
  Gauge,
  Layers
} from 'lucide-react';
import { Esp32LiveStatus, SerialLogEntry } from '../../types';
import { iotService } from '../../services/iotService';
import { webSerialService, WebSerialStatus } from '../../services/webSerialService';
import { isSupabaseConfigured } from '../../lib/supabase';

const AVAILABLE_BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 921600];

export const Esp32ConnectivityPanel: React.FC = () => {
  const [esp32Status, setEsp32Status] = useState<Esp32LiveStatus>(() => iotService.getEsp32Status());
  const [serialStatus, setSerialStatus] = useState<WebSerialStatus>(() => webSerialService.getStatus());
  const [serialLogs, setSerialLogs] = useState<SerialLogEntry[]>(() => webSerialService.getLogs());
  const [baudRate, setBaudRate] = useState<number>(() => webSerialService.getSelectedBaudRate());
  const [customCommand, setCustomCommand] = useState<string>('{"cmd":"STATUS"}');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionNotice, setConnectionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'serial' | 'pinout' | 'protocol'>('diagnostics');

  const logEndRef = useRef<HTMLDivElement>(null);
  const isWebSerialSupported = webSerialService.isSupported();

  useEffect(() => {
    const unsubStatus = iotService.subscribeEsp32Status((status) => {
      setEsp32Status({ ...status });
    });

    const unsubSerial = webSerialService.subscribe((status, logs) => {
      setSerialStatus(status);
      setSerialLogs([...logs]);
    });

    return () => {
      unsubStatus();
      unsubSerial();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialLogs, autoScroll]);

  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setConnectionNotice(null);

    const res = await webSerialService.connect(baudRate);
    setIsConnecting(false);

    if (res.success) {
      setConnectionNotice({ type: 'success', text: res.message });
    } else {
      setConnectionNotice({ type: 'error', text: res.message });
    }
    setTimeout(() => setConnectionNotice(null), 8000);
  };

  const handleDisconnectSerial = async () => {
    await webSerialService.disconnect();
    setConnectionNotice({ type: 'info', text: 'Serial port disconnected.' });
    setTimeout(() => setConnectionNotice(null), 5000);
  };

  const handleSendCommand = async (cmdToSend?: string) => {
    const text = cmdToSend || customCommand;
    if (!text.trim()) return;
    await webSerialService.send(text.trim());
  };

  const handleCopyLogs = async () => {
    const content = webSerialService.copyLogs();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 3000);
    } catch (e) {
      console.error('Failed to copy logs:', e);
    }
  };

  const handleClearLogs = () => {
    webSerialService.clearLogs();
  };

  const handleTimeoutChange = (sec: number) => {
    iotService.setHeartbeatTimeout(sec);
  };

  // Format relative last data time
  const getLastDataAgeText = () => {
    if (!esp32Status.last_heartbeat_epoch) return 'None received';
    const sec = Math.max(0, Math.floor((Date.now() - esp32Status.last_heartbeat_epoch) / 1000));
    if (sec < 5) return 'Just now (< 5s)';
    if (sec < 60) return `${sec} seconds ago`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s ago`;
  };

  const r = esp32Status.latest_readings;
  const isRealIot = esp32Status.mode === 'REAL_IOT';
  const isOnline = esp32Status.hardware_status === 'ONLINE';
  const isStale = esp32Status.hardware_status === 'STALE';
  const isOffline = esp32Status.hardware_status === 'OFFLINE' || esp32Status.hardware_status === 'NO_DATA';

  return (
    <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-5 sm:p-6 shadow-glow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-farm-500/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-farm-500/20 to-sky-500/10 border border-farm-500/30 text-farm-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <span>ESP32 Hardware Controller & Live Diagnostics</span>
            </h3>
            <p className="text-xs text-slate-400">
              Direct ESP32 Wi-Fi telemetry to Supabase, 3x relay actuator status & Web Serial console.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-obsidian-900 border border-slate-800 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'diagnostics' 
                ? 'bg-farm-500 text-obsidian-950 font-black shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pinout')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'pinout' 
                ? 'bg-farm-500 text-obsidian-950 font-black shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GPIO Pinout</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('serial')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'serial' 
                ? 'bg-farm-500 text-obsidian-950 font-black shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>USB Serial</span>
            {serialStatus === 'CONNECTED' && (
              <span className="w-2 h-2 rounded-full bg-farm-400 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('protocol')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'protocol' 
                ? 'bg-farm-500 text-obsidian-950 font-black shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Protocol Specs</span>
          </button>
        </div>
      </div>

      {/* Mode Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800 gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${
            isRealIot
              ? (isOnline ? 'bg-farm-500/20 text-farm-300 border-farm-500/30' : isStale ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30')
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}>
            {isRealIot 
              ? (isOnline ? '🟢 REAL_IOT (ONLINE)' : isStale ? '🟠 REAL_IOT (STALE)' : '🔴 REAL_IOT (OFFLINE)') 
              : '🟡 DEMO SIMULATION'}
          </span>
          <span className="text-slate-400 text-[11px]">
            {isRealIot
              ? 'Reading live sensor_readings and zone pump statuses from Supabase. Zero simulated values.'
              : 'Telemetry is generated by in-browser simulation clock for demo testing.'}
          </span>
        </div>

        {isRealIot && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Staleness Threshold:</span>
            <select
              value={esp32Status.heartbeat_timeout_seconds}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="bg-obsidian-850 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-farm-400"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds (Default)</option>
              <option value={60}>60 seconds</option>
              <option value={120}>120 seconds</option>
            </select>
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {connectionNotice && (
        <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
          connectionNotice.type === 'success'
            ? 'bg-farm-950/40 border-farm-500/40 text-farm-200'
            : connectionNotice.type === 'error'
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            : 'bg-sky-950/40 border-sky-500/40 text-sky-200'
        }`}>
          {connectionNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-farm-400 shrink-0 mt-0.5" />}
          {connectionNotice.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
          {connectionNotice.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />}
          <div>
            <span>{connectionNotice.text}</span>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 1: DIAGNOSTICS OVERVIEW                          */}
      {/* ==================================================== */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {/* Diagnostic Connectivity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: ESP32 Wi-Fi */}
            <div className="bg-obsidian-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                  <Wifi className="w-4 h-4 text-sky-400" />
                  <span>Wi-Fi Network</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  esp32Status.wifi === 'CONNECTED'
                    ? 'bg-farm-500/20 text-farm-300 border-farm-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {esp32Status.wifi === 'CONNECTED' ? '● CONNECTED' : '○ DISCONNECTED'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-slate-300 font-medium">
                    {esp32Status.wifi === 'CONNECTED' ? 'Associated (2.4GHz)' : 'No Stream'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Controller:</span>
                  <span className="font-mono text-slate-300 font-bold">ESP32 DevKit</span>
                </div>
              </div>
            </div>

            {/* Card 2: Supabase Link */}
            <div className="bg-obsidian-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                  <Cloud className="w-4 h-4 text-purple-400" />
                  <span>Supabase Link</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  esp32Status.backend === 'CONNECTED'
                    ? 'bg-farm-500/20 text-farm-300 border-farm-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {esp32Status.backend === 'CONNECTED' ? '● CONNECTED' : '○ ERROR'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span className="font-mono text-slate-300">sensor_readings</span>
                </div>
                <div className="flex justify-between">
                  <span>Zones Sync:</span>
                  <span className="text-slate-300">public.zones</span>
                </div>
              </div>
            </div>

            {/* Card 3: Last ESP32 Data */}
            <div className="bg-obsidian-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span>Last ESP32 Data</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isOnline 
                    ? 'bg-farm-500/20 text-farm-300 border-farm-500/40'
                    : isStale 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {isOnline ? 'FRESH' : isStale ? 'STALE' : 'OFFLINE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Age:</span>
                  <strong className="text-slate-200">{getLastDataAgeText()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                    {esp32Status.last_telemetry_timestamp || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Hardware Status */}
            <div className="bg-obsidian-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Hardware Status</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isOnline
                    ? 'bg-farm-500/20 text-farm-300 border-farm-500/40'
                    : isStale
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {isOnline ? '● ONLINE' : isStale ? '▲ STALE' : '○ OFFLINE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Rule:</span>
                  <span className="text-slate-300">&le; 30s Online | &gt; 120s Offline</span>
                </div>
                <div className="flex justify-between">
                  <span>USB Serial:</span>
                  <span className={serialStatus === 'CONNECTED' ? 'text-farm-400 font-bold' : 'text-slate-500'}>
                    {serialStatus === 'CONNECTED' ? 'Active' : 'Unused'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Real ESP32 Sensor Telemetry Strip */}
          <div className="bg-obsidian-900 border border-farm-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-farm-400" />
                <span>Latest Verified ESP32 Sensor Telemetry</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Source: public.sensor_readings
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {/* Moisture 1 */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Moisture 1 (Z1)</span>
                  <Droplet className="w-3.5 h-3.5 text-farm-400" />
                </div>
                <div className="font-display font-extrabold text-lg text-white font-mono">
                  {r.soil_moisture_zone1 !== null ? `${r.soil_moisture_zone1}%` : '--%'}
                </div>
                <div className="text-[10px] text-slate-500">GPIO35 / D35</div>
              </div>

              {/* Moisture 2 */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Moisture 2 (Z2)</span>
                  <Droplet className="w-3.5 h-3.5 text-farm-400" />
                </div>
                <div className="font-display font-extrabold text-lg text-white font-mono">
                  {r.soil_moisture_zone2 !== null ? `${r.soil_moisture_zone2}%` : '--%'}
                </div>
                <div className="text-[10px] text-slate-500">GPIO34 / D34</div>
              </div>

              {/* Temperature */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Temperature</span>
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="font-display font-extrabold text-lg text-white font-mono">
                  {r.temperature !== null ? `${r.temperature}°C` : '--°C'}
                </div>
                <div className="text-[10px] text-slate-500">DHT22 (GPIO4)</div>
              </div>

              {/* Humidity */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Humidity</span>
                  <Droplet className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="font-display font-extrabold text-lg text-white font-mono">
                  {r.humidity !== null ? `${r.humidity}%` : '--%'}
                </div>
                <div className="text-[10px] text-slate-500">DHT22 (GPIO4)</div>
              </div>

              {/* Light */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Light Level</span>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div className="font-display font-extrabold text-lg text-white font-mono">
                  {r.light !== null ? `${r.light}%` : '--%'}
                </div>
                <div className="text-[10px] text-slate-500">LDR (GPIO32)</div>
              </div>

              {/* Tank Distance */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Tank Distance</span>
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="font-display font-extrabold text-lg text-white font-mono">
                  {r.tank_distance_cm !== null ? `${r.tank_distance_cm} cm` : '-- cm'}
                </div>
                <div className="text-[10px] text-slate-500">HC-SR04 (GPIO5/16)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: HARDWARE GPIO PINOUT REFERENCE                */}
      {/* ==================================================== */}
      {activeTab === 'pinout' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-obsidian-900 border border-slate-800 space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-farm-400" />
                <span>ESP32 DevKit Physical Wiring Reference</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Dedicated hardware pin mapping for all probes, actuators, and I2C peripherals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2">
                <strong className="text-farm-300 text-xs block font-bold">🌱 Sensor Inputs</strong>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Soil Moisture 1 (Zone 1):</span>
                    <span className="text-white font-bold">GPIO35 / D35</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Soil Moisture 2 (Zone 2):</span>
                    <span className="text-white font-bold">GPIO34 / D34</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">DHT22 Data (Temp/Hum):</span>
                    <span className="text-white font-bold">GPIO4 / D4</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">LDR Photoresistor:</span>
                    <span className="text-white font-bold">GPIO32 / D32</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">HC-SR04 TRIG:</span>
                    <span className="text-white font-bold">GPIO5 / D5</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">HC-SR04 ECHO:</span>
                    <span className="text-white font-bold">GPIO16 / RX2</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2">
                <strong className="text-sky-300 text-xs block font-bold">⚡ Relays & Peripherals</strong>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Relay 1 (Zone 1 Pump):</span>
                    <span className="text-white font-bold">GPIO25 / D25</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Relay 2 (Zone 2 Pump):</span>
                    <span className="text-white font-bold">GPIO26 / D26</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Relay 3 (Zone 3 Pump):</span>
                    <span className="text-white font-bold">GPIO27 / D27</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">OLED I2C SDA:</span>
                    <span className="text-white font-bold">GPIO21 / D21</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">OLED I2C SCL:</span>
                    <span className="text-white font-bold">GPIO22 / D22</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: WEB SERIAL TERMINAL VIEW                      */}
      {/* ==================================================== */}
      {activeTab === 'serial' && (
        <div className="space-y-4">
          {!isWebSerialSupported && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold text-amber-100">Web Serial API Not Supported</strong>
                <p className="text-slate-300 text-[11px]">
                  Web Serial is supported in Chrome, Edge, and Opera on Windows/Mac/Linux over HTTPS or localhost.
                </p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Baud Rate</label>
                <select
                  value={baudRate}
                  onChange={(e) => {
                    const b = Number(e.target.value);
                    setBaudRate(b);
                    webSerialService.setSelectedBaudRate(b);
                  }}
                  disabled={serialStatus === 'CONNECTED'}
                  className="bg-obsidian-850 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-farm-400 disabled:opacity-50"
                >
                  {AVAILABLE_BAUD_RATES.map((b) => (
                    <option key={b} value={b}>{b} baud</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Port Status</label>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-obsidian-850 border border-slate-700 rounded-xl font-mono text-xs text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${
                    serialStatus === 'CONNECTED' ? 'bg-farm-400 animate-pulse' : 'bg-slate-500'
                  }`} />
                  <span>{serialStatus}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {serialStatus !== 'CONNECTED' ? (
                <button
                  type="button"
                  onClick={handleConnectSerial}
                  disabled={!isWebSerialSupported || isConnecting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-xs transition-all disabled:opacity-50 shadow-glow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-obsidian-950" />
                  <span>{isConnecting ? 'Requesting Port...' : 'Connect via USB Serial'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnectSerial}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-400" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </div>

          {/* Terminal Window */}
          <div className="h-80 bg-obsidian-950 border border-slate-800 rounded-2xl p-3 font-mono text-[11px] overflow-y-auto space-y-1 shadow-inner">
            {serialLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <Terminal className="w-8 h-8 opacity-40" />
                <p>No serial logs received yet.</p>
                <p className="text-[10px] text-slate-700">
                  Connect ESP32 via USB and click "Connect via USB Serial" above.
                </p>
              </div>
            ) : (
              serialLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-white/[0.02] px-1 py-0.5 rounded">
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`shrink-0 font-bold select-none ${
                    log.direction === 'rx' 
                      ? 'text-farm-400' 
                      : log.direction === 'tx' 
                      ? 'text-sky-400' 
                      : log.direction === 'error' 
                      ? 'text-rose-400' 
                      : 'text-purple-400'
                  }`}>
                    [{log.direction.toUpperCase()}]
                  </span>
                  <span className={`break-all ${
                    log.direction === 'rx' 
                      ? log.isJson ? 'text-emerald-300' : 'text-slate-300' 
                      : log.direction === 'tx' 
                      ? 'text-sky-200' 
                      : log.direction === 'error' 
                      ? 'text-rose-300' 
                      : 'text-purple-300'
                  }`}>
                    {log.text}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>

          {/* Quick Hardware Relay Test Actions */}
          <div className="p-3 bg-obsidian-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">⚡ Direct ESP32 Relay Commands (Active-LOW: LOW=ON, HIGH=OFF):</span>
              <span className="text-[10px] text-slate-400 font-mono">115200 Baud Newline-Terminated</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => webSerialService.send('PUMP1_ON')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-farm-500/20 hover:bg-farm-500/30 text-farm-300 border border-farm-500/40 text-[11px] font-mono font-bold disabled:opacity-40 transition-all"
              >
                PUMP1_ON (GPIO25 LOW)
              </button>
              <button
                type="button"
                onClick={() => webSerialService.send('PUMP1_OFF')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold disabled:opacity-40 transition-all"
              >
                PUMP1_OFF (GPIO25 HIGH)
              </button>
              <button
                type="button"
                onClick={() => webSerialService.send('PUMP2_ON')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-farm-500/20 hover:bg-farm-500/30 text-farm-300 border border-farm-500/40 text-[11px] font-mono font-bold disabled:opacity-40 transition-all"
              >
                PUMP2_ON (GPIO26 LOW)
              </button>
              <button
                type="button"
                onClick={() => webSerialService.send('PUMP2_OFF')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold disabled:opacity-40 transition-all"
              >
                PUMP2_OFF (GPIO26 HIGH)
              </button>
              <button
                type="button"
                onClick={() => webSerialService.send('PUMP3_ON')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-farm-500/20 hover:bg-farm-500/30 text-farm-300 border border-farm-500/40 text-[11px] font-mono font-bold disabled:opacity-40 transition-all"
              >
                PUMP3_ON (GPIO27 LOW)
              </button>
              <button
                type="button"
                onClick={() => webSerialService.send('PUMP3_OFF')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold disabled:opacity-40 transition-all"
              >
                PUMP3_OFF (GPIO27 HIGH)
              </button>
              <button
                type="button"
                onClick={() => webSerialService.send('ALL_PUMPS_OFF')}
                disabled={serialStatus !== 'CONNECTED'}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold disabled:opacity-40 transition-all ml-auto"
              >
                ALL_PUMPS_OFF
              </button>
            </div>
          </div>

          {/* Command Transmitter Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder='Type custom command or JSON (e.g. PUMP1_ON, STATUS, ALL_PUMPS_OFF)...'
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              disabled={serialStatus !== 'CONNECTED'}
              className="flex-1 bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-farm-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={serialStatus !== 'CONNECTED' || !customCommand.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: PROTOCOL SPECIFICATIONS                       */}
      {/* ==================================================== */}
      {activeTab === 'protocol' && (
        <div className="space-y-5 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span>ESP32 Serial Relay Protocol (Active-LOW Wiring)</span>
            </h4>
            <div className="text-[11px] text-slate-400 space-y-1.5">
              <p>
                The 3-channel relay module operates with <strong>Active-LOW logic</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code className="text-emerald-300">LOW</code> output from ESP32 = Relay ON (Relay contacts closed, DC pump energized)</li>
                <li><code className="text-amber-300">HIGH</code> output from ESP32 = Relay OFF (Relay contacts open, DC pump powered down)</li>
                <li>On ESP32 boot/reset, GPIO25, GPIO26, and GPIO27 start <code className="text-amber-300">HIGH</code> (relays remain safely OFF)</li>
              </ul>
            </div>

            <pre className="bg-obsidian-950 p-3 rounded-xl border border-slate-800 text-sky-300 font-mono text-[11px] overflow-x-auto">
{`Serial Commands Accepted (115200 Baud):
  PUMP1_ON       -> Sets GPIO25 LOW  -> Output: {"type":"pump_state","pump":1,"state":"ON"}
  PUMP1_OFF      -> Sets GPIO25 HIGH -> Output: {"type":"pump_state","pump":1,"state":"OFF"}
  PUMP2_ON       -> Sets GPIO26 LOW  -> Output: {"type":"pump_state","pump":2,"state":"ON"}
  PUMP2_OFF      -> Sets GPIO26 HIGH -> Output: {"type":"pump_state","pump":2,"state":"OFF"}
  PUMP3_ON       -> Sets GPIO27 LOW  -> Output: {"type":"pump_state","pump":3,"state":"ON"}
  PUMP3_OFF      -> Sets GPIO27 HIGH -> Output: {"type":"pump_state","pump":3,"state":"OFF"}
  ALL_PUMPS_OFF  -> Sets GPIO25/26/27 HIGH`}
            </pre>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span>ESP32 Supabase REST Telemetry Ingestion</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              The ESP32 firmware uploads sensor readings directly to Supabase table <code className="text-farm-300">public.sensor_readings</code> over Wi-Fi HTTPS.
            </p>

            <pre className="bg-obsidian-950 p-3 rounded-xl border border-slate-800 text-sky-300 font-mono text-[11px] overflow-x-auto">
{`POST https://<your-project>.supabase.co/rest/v1/sensor_readings
Headers:
  apikey: <SUPABASE_PUBLIC_ANON_KEY>
  Authorization: Bearer <SUPABASE_PUBLIC_ANON_KEY>
  Content-Type: application/json
  Prefer: return=minimal

Body:
[
  { "farm_id": "00000000-0000-0000-0000-000000000001", "zone_id": "00000000-0000-0000-0000-000000000011", "sensor_type": "soil_moisture", "value": 48.2, "unit": "%" },
  { "farm_id": "00000000-0000-0000-0000-000000000001", "zone_id": "00000000-0000-0000-0000-000000000012", "sensor_type": "soil_moisture", "value": 42.0, "unit": "%" },
  { "farm_id": "00000000-0000-0000-0000-000000000001", "sensor_type": "temperature", "value": 31.2, "unit": "°C" },
  { "farm_id": "00000000-0000-0000-0000-000000000001", "sensor_type": "humidity", "value": 65.4, "unit": "%" },
  { "farm_id": "00000000-0000-0000-0000-000000000001", "sensor_type": "light", "value": 78.0, "unit": "%" },
  { "farm_id": "00000000-0000-0000-0000-000000000001", "sensor_type": "tank_level", "value": 24.5, "unit": "cm" }
]`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
