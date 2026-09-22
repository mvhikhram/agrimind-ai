import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Sprout, 
  Droplets, 
  ScanLine, 
  BarChart3, 
  Bot, 
  Users, 
  Settings,
  Leaf
} from 'lucide-react';

export type PageId = 
  | 'dashboard'
  | 'my-farm'
  | 'crop-planner'
  | 'smart-irrigation'
  | 'disease-detection'
  | 'analytics'
  | 'farm-copilot'
  | 'community'
  | 'settings';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my-farm' as PageId, label: 'My Farm', icon: MapPin },
  { id: 'crop-planner' as PageId, label: 'Crop Planner', icon: Sprout },
  { id: 'smart-irrigation' as PageId, label: 'Smart Irrigation', icon: Droplets },
  { id: 'disease-detection' as PageId, label: 'Disease Detection', icon: ScanLine },
  { id: 'analytics' as PageId, label: 'Analytics', icon: BarChart3 },
  { id: 'farm-copilot' as PageId, label: 'Farm Copilot', icon: Bot, badge: 'AI' },
  { id: 'community' as PageId, label: 'Community', icon: Users },
  { id: 'settings' as PageId, label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activePage, 
  onSelectPage, 
  isMobileOpen, 
  onCloseMobile 
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed lg:static top-0 left-0 bottom-0 z-50
        w-64 bg-obsidian-900 border-r border-farm-500/15
        flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="h-20 flex items-center gap-3 px-6 border-b border-farm-500/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-400 to-farm-600 flex items-center justify-center text-obsidian-950 font-bold shadow-glow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                AGRIMIND <span className="text-farm-400 font-black">AI</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-farm-300/70 font-semibold">
                AUTONOMOUS AGRITECH
              </div>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectPage(item.id);
                    onCloseMobile();
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl
                    font-medium text-sm transition-all duration-200
                    ${isActive 
                      ? 'bg-farm-500 text-obsidian-950 font-bold shadow-glow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-farm-900/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-obsidian-950 stroke-[2.5]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`
                      text-[10px] font-bold px-1.5 py-0.5 rounded-full
                      ${isActive ? 'bg-obsidian-900 text-farm-300' : 'bg-farm-500/20 text-farm-300'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Hardware Status Footer Widget */}
        <div className="p-4 border-t border-farm-500/10 m-4 rounded-2xl bg-obsidian-800/80 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Hardware Gateway</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-farm-400">
              <span className="w-2 h-2 rounded-full bg-farm-400 animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>MCU:</span>
              <span className="font-mono text-slate-200">STM32F410</span>
            </div>
            <div className="flex justify-between">
              <span>IoT:</span>
              <span className="font-mono text-slate-200">ESP32 Wi-Fi</span>
            </div>
            <div className="flex justify-between">
              <span>Flow Meter:</span>
              <span className="font-mono text-farm-400">1x YF-S201</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
