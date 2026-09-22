import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Sun, 
  Moon,
  Save,
  Radio,
  Wifi,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Farm } from '../types';
import { 
  isSupabaseConfigured, 
  getActiveSupabaseConfig, 
  setSupabaseCredentials, 
  testSupabaseConnection,
  verifySupabaseEndToEnd,
  VerificationSuiteResult
} from '../lib/supabase';
import { iotService } from '../services/iotService';
import { dataService } from '../services/dataService';

interface SettingsProps {
  farm: Farm;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  farm,
  isDarkMode,
  onToggleDarkMode
}) => {
  const currentSupabase = getActiveSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState<string>(currentSupabase.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(currentSupabase.key);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [suiteResult, setSuiteResult] = useState<VerificationSuiteResult | null>(null);

  const [moistureThreshold, setMoistureThreshold] = useState<number>(30);
  const [tankLowThreshold, setTankLowThreshold] = useState<number>(20);
  const [flowPulseRate, setFlowPulseRate] = useState<number>(450); // 450 pulses/liter for YF-S201
  const [iotMode, setIotMode] = useState<'DEMO' | 'REAL_IOT'>(iotService.getMode());
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // If inputs changed, apply them first
    if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
      setSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
    }

    const result = await testSupabaseConnection();
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      // Trigger sync
      await dataService.syncFromSupabase();
    }
  };

  const handleRunFullSuite = async () => {
    setIsRunningSuite(true);
    setSuiteResult(null);

    if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
      setSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
    }

    const result = await verifySupabaseEndToEnd();
    setSuiteResult(result);
    setIsRunningSuite(false);

    if (result.overallSuccess) {
      await dataService.syncFromSupabase();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    iotService.setMode(iotMode);

    if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
      setSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
      await dataService.syncFromSupabase();
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 4000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-farm-400" />
          <span>System & Hardware Configuration</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Hardware bus parameters, Supabase database bindings, and autonomous moisture thresholds.
        </p>
      </div>

      {savedFeedback && (
        <div className="p-4 bg-farm-900/60 border border-farm-500/40 rounded-2xl text-xs font-bold text-farm-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-farm-400 shrink-0" />
          <span>Configuration settings updated and synced to local persistence layer.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Supabase Connection Console */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-farm-500/10 gap-2">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              <span>Real Supabase PostgreSQL & Storage Connection</span>
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isSupabaseConfigured 
                ? 'bg-farm-500/20 text-farm-300 border-farm-500/30' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {isSupabaseConfigured ? '● SUPABASE CONNECTED' : '● LOCAL DEMO ENGINE (ACTIVE)'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Supabase Project URL *
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Found under Project Settings &gt; API &gt; Project URL
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Supabase Public Anon Key (Never Service Role!) *
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Project Settings &gt; API &gt; Project API keys &gt; <code>anon / public</code>
                </span>
              </div>
            </div>

            {/* Connection Test Status Banner */}
            {testResult && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                testResult.success 
                  ? 'bg-farm-950/40 border-farm-500/40 text-farm-200' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-farm-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block font-bold">
                    {testResult.success ? 'Supabase Connection Verified!' : 'Connection Check Notice'}
                  </strong>
                  <p className="mt-0.5 text-[11px] text-slate-300">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Test Connection Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-400">
                💾 Credentials are also saved in <code>frontend/.env</code> and browser storage.
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || isRunningSuite}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 font-bold text-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Ping...' : 'Quick Connection Ping'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunFullSuite}
                  disabled={isTesting || isRunningSuite}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-farm-600/20 hover:bg-farm-600/30 text-farm-300 border border-farm-500/40 font-bold text-xs transition-all disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningSuite ? 'animate-spin' : ''}`} />
                  <span>{isRunningSuite ? 'Running E2E Verification...' : '⚡ Run Full End-to-End Test Suite'}</span>
                </button>
              </div>
            </div>

            {/* E2E Verification Suite Results Display */}
            {suiteResult && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                suiteResult.overallSuccess
                  ? 'bg-farm-950/50 border-farm-500/50 text-white'
                  : 'bg-rose-950/40 border-rose-500/40 text-white'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {suiteResult.overallSuccess ? (
                      <CheckCircle2 className="w-5 h-5 text-farm-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <strong className="text-sm font-bold">
                      {suiteResult.overallSuccess
                        ? 'End-to-End Verification Passed! (All Tables, Buckets & Operations Live)'
                        : `Verification Notice: ${suiteResult.failedSteps} step(s) failed / missing`}
                    </strong>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-black/40 border border-white/10">
                    {suiteResult.passedSteps} / {suiteResult.totalSteps} passed
                  </span>
                </div>

                {/* Verified Tables & Buckets Summary Badges */}
                <div className="space-y-1.5 text-[11px] pt-1 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-semibold">Verified Tables (11):</span>
                    {['profiles', 'farms', 'zones', 'sensor_readings', 'irrigation_events', 'crops', 'crop_cycles', 'expenses', 'disease_records', 'community_posts', 'community_comments'].map(tbl => (
                      <span
                        key={tbl}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          suiteResult.tablesVerified.includes(tbl)
                            ? 'bg-farm-500/20 text-farm-300 border border-farm-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {suiteResult.tablesVerified.includes(tbl) ? '✓ ' : '✗ '}{tbl}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-slate-400 font-semibold">Verified Buckets (2):</span>
                    {['disease-images', 'farm-images'].map(b => (
                      <span
                        key={b}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          suiteResult.bucketsVerified.includes(b)
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {suiteResult.bucketsVerified.includes(b) ? '✓ ' : '✗ '}{b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Operations Step Details Log */}
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1 rounded-xl bg-black/40 p-2.5 font-mono text-[10px] border border-white/5">
                  {suiteResult.steps.map((st, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 py-0.5 border-b border-white/5 last:border-0">
                      <div className="flex items-start gap-1.5">
                        <span className={st.status === 'SUCCESS' ? 'text-farm-400' : 'text-rose-400'}>
                          {st.status === 'SUCCESS' ? '● [PASS]' : '● [FAIL]'}
                        </span>
                        <div>
                          <strong className="text-slate-200">{st.name}:</strong>{' '}
                          <span className="text-slate-400">{st.details}</span>
                        </div>
                      </div>
                      {st.latencyMs !== undefined && (
                        <span className="text-slate-500 shrink-0">{st.latencyMs}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-obsidian-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <span>📋 Database Setup Checklist:</span>
              </div>
              <p>1. Open your Supabase Dashboard &gt; SQL Editor.</p>
              <p>2. Paste and run the contents of <code>supabase/schema.sql</code>.</p>
              <p>3. This creates all 11 tables, RLS policies, and Storage buckets (<code>disease-images</code>, <code>farm-images</code>).</p>
            </div>
          </div>
        </div>

        {/* Hardware & Single Flow Sensor Configuration */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-farm-500/10">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-farm-400" />
              <span>IoT Prototype Actuator & Sensor Bus</span>
            </h3>
            <span className="text-xs font-mono text-farm-300">STM32 + ESP32</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Hardware Abstraction Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIotMode('DEMO')}
                  className={`py-2 px-3 rounded-xl border text-center font-bold ${
                    iotMode === 'DEMO' ? 'bg-farm-500/20 border-farm-400 text-farm-300' : 'bg-obsidian-900 border-slate-800 text-slate-400'
                  }`}
                >
                  DEMO (In-Browser Simulation)
                </button>
                <button
                  type="button"
                  onClick={() => setIotMode('REAL_IOT')}
                  className={`py-2 px-3 rounded-xl border text-center font-bold ${
                    iotMode === 'REAL_IOT' ? 'bg-farm-500/20 border-farm-400 text-farm-300' : 'bg-obsidian-900 border-slate-800 text-slate-400'
                  }`}
                >
                  REAL_IOT (ESP32 Gateway)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                YF-S201 Flow Calibration (Pulses / Liter)
              </label>
              <input
                type="number"
                value={flowPulseRate}
                onChange={(e) => setFlowPulseRate(parseInt(e.target.value) || 450)}
                className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 450 pulses/L for 1.7 L/min nominal drip flow</span>
            </div>
          </div>
        </div>

        {/* Autonomous Irrigation Thresholds */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
          <h3 className="font-display font-bold text-base text-white mb-4 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <span>Autonomous Safety & Irrigation Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 font-semibold mb-1">
                <span>Soil Moisture Deficit Trigger (Threshold):</span>
                <strong className="text-amber-400 font-mono">{moistureThreshold}%</strong>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                value={moistureThreshold}
                onChange={(e) => setMoistureThreshold(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                When soil moisture drops below this value, the zone transitions to "IRRIGATION REQUIRED".
              </span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-semibold mb-1">
                <span>Low Tank Cut-off Protection:</span>
                <strong className="text-sky-400 font-mono">{tankLowThreshold}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={tankLowThreshold}
                onChange={(e) => setTankLowThreshold(parseInt(e.target.value))}
                className="w-full accent-sky-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Pumps automatically disengage if HC-SR04 level drops below this point to prevent dry cavitation.
              </span>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white">Visual Interface Theme</h3>
            <p className="text-xs text-slate-400">Toggle between Dark Emerald mode and High-Contrast Day mode.</p>
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-obsidian-900 border border-slate-700 text-white text-xs font-bold hover:bg-slate-800"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-sm shadow-glow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration & Sync</span>
          </button>
        </div>
      </form>
    </div>
  );
};
