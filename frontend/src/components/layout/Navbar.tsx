import React, { useState } from 'react';
import { 
  Menu, 
  ChevronDown, 
  Wifi, 
  Bell, 
  Sun, 
  Moon, 
  Plus, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Farm, SensorData } from '../../types';
import { iotService } from '../../services/iotService';

interface NavbarProps {
  farms: Farm[];
  activeFarmId: string;
  onSelectFarm: (farmId: string) => void;
  onOpenAddFarm: () => void;
  telemetry: SensorData;
  onToggleMobileMenu: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  farms,
  activeFarmId,
  onSelectFarm,
  onOpenAddFarm,
  telemetry,
  onToggleMobileMenu,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const activeFarm = farms.find(f => f.id === activeFarmId) || farms[0];

  return (
    <header className="h-20 bg-obsidian-900/90 backdrop-blur-md border-b border-farm-500/15 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu & Farm Selector */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-farm-900/40 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Farm Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFarmDropdownOpen(!isFarmDropdownOpen)}
            className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-xl bg-obsidian-850 hover:bg-farm-900/30 border border-farm-500/20 text-left transition-all"
          >
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-farm-400">
                Selected Farm
              </div>
              <div className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>{activeFarm?.name || 'Demo Smart Farm'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isFarmDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsFarmDropdownOpen(false)} 
              />
              <div className="absolute top-full mt-2 left-0 w-64 bg-obsidian-900 border border-farm-500/25 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  Switch Farm
                </div>
                {farms.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelectFarm(f.id);
                      setIsFarmDropdownOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-between
                      ${f.id === activeFarmId 
                        ? 'bg-farm-500/20 text-farm-300 font-bold' 
                        : 'text-slate-300 hover:bg-farm-900/40'
                      }
                    `}
                  >
                    <div>
                      <div>{f.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {f.area_acres} Acres • {f.district}
                      </div>
                    </div>
                    {f.id === activeFarmId && <CheckCircle2 className="w-4 h-4 text-farm-400" />}
                  </button>
                ))}

                <div className="pt-2 mt-2 border-t border-farm-500/10">
                  <button
                    onClick={() => {
                      setIsFarmDropdownOpen(false);
                      onOpenAddFarm();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-farm-400 hover:bg-farm-500/15 rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Farm</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Status Badges, Notifications, Theme */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Hardware / IoT Status Badge */}
        {(() => {
          const isRealIoT = iotService.getMode() === 'REAL_IOT';
          return (
            <>
              {!isRealIoT && (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-bold text-amber-300">
                  <span>🟡</span>
                  <span>DEMO MODE</span>
                </div>
              )}

              <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${
                isRealIoT 
                  ? 'bg-farm-500/15 border-farm-500/30 text-farm-300' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isRealIoT ? 'bg-farm-400' : 'bg-amber-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isRealIoT ? 'bg-farm-500' : 'bg-amber-500'
                  }`}></span>
                </span>
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{isRealIoT ? 'IoT: ONLINE' : 'IoT: SIMULATION'}</span>
                </span>
              </div>
            </>
          );
        })()}

        {/* Last Updated counter */}
        <div className="hidden md:block text-xs text-slate-400 font-medium">
          Updated: <span className="text-slate-200">{telemetry.last_updated}</span>
        </div>

        {/* Notifications Drawer Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="p-2.5 rounded-xl bg-obsidian-850 hover:bg-farm-900/30 border border-farm-500/20 text-slate-300 hover:text-white relative transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"></span>
          </button>

          {isNotificationOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-obsidian-900 border border-farm-500/25 rounded-2xl shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-farm-500/10">
                  <span className="font-display font-bold text-sm text-white">System Alerts</span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    2 New
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2.5 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-200">Zone 2 Soil Moisture Alert</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">Moisture is 25% (below threshold of 45%).</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-farm-500/10 border border-farm-500/20 flex gap-2.5 items-start">
                    <CheckCircle2 className="w-4 h-4 text-farm-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-farm-200">STM32 Gateway Synced</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">All 6 sensors transmitting via ESP32.</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Light/Dark Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2.5 rounded-xl bg-obsidian-850 hover:bg-farm-900/30 border border-farm-500/20 text-slate-300 hover:text-white transition-all"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>
      </div>
    </header>
  );
};
