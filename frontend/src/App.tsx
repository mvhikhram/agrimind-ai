import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { MyFarm } from './pages/MyFarm';
import { CropPlanner } from './pages/CropPlanner';
import { SmartIrrigation } from './pages/SmartIrrigation';
import { DiseaseDetection } from './pages/DiseaseDetection';
import { Analytics } from './pages/Analytics';
import { FarmCopilot } from './pages/FarmCopilot';
import { Community } from './pages/Community';
import { SettingsPage } from './pages/Settings';

import { Farm, Zone, SensorData } from './types';
import { dataService } from './services/dataService';
import { iotService } from './services/iotService';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Farms and Zones State
  const [farms, setFarms] = useState<Farm[]>(() => dataService.getFarms());
  const [activeFarmId, setActiveFarmId] = useState<string>(() => dataService.getActiveFarmId());
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);

  // Telemetry State from IoT Service
  const [telemetry, setTelemetry] = useState<SensorData>(() => iotService.getCurrentData());

  useEffect(() => {
    const unsubIoT = iotService.subscribe((data) => {
      setTelemetry({ ...data });
    });
    const unsubData = dataService.subscribe(() => {
      setFarms([...dataService.getFarms()]);
      setActiveFarmId(dataService.getActiveFarmId());
    });
    return () => {
      unsubIoT();
      unsubData();
    };
  }, []);

  const activeFarm = farms.find(f => f.id === activeFarmId) || farms[0];
  const zones = dataService.getZones(activeFarm?.id);

  const handleSelectFarm = (id: string) => {
    setActiveFarmId(id);
    dataService.setActiveFarmId(id);
  };

  const handleFarmAdded = (newFarm: Farm) => {
    setFarms([...dataService.getFarms()]);
    setActiveFarmId(newFarm.id);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-obsidian-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          onSelectPage={setActivePage}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navbar */}
          <Navbar
            farms={farms}
            activeFarmId={activeFarmId}
            onSelectFarm={handleSelectFarm}
            onOpenAddFarm={() => {
              setActivePage('my-farm');
              setIsAddFarmOpen(true);
            }}
            telemetry={telemetry}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          />

          {/* Page Routing */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-7xl mx-auto pb-12">
              {activePage === 'dashboard' && (
                <Dashboard
                  farm={activeFarm}
                  zones={zones}
                  telemetry={telemetry}
                  onNavigatePage={(p) => setActivePage(p as PageId)}
                />
              )}

              {activePage === 'my-farm' && (
                <MyFarm
                  farms={farms}
                  activeFarmId={activeFarmId}
                  onSelectFarm={handleSelectFarm}
                  onFarmAdded={handleFarmAdded}
                  isAddModalOpenInitially={isAddFarmOpen}
                  onCloseModal={() => setIsAddFarmOpen(false)}
                  onNavigateToDashboard={() => setActivePage('dashboard')}
                />
              )}

              {activePage === 'crop-planner' && (
                <CropPlanner farm={activeFarm} />
              )}

              {activePage === 'smart-irrigation' && (
                <SmartIrrigation
                  farm={activeFarm}
                  zones={zones}
                  telemetry={telemetry}
                />
              )}

              {activePage === 'disease-detection' && (
                <DiseaseDetection
                  farm={activeFarm}
                  zones={zones}
                />
              )}

              {activePage === 'analytics' && (
                <Analytics
                  farm={activeFarm}
                  zones={zones}
                  telemetry={telemetry}
                />
              )}

              {activePage === 'farm-copilot' && (
                <FarmCopilot
                  farm={activeFarm}
                  zones={zones}
                  telemetry={telemetry}
                />
              )}

              {activePage === 'community' && (
                <Community />
              )}

              {activePage === 'settings' && (
                <SettingsPage
                  farm={activeFarm}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
