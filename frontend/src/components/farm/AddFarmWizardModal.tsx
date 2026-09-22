import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Check, 
  CheckCircle2, 
  Layers, 
  Droplets, 
  Calendar, 
  Sparkles, 
  Navigation, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Compass, 
  TrendingUp, 
  AlertTriangle, 
  RotateCcw, 
  Cpu, 
  Sprout,
  DollarSign,
  FileText,
  Sliders,
  Info,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Minus,
  CheckSquare,
  Square
} from 'lucide-react';
import { Farm, Zone, Crop, CropAllocation } from '../../types';
import { dataService } from '../../services/dataService';
import { aiService } from '../../services/aiService';
import { StateDistrictSelector } from '../common/StateDistrictSelector';

interface AddFarmWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFarmCreated: (newFarm: Farm) => void;
  onNavigateToDashboard?: () => void;
}

type WizardMode = 'SELECT_MODE' | 'EXISTING_FARM' | 'PLANNING_NEW_FARM';

interface ZoneDraft {
  zone_number: number;
  name: string;
  crop_name: string;
  area_acres: number;
  target_moisture: number;
  pump_status: boolean;
  pump_number?: number;
  priority?: 'High' | 'Medium' | 'Low';
  irrigation_mode?: 'AUTO' | 'MANUAL';
  estimated_daily_liters?: number;
}

export const AddFarmWizardModal: React.FC<AddFarmWizardModalProps> = ({
  isOpen,
  onClose,
  onFarmCreated,
  onNavigateToDashboard
}) => {
  // Mode selection: 'SELECT_MODE', 'EXISTING_FARM', or 'PLANNING_NEW_FARM'
  const [mode, setMode] = useState<WizardMode>('SELECT_MODE');

  // Option 2 Planner Step (1 to 9)
  const [plannerStep, setPlannerStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common Form Fields
  const [farmName, setFarmName] = useState('Green Valley Agro');
  const [state, setState] = useState('Telangana');
  const [district, setDistrict] = useState('Jogulamba Gadwal');
  const [villageCity, setVillageCity] = useState('Gadwal Rural');
  const [areaAcres, setAreaAcres] = useState<number>(20.0); // Default 20 acres for realistic multi-crop planning
  const [gpsCoordinates, setGpsCoordinates] = useState('16.23° N, 77.80° E');

  // Step 2 & Existing: Soil & Water
  const [soilType, setSoilType] = useState('Sandy Clay Loam');
  const [soilPh, setSoilPh] = useState<number>(6.5);
  const [waterAvailability, setWaterAvailability] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [irrigationMethod, setIrrigationMethod] = useState<'Drip' | 'Sprinkler' | 'Flood'>('Drip');
  const [microclimateNotes, setMicroclimateNotes] = useState('Semi-arid Deccan basin with hot dry pre-monsoon and moderate black soil moisture retention.');

  // Step 3: Dedicated Season
  const [season, setSeason] = useState<'Kharif' | 'Rabi' | 'Zaid' | 'Perennial'>('Rabi');

  // Option 1: Existing Farm Specifics (Direct Entry without forcing AI recommendation)
  const [currentCrop, setCurrentCrop] = useState('Tomato (Roma Hybrid)');
  const [existingNumZones, setExistingNumZones] = useState<number>(3);
  const [existingZones, setExistingZones] = useState<ZoneDraft[]>([
    { zone_number: 1, name: 'Zone 1 - Main Field', crop_name: 'Tomato (Roma Hybrid)', area_acres: 8.0, target_moisture: 50, pump_status: false, pump_number: 1, priority: 'High', irrigation_mode: 'AUTO' },
    { zone_number: 2, name: 'Zone 2 - Central Plot', crop_name: 'Groundnut (K-6)', area_acres: 7.0, target_moisture: 45, pump_status: false, pump_number: 2, priority: 'Medium', irrigation_mode: 'AUTO' },
    { zone_number: 3, name: 'Zone 3 - South Sector', crop_name: 'Cotton (Bt Hybrid)', area_acres: 5.0, target_moisture: 50, pump_status: false, pump_number: 3, priority: 'Medium', irrigation_mode: 'AUTO' }
  ]);

  // Candidate Crops catalog
  const availableCrops: Crop[] = useMemo(() => [
    {
      id: 'crop-tomato',
      name: 'Tomato (Roma Hybrid F1)',
      category: 'Solanaceous Vegetable',
      duration_days: 110,
      water_requirement: 'Medium',
      optimal_soil_type: 'Sandy Clay Loam',
      optimal_ph_range: [6.0, 7.0],
      expected_yield_per_acre: '12 - 14 Tons',
      est_investment_per_acre: 65000,
      est_revenue_per_acre: 175000,
      est_profit_per_acre: 110000,
      risk_level: 'Medium',
      description: 'High market demand; responsive to precision drip irrigation.'
    },
    {
      id: 'crop-groundnut',
      name: 'Groundnut (Spanish Bunch K-6)',
      category: 'Oilseed / Legume',
      duration_days: 120,
      water_requirement: 'Low',
      optimal_soil_type: 'Red Sandy Loam',
      optimal_ph_range: [6.0, 6.8],
      expected_yield_per_acre: '1.2 - 1.6 Tons',
      est_investment_per_acre: 32000,
      est_revenue_per_acre: 88000,
      est_profit_per_acre: 56000,
      risk_level: 'Low',
      description: 'Drought-hardy legume ideal for light soils; fixes nitrogen.'
    },
    {
      id: 'crop-cotton',
      name: 'Bt Cotton (Long Staple)',
      category: 'Commercial Fiber',
      duration_days: 165,
      water_requirement: 'Medium',
      optimal_soil_type: 'Black Cotton (Regur)',
      optimal_ph_range: [6.5, 8.0],
      expected_yield_per_acre: '1.0 - 1.4 Tons',
      est_investment_per_acre: 42000,
      est_revenue_per_acre: 115000,
      est_profit_per_acre: 73000,
      risk_level: 'Medium',
      description: 'Strong deep taproot system; highly sensitive to waterlogging.'
    },
    {
      id: 'crop-wheat',
      name: 'Winter Wheat (HD-2967)',
      category: 'Cereal Grain',
      duration_days: 125,
      water_requirement: 'Medium',
      optimal_soil_type: 'Alluvial Loam',
      optimal_ph_range: [6.0, 7.5],
      expected_yield_per_acre: '2.0 - 2.5 Tons',
      est_investment_per_acre: 28000,
      est_revenue_per_acre: 65000,
      est_profit_per_acre: 37000,
      risk_level: 'Low',
      description: 'Staple food grain requiring 4-5 timed critical crown root irrigations.'
    },
    {
      id: 'crop-chilli',
      name: 'Guntur Hot Chilli (Teja)',
      category: 'Spices / Cash Crop',
      duration_days: 150,
      water_requirement: 'High',
      optimal_soil_type: 'Black Cotton (Regur)',
      optimal_ph_range: [6.0, 7.5],
      expected_yield_per_acre: '1.8 - 2.2 Tons Dry',
      est_investment_per_acre: 85000,
      est_revenue_per_acre: 230000,
      est_profit_per_acre: 145000,
      risk_level: 'High',
      description: 'High reward export quality crop; requires strict pest scouting.'
    }
  ], []);

  // Step 4: Multi-Crop Selection State (allow 1, 2, 3, or more)
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>(['crop-tomato', 'crop-groundnut', 'crop-cotton']);

  const selectedCrops: Crop[] = useMemo(() => {
    const list = availableCrops.filter(c => selectedCropIds.includes(c.id));
    return list.length > 0 ? list : [availableCrops[0]];
  }, [availableCrops, selectedCropIds]);

  const toggleCropSelection = (cropId: string) => {
    setSelectedCropIds(prev => {
      if (prev.includes(cropId)) {
        if (prev.length === 1) return prev; // keep at least 1 crop selected
        return prev.filter(id => id !== cropId);
      } else {
        return [...prev, cropId];
      }
    });
  };

  // Step 5: Acreage Allocation State
  const [cropAcreageMap, setCropAcreageMap] = useState<Record<string, number>>({
    'crop-tomato': 8.0,
    'crop-groundnut': 7.0,
    'crop-cotton': 5.0
  });
  const [isCustomAllocation, setIsCustomAllocation] = useState<boolean>(false);

  // Profit/Loss What-If Sensitivity Modifiers
  const [yieldModifierPercent, setYieldModifierPercent] = useState<number>(0);
  const [priceModifierPercent, setPriceModifierPercent] = useState<number>(0);

  // Compute AI Recommendation based on criteria
  const aiAllocationResult = useMemo(() => {
    return aiService.recommendCropAllocation({
      farmId: 'new-farm',
      season,
      soilType,
      soilPh,
      waterAvailability,
      irrigationMethod,
      areaAcres,
      state,
      district
    }, selectedCrops);
  }, [season, soilType, soilPh, waterAvailability, irrigationMethod, areaAcres, state, district, selectedCrops]);

  // Apply AI Recommendation
  const applyAiRecommendation = () => {
    const newMap: Record<string, number> = {};
    aiAllocationResult.allocations.forEach(a => {
      const match = availableCrops.find(c => c.name === a.crop_name);
      if (match) {
        newMap[match.id] = a.area_acres;
      }
    });
    setCropAcreageMap(newMap);
    setIsCustomAllocation(false);
  };

  // Adjust acreage manually
  const handleAcreageChange = (cropId: string, val: number) => {
    const rounded = Math.round(val * 10) / 10;
    const otherTotal = selectedCrops
      .filter(c => c.id !== cropId)
      .reduce((s, c) => s + (cropAcreageMap[c.id] || 0), 0);
    const maxAllowed = Math.max(0.5, Math.round((areaAcres - otherTotal) * 10) / 10);
    const clamped = Math.max(0.5, Math.min(maxAllowed, rounded));

    setCropAcreageMap(prev => ({
      ...prev,
      [cropId]: clamped
    }));
    setIsCustomAllocation(true);
  };

  const handleAdjustAcreage = (cropId: string, delta: number) => {
    const current = cropAcreageMap[cropId] || (Math.round((areaAcres / selectedCrops.length) * 10) / 10);
    handleAcreageChange(cropId, current + delta);
  };

  // Total Allocated & Remaining
  const totalAllocatedAcreage = useMemo(() => {
    const sum = selectedCrops.reduce((s, c) => s + (cropAcreageMap[c.id] || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [selectedCrops, cropAcreageMap]);

  const remainingAcreage = useMemo(() => {
    return Math.round((areaAcres - totalAllocatedAcreage) * 10) / 10;
  }, [areaAcres, totalAllocatedAcreage]);

  // List of Crop Allocations with water and economics
  const cropAllocationsList: CropAllocation[] = useMemo(() => {
    return selectedCrops.map(crop => {
      const acres = cropAcreageMap[crop.id] || (Math.round((areaAcres / selectedCrops.length) * 10) / 10);
      const percentage = areaAcres > 0 ? Math.round((acres / areaAcres) * 100) : 0;
      const water = aiService.calculateCropWaterRequirement(crop.name, acres, irrigationMethod);
      return {
        crop_name: crop.name,
        area_acres: acres,
        percentage,
        water_requirement: crop.water_requirement,
        estimated_daily_liters: water.dailyLiters,
        expected_yield: crop.expected_yield_per_acre,
        risk_level: crop.risk_level,
        est_profit_per_acre: crop.est_profit_per_acre
      };
    });
  }, [selectedCrops, cropAcreageMap, areaAcres, irrigationMethod]);

  // Combined Multi-Crop Economics
  const combinedInvestment = useMemo(() => {
    return cropAllocationsList.reduce((sum, a) => {
      const match = availableCrops.find(c => c.name === a.crop_name);
      return sum + (match ? match.est_investment_per_acre * a.area_acres : 45000 * a.area_acres);
    }, 0);
  }, [cropAllocationsList, availableCrops]);

  const combinedRevenue = useMemo(() => {
    const base = cropAllocationsList.reduce((sum, a) => {
      const match = availableCrops.find(c => c.name === a.crop_name);
      return sum + (match ? match.est_revenue_per_acre * a.area_acres : 120000 * a.area_acres);
    }, 0);
    const withYieldMod = base * (1 + yieldModifierPercent / 100);
    return withYieldMod * (1 + priceModifierPercent / 100);
  }, [cropAllocationsList, availableCrops, yieldModifierPercent, priceModifierPercent]);

  const combinedProfit = useMemo(() => combinedRevenue - combinedInvestment, [combinedRevenue, combinedInvestment]);
  const combinedRoi = useMemo(() => combinedInvestment > 0 ? Math.round((combinedProfit / combinedInvestment) * 100) : 0, [combinedProfit, combinedInvestment]);

  // Step 6 & 7: Zones Setup (1 to 10 zones)
  const [numPlannerZones, setNumPlannerZones] = useState<number>(3);
  const [plannerZones, setPlannerZones] = useState<ZoneDraft[]>([
    { zone_number: 1, name: 'Zone 1 - Main Tomato Plot', crop_name: 'Tomato (Roma Hybrid F1)', area_acres: 8.0, target_moisture: 50, pump_status: false, pump_number: 1, priority: 'High', irrigation_mode: 'AUTO', estimated_daily_liters: 28800 },
    { zone_number: 2, name: 'Zone 2 - Central Groundnut Plot', crop_name: 'Groundnut (Spanish Bunch K-6)', area_acres: 7.0, target_moisture: 45, pump_status: false, pump_number: 2, priority: 'Medium', irrigation_mode: 'AUTO', estimated_daily_liters: 17500 },
    { zone_number: 3, name: 'Zone 3 - South Cotton Plot', crop_name: 'Bt Cotton (Long Staple)', area_acres: 5.0, target_moisture: 50, pump_status: false, pump_number: 3, priority: 'Medium', irrigation_mode: 'AUTO', estimated_daily_liters: 16000 }
  ]);

  // Synchronize planner zones whenever numPlannerZones or cropAllocationsList changes
  const handleNumZonesChange = (nextNum: number) => {
    const valid = Math.max(1, Math.min(10, nextNum));
    setNumPlannerZones(valid);
    const generated = aiService.generateZonesForCrops(areaAcres, valid, cropAllocationsList, irrigationMethod);
    setPlannerZones(generated);
  };

  // Sync suggested zones when entering Step 6 if not already synced
  useEffect(() => {
    if (plannerStep === 6) {
      const generated = aiService.generateZonesForCrops(areaAcres, numPlannerZones, cropAllocationsList, irrigationMethod);
      setPlannerZones(generated);
    }
  }, [plannerStep, areaAcres, numPlannerZones]);

  // Calculate total zone acreage
  const totalZoneAcreage = useMemo(() => {
    const sum = plannerZones.slice(0, numPlannerZones).reduce((s, z) => s + (z.area_acres || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [plannerZones, numPlannerZones]);

  if (!isOpen) return null;

  // Handle Option 1 Save (Existing Farm)
  const handleCreateExistingFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) return;

    setIsSubmitting(true);
    const zonesToSave = existingZones.slice(0, existingNumZones);

    // Derive crop allocations from existing zones
    const cropTotals: Record<string, number> = {};
    zonesToSave.forEach(z => {
      cropTotals[z.crop_name] = (cropTotals[z.crop_name] || 0) + z.area_acres;
    });

    const existingAllocations: CropAllocation[] = Object.entries(cropTotals).map(([crop_name, acres]) => {
      const water = aiService.calculateCropWaterRequirement(crop_name, acres, irrigationMethod);
      return {
        crop_name,
        area_acres: acres,
        percentage: areaAcres > 0 ? Math.round((acres / areaAcres) * 100) : 0,
        water_requirement: water.waterLevel,
        estimated_daily_liters: water.dailyLiters
      };
    });

    const createdFarm = await dataService.addFarm({
      name: farmName.trim(),
      state,
      district,
      village_city: villageCity.trim() || 'Rural Area',
      area_acres: areaAcres,
      soil_type: soilType,
      soil_ph: soilPh,
      water_availability: waterAvailability,
      irrigation_method: irrigationMethod,
      season: season,
      crops_allocation: existingAllocations
    }, zonesToSave);

    for (const alloc of existingAllocations) {
      await dataService.addCropCycle({
        farm_id: createdFarm.id,
        zone_id: zonesToSave[0]?.name,
        crop_name: alloc.crop_name,
        sowing_date: new Date().toISOString().split('T')[0],
        expected_harvest_date: new Date(Date.now() + 100 * 86400000).toISOString().split('T')[0],
        current_stage: 'Vegetative',
        notes: `Established farm plot recorded with ${existingNumZones} configured sequential zones.`
      });
    }

    setIsSubmitting(false);
    onFarmCreated(createdFarm);
    onNavigateToDashboard?.();
  };

  // Handle Option 2 Save (Planning a New Farm)
  const handleCreatePlannedFarm = async () => {
    setIsSubmitting(true);
    const zonesToSave = plannerZones.slice(0, numPlannerZones);

    const createdFarm = await dataService.addFarm({
      name: farmName.trim(),
      state,
      district,
      village_city: villageCity.trim() || 'Rural Area',
      area_acres: areaAcres,
      soil_type: soilType,
      soil_ph: soilPh,
      water_availability: waterAvailability,
      irrigation_method: irrigationMethod,
      season: season,
      crops_allocation: cropAllocationsList
    }, zonesToSave);

    // Persist full detailed crop plan for each configured crop into Supabase
    for (const alloc of cropAllocationsList) {
      const match = availableCrops.find(c => c.name === alloc.crop_name);
      const matchZone = zonesToSave.find(z => z.crop_name === alloc.crop_name);

      await dataService.addCropCycle({
        farm_id: createdFarm.id,
        zone_id: matchZone?.name || zonesToSave[0]?.name || 'Zone 1',
        crop_name: alloc.crop_name,
        sowing_date: new Date().toISOString().split('T')[0],
        expected_harvest_date: new Date(Date.now() + (match?.duration_days || 110) * 86400000).toISOString().split('T')[0],
        current_stage: 'Land Preparation',
        notes: `Planned via Agrimind Guided Crop Planner. ${alloc.area_acres} acres (${alloc.percentage}% of farm). Daily water requirement: ${alloc.estimated_daily_liters} L/day.`,
        plan_data: {
          crop: alloc.crop_name,
          area_acres: alloc.area_acres,
          percentage: alloc.percentage,
          duration_days: match?.duration_days || 110,
          target_moisture: matchZone?.target_moisture || 50,
          season,
          irrigation_method: irrigationMethod
        }
      });
    }

    // Record planned input budget into expenses
    await dataService.addExpense({
      farm_id: createdFarm.id,
      category: 'Seeds',
      amount: Math.round(combinedInvestment * 0.25),
      description: `Certified seed materials for ${cropAllocationsList.map(c => c.crop_name).join(', ')}`,
      expense_date: new Date().toISOString().split('T')[0]
    });
    await dataService.addExpense({
      farm_id: createdFarm.id,
      category: 'Fertilizer',
      amount: Math.round(combinedInvestment * 0.35),
      description: 'Scheduled multi-crop basal and fertigation nutrients',
      expense_date: new Date().toISOString().split('T')[0]
    });
    await dataService.addExpense({
      farm_id: createdFarm.id,
      category: 'Irrigation',
      amount: Math.round(combinedInvestment * 0.15),
      description: `${numPlannerZones} sequential zone fittings and drip manifold inspection`,
      expense_date: new Date().toISOString().split('T')[0]
    });

    setIsSubmitting(false);
    onFarmCreated(createdFarm);
    onNavigateToDashboard?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-obsidian-900 border border-farm-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-farm-500/20 flex items-center justify-between bg-obsidian-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sprout className="w-5 h-5 text-farm-400" />
            <div>
              <h2 className="font-display font-black text-lg text-white">
                {mode === 'SELECT_MODE' && 'Farm Setup & Planning'}
                {mode === 'EXISTING_FARM' && 'Existing Farm Setup'}
                {mode === 'PLANNING_NEW_FARM' && `Guided Crop Planner — Step ${plannerStep} of 9`}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'SELECT_MODE' && 'How would you like to set up your farm?'}
                {mode === 'EXISTING_FARM' && 'Enter ongoing agricultural plot parameters and existing crop zones.'}
                {mode === 'PLANNING_NEW_FARM' && 'Multi-crop matching, AI acreage allocation, and variable zone sequential irrigation.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

          {/* ==================================================== */}
          {/* SCREEN 0: ASK THE USER'S INTENT FIRST               */}
          {/* ==================================================== */}
          {mode === 'SELECT_MODE' && (
            <div className="space-y-6 py-4 animate-in fade-in">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="font-display font-extrabold text-2xl text-white">
                  How would you like to set up your farm?
                </h3>
                <p className="text-xs text-slate-400 mt-1.5">
                  Select your scenario. Connect established field operations directly or generate a data-backed multi-crop plan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto pt-2">
                {/* Option A: Existing Farm */}
                <div
                  onClick={() => setMode('EXISTING_FARM')}
                  className="p-6 rounded-3xl bg-obsidian-850 border-2 border-farm-500/25 hover:border-farm-400 hover:bg-obsidian-800/90 cursor-pointer transition-all flex flex-col justify-between group shadow-glow-sm"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-farm-500/20 border border-farm-500/30 flex items-center justify-center text-farm-300 mb-4 group-hover:scale-110 transition-transform">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-farm-400 uppercase tracking-wider">Option A</div>
                    <h4 className="font-display font-black text-xl text-white mt-1">Existing Farm</h4>
                    <p className="text-xs text-slate-300 font-semibold mt-1">
                      "I already have crops / farm details"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Continue to farm setup and enter existing crop information without forcing crop recommendations.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-bold text-farm-400">
                    <span>Continue to Farm Setup</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Option B: Planning a New Farm */}
                <div
                  onClick={() => {
                    setMode('PLANNING_NEW_FARM');
                    setPlannerStep(1);
                  }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-obsidian-850 via-farm-950/40 to-obsidian-850 border-2 border-farm-500/50 hover:border-farm-300 hover:shadow-glow-md cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-farm-500 text-obsidian-950 flex items-center justify-center font-bold mb-4 group-hover:scale-110 transition-transform shadow-glow-sm">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-farm-300 uppercase tracking-wider">Option B (Guided)</div>
                    <h4 className="font-display font-black text-xl text-white mt-1">Planning a New Farm</h4>
                    <p className="text-xs text-farm-300 font-semibold mt-1">
                      "I want AGRIMIND AI to recommend crops, acreage allocation and irrigation zones."
                    </p>
                    <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                      Continue to the Guided Crop Planner for multi-crop selection, AI acreage allocation, variable zones, and sequential irrigation mapping.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-farm-500/20 flex items-center justify-between text-xs font-bold text-farm-300">
                    <span>Open Guided Crop Planner</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* OPTION A: EXISTING FARM FAST ENTRY FORM              */}
          {/* ==================================================== */}
          {mode === 'EXISTING_FARM' && (
            <form onSubmit={handleCreateExistingFarm} className="space-y-5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-display font-bold text-base text-white">Existing Farm Setup</h3>
                  <p className="text-slate-400 text-[11px]">Enter your existing crop and zone boundaries directly without forced recommendations.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('SELECT_MODE')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
              </div>

              {/* Farm Name */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Farm Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sree Rama Agri Farm"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                />
              </div>

              {/* State and District */}
              <StateDistrictSelector
                selectedState={state}
                selectedDistrict={district}
                onStateChange={setState}
                onDistrictChange={setDistrict}
              />

              {/* Village, Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Village / City</label>
                  <input
                    type="text"
                    value={villageCity}
                    onChange={(e) => setVillageCity(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Total Area (Acres)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(parseFloat(e.target.value) || 1.0)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  />
                </div>
              </div>

              {/* Soil & Water */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Soil Type</label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="Sandy Clay Loam">Sandy Clay Loam</option>
                    <option value="Black Cotton (Regur)">Black Cotton (Regur)</option>
                    <option value="Red Sandy Loam">Red Sandy Loam</option>
                    <option value="Alluvial Loam">Alluvial Loam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Irrigation Method</label>
                  <select
                    value={irrigationMethod}
                    onChange={(e) => setIrrigationMethod(e.target.value as any)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Sprinkler">Sprinkler</option>
                    <option value="Flood">Flood Irrigation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Current Season</label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value as any)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="Kharif">Kharif (Monsoon)</option>
                    <option value="Rabi">Rabi (Winter)</option>
                    <option value="Zaid">Zaid (Summer)</option>
                    <option value="Perennial">Perennial</option>
                  </select>
                </div>
              </div>

              {/* Existing Zones Configuration (1 to 10 zones) */}
              <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">Configured Irrigation Zones</span>
                    <p className="text-[11px] text-slate-400">Map your existing field boundaries and crops.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Zones:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const n = Math.max(1, existingNumZones - 1);
                        setExistingNumZones(n);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-white text-xs">{existingNumZones}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const n = Math.min(10, existingNumZones + 1);
                        setExistingNumZones(n);
                        if (n > existingZones.length) {
                          setExistingZones(prev => [
                            ...prev,
                            {
                              zone_number: n,
                              name: `Zone ${n} - Field Plot`,
                              crop_name: currentCrop,
                              area_acres: Math.round((areaAcres / n) * 10) / 10,
                              target_moisture: 48,
                              pump_status: false,
                              pump_number: n,
                              priority: 'Medium',
                              irrigation_mode: 'AUTO'
                            }
                          ]);
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {existingZones.slice(0, existingNumZones).map((z, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-obsidian-900 border border-slate-800 items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Zone Name</span>
                        <input
                          type="text"
                          value={z.name}
                          onChange={(e) => {
                            const updated = [...existingZones];
                            updated[idx].name = e.target.value;
                            setExistingZones(updated);
                          }}
                          className="w-full bg-transparent border-b border-slate-700 text-white text-xs py-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Active Crop</span>
                        <input
                          type="text"
                          value={z.crop_name}
                          onChange={(e) => {
                            const updated = [...existingZones];
                            updated[idx].crop_name = e.target.value;
                            setExistingZones(updated);
                          }}
                          className="w-full bg-transparent border-b border-slate-700 text-white text-xs py-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Area (Acres)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={z.area_acres}
                          onChange={(e) => {
                            const updated = [...existingZones];
                            updated[idx].area_acres = parseFloat(e.target.value) || 1.0;
                            setExistingZones(updated);
                          }}
                          className="w-full bg-transparent border-b border-slate-700 text-white text-xs py-1 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Target Moisture ({z.target_moisture}%)</span>
                        <input
                          type="range"
                          min="30"
                          max="70"
                          value={z.target_moisture}
                          onChange={(e) => {
                            const updated = [...existingZones];
                            updated[idx].target_moisture = parseInt(e.target.value);
                            setExistingZones(updated);
                          }}
                          className="w-full accent-farm-400 mt-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SELECT_MODE')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black shadow-glow-sm transition-all"
                >
                  {isSubmitting ? 'Saving to Supabase...' : 'Save & Connect Farm'}
                </button>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* OPTION B: GUIDED CROP PLANNER (STEPS 1 TO 9)         */}
          {/* ==================================================== */}
          {mode === 'PLANNING_NEW_FARM' && (
            <div className="space-y-6 text-xs animate-in fade-in">
              {/* Progress Bar & Steps Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-farm-400">
                    Step {plannerStep} of 9: {
                      plannerStep === 1 ? 'Farm Location & Acreage' :
                      plannerStep === 2 ? 'Soil & Water Conditions' :
                      plannerStep === 3 ? 'Season Selection' :
                      plannerStep === 4 ? 'Select Multiple Crops' :
                      plannerStep === 5 ? 'AI Farm Area Allocation' :
                      plannerStep === 6 ? 'Irrigation Zones & Crop Mapping' :
                      plannerStep === 7 ? 'Zone Configuration & Irrigation Plan' :
                      plannerStep === 8 ? 'Final Review' : 'Create Farm'
                    }
                  </span>
                  <span className="text-slate-400">{Math.round((plannerStep / 9) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-farm-400 transition-all duration-300 rounded-full"
                    style={{ width: `${(plannerStep / 9) * 100}%` }}
                  />
                </div>

                {/* Step navigation breadcrumbs */}
                <div className="hidden sm:flex justify-between text-[10px] text-slate-400 pt-1 overflow-x-auto">
                  {[
                    'Location', 
                    'Conditions', 
                    'Season', 
                    'Select Crops', 
                    'Allocate Acres', 
                    'Zones Setup', 
                    'Configure Irrigation', 
                    'Review Plan', 
                    'Finish'
                  ].map((st, idx) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPlannerStep(idx + 1)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        plannerStep === idx + 1 
                          ? 'text-farm-300 font-bold bg-farm-500/15' 
                          : plannerStep > idx + 1
                          ? 'text-slate-300 hover:text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {idx + 1}. {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* STEP 1: Location & Acreage                           */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Step 1: Farm Location & Boundaries</h3>
                    <p className="text-slate-400 text-[11px]">Pinpoint your agricultural land for regional weather and soil classification.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Farm Name</label>
                      <input
                        type="text"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                      />
                    </div>

                    <StateDistrictSelector
                      selectedState={state}
                      selectedDistrict={district}
                      onStateChange={setState}
                      onDistrictChange={setDistrict}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Village / City</label>
                        <input
                          type="text"
                          value={villageCity}
                          onChange={(e) => setVillageCity(e.target.value)}
                          className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Total Farm Area (Acres)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={areaAcres}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            setAreaAcres(val);
                          }}
                          className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">GPS Coordinate Pin</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={gpsCoordinates}
                          onChange={(e) => setGpsCoordinates(e.target.value)}
                          className="flex-1 bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setGpsCoordinates('16.23° N, 77.80° E (Gadwal Basin)')}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5 text-farm-400" />
                          <span>Detect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 2: Soil & Water Conditions                      */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Step 2: Soil Chemistry & Water Profile</h3>
                    <p className="text-slate-400 text-[11px]">Calibrate physical drainage and aquifer capacity.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Soil Texture Classification</label>
                      <select
                        value={soilType}
                        onChange={(e) => setSoilType(e.target.value)}
                        className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                      >
                        <option value="Sandy Clay Loam">Sandy Clay Loam (Telangana Basin)</option>
                        <option value="Black Cotton (Regur)">Deep Black Cotton (Regur)</option>
                        <option value="Red Sandy Loam">Red Sandy Loam (Chalka)</option>
                        <option value="Alluvial Loam">Alluvial Silt Loam</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-400 font-medium">Soil pH Level: {soilPh}</label>
                        <span className="text-[10px] text-farm-400 font-bold">
                          {soilPh < 6.0 ? 'Acidic' : soilPh > 7.5 ? 'Alkaline' : 'Optimal Neutral Range'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4.5"
                        max="8.5"
                        step="0.1"
                        value={soilPh}
                        onChange={(e) => setSoilPh(parseFloat(e.target.value))}
                        className="w-full accent-farm-400 mt-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Water Supply Capacity</label>
                      <select
                        value={waterAvailability}
                        onChange={(e) => setWaterAvailability(e.target.value as any)}
                        className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                      >
                        <option value="High">High (Perennial Borewell / River Lift)</option>
                        <option value="Medium">Medium (Seasonal Well / Rainfed Canal)</option>
                        <option value="Low">Low (Restricted Scarcity / Deep Bore)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Irrigation Delivery Infrastructure</label>
                      <select
                        value={irrigationMethod}
                        onChange={(e) => setIrrigationMethod(e.target.value as any)}
                        className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                      >
                        <option value="Drip">Precision Drip Emitters (~90% Efficiency)</option>
                        <option value="Sprinkler">Micro-Sprinkler (~75% Efficiency)</option>
                        <option value="Flood">Surface Furrow / Flood (~50% Efficiency)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Microclimate & Agro-Ecological Context</label>
                    <textarea
                      rows={2}
                      value={microclimateNotes}
                      onChange={(e) => setMicroclimateNotes(e.target.value)}
                      className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                    />
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 3: Season Selection                             */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Step 3: Agricultural Cropping Season</h3>
                    <p className="text-slate-400 text-[11px]">Select your upcoming planting calendar.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'Kharif', name: 'Kharif Season', months: 'June – October (Monsoon)', desc: 'Optimal for rice, cotton, pulses, and groundnut.' },
                      { id: 'Rabi', name: 'Rabi Season', months: 'October – March (Winter)', desc: 'Ideal for tomato, wheat, groundnut, and vegetables.' },
                      { id: 'Zaid', name: 'Zaid Season', months: 'March – June (Summer)', desc: 'Fallow window suited for fast melons, gourds, and fodder.' },
                      { id: 'Perennial', name: 'Perennial / Orchards', months: 'Year-round plantation', desc: 'Long-term fruit orchards with drip line fertigation.' }
                    ].map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSeason(s.id as any)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          season === s.id
                            ? 'bg-farm-500/20 border-farm-400 shadow-glow-sm'
                            : 'bg-obsidian-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Calendar className={`w-5 h-5 mt-0.5 ${season === s.id ? 'text-farm-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display font-bold text-sm text-white">{s.name}</h4>
                            {season === s.id && (
                              <span className="text-[10px] font-bold text-farm-300 bg-farm-500/20 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-farm-400 block">{s.months}</span>
                          <p className="text-[11px] text-slate-400 mt-1">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 4: SELECT MULTIPLE CROPS (1, 2, 3, or more)     */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-white">Step 4: Select Crops for Your Farm</h3>
                      <p className="text-slate-400 text-[11px]">
                        Select 1, 2, 3, or more crops across your {areaAcres}-acre farm. AGRIMIND AI will allocate acreage and zones in the next step.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      Estimated / Reference Value
                    </span>
                  </div>

                  {/* Selected Crops Counter Bar */}
                  <div className="p-3 rounded-2xl bg-obsidian-950 border border-farm-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-farm-400" />
                      <span className="font-bold text-white text-xs">
                        Selected Crops: <span className="text-farm-400 font-mono">{selectedCropIds.length}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        ({selectedCrops.map(c => c.name.split(' ')[0]).join(' + ')})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        applyAiRecommendation();
                        setPlannerStep(5);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-xs shadow-glow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>Continue with Selected Crops</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Crop Cards Grid with Checkbox Select */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableCrops.map((c) => {
                      const isChecked = selectedCropIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleCropSelection(c.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isChecked
                              ? 'bg-farm-500/15 border-farm-400 shadow-glow-sm'
                              : 'bg-obsidian-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {/* Checkbox Header */}
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                  isChecked 
                                    ? 'bg-farm-500 border-farm-400 text-obsidian-950' 
                                    : 'border-slate-600 bg-obsidian-900'
                                }`}>
                                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-farm-400">{c.category}</span>
                                  <h4 className="font-display font-bold text-sm text-white">{c.name}</h4>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {c.duration_days} Days
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 line-clamp-2 mt-1">{c.description}</p>

                            <div className="grid grid-cols-3 gap-2 my-2.5 text-center text-[10px]">
                              <div className="p-1.5 rounded-lg bg-obsidian-900 border border-slate-800">
                                <span className="text-slate-500 block">Est. Yield</span>
                                <strong className="text-slate-200">{c.expected_yield_per_acre}</strong>
                              </div>
                              <div className="p-1.5 rounded-lg bg-obsidian-900 border border-slate-800">
                                <span className="text-slate-500 block">Water Need</span>
                                <strong className="text-sky-300">{c.water_requirement}</strong>
                              </div>
                              <div className="p-1.5 rounded-lg bg-obsidian-900 border border-slate-800">
                                <span className="text-slate-500 block">Risk Profile</span>
                                <strong className="text-amber-300">{c.risk_level}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              Ref. Net Margin: <strong className="text-farm-400">₹{(c.est_profit_per_acre / 1000).toFixed(0)}k/Acre</strong>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                              isChecked ? 'bg-farm-500 text-obsidian-950' : 'text-slate-400'
                            }`}>
                              {isChecked ? '✓ Selected' : '[ ] Select Crop'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-500 italic text-center">
                    *Reference agronomic estimates based on typical regional package of practices. Actual yields vary with seed quality and micro-weather.
                  </p>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 5: DEDICATED AI FARM AREA ALLOCATION            */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 5 && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-white">Step 5: AI Farm Area Allocation</h3>
                      <p className="text-slate-400 text-[11px]">
                        Distribute your {areaAcres} total farm acres across your selected crop mix.
                      </p>
                    </div>

                    {/* Mode Status Pill */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                        !isCustomAllocation 
                          ? 'bg-farm-500/20 text-farm-300 border-farm-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {!isCustomAllocation ? '✨ AGRIMIND AI Recommendation' : '✏️ Custom Farm Plan'}
                      </span>
                    </div>
                  </div>

                  {/* AI Recommendation Reasoning Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-farm-950/50 via-obsidian-950 to-obsidian-950 border border-farm-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-farm-400" />
                        <span className="font-bold text-white text-xs uppercase tracking-wider">
                          AGRIMIND AI RECOMMENDATION
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={applyAiRecommendation}
                          className="px-3 py-1 rounded-lg bg-farm-500/20 hover:bg-farm-500 text-farm-300 hover:text-obsidian-950 border border-farm-500/30 text-[10px] font-bold transition-all"
                        >
                          Use AI Recommendation
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCustomAllocation(true)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-all"
                        >
                          Customize Allocation
                        </button>
                      </div>
                    </div>

                    {/* Recommended Mix Summary */}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
                      <span className="text-slate-400">Recommended Crop Mix:</span>
                      {aiAllocationResult.allocations.map((a, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-md bg-obsidian-900 border border-farm-500/20 text-farm-300">
                          {a.crop_name.split(' ')[0]} — {a.area_acres} acres ({a.percentage}%)
                        </span>
                      ))}
                    </div>

                    {/* Why this allocation? */}
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <span className="font-bold text-white text-xs block mb-1">Why this allocation?</span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-400">
                        {aiAllocationResult.reasoning.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-farm-400 shrink-0">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Farm Area Allocation Sliders & Adjusters */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-sm">Total Farm Area:</span>
                        <span className="font-mono font-black text-base text-farm-400">{areaAcres} acres</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">Total Allocated: </span>
                          <strong className={`font-mono ${totalAllocatedAcreage > areaAcres ? 'text-rose-400' : 'text-white'}`}>
                            {totalAllocatedAcreage} / {areaAcres} acres
                          </strong>
                        </div>
                        <div className="px-2.5 py-0.5 rounded-lg bg-obsidian-900 border border-slate-700">
                          <span className="text-slate-400">Remaining: </span>
                          <strong className={`font-mono ${remainingAcreage < 0 ? 'text-rose-400' : 'text-teal-400'}`}>
                            {remainingAcreage} acres
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Warning if over allocated */}
                    {totalAllocatedAcreage > areaAcres && (
                      <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>Allocated area ({totalAllocatedAcreage} ac) exceeds Total Farm Area ({areaAcres} ac). Adjust acreage downwards before proceeding.</span>
                      </div>
                    )}

                    {/* Per Crop Adjuster Cards */}
                    <div className="space-y-3">
                      {selectedCrops.map((crop) => {
                        const currentAcres = cropAcreageMap[crop.id] || (Math.round((areaAcres / selectedCrops.length) * 10) / 10);
                        const pct = areaAcres > 0 ? Math.round((currentAcres / areaAcres) * 100) : 0;
                        const waterReq = aiService.calculateCropWaterRequirement(crop.name, currentAcres, irrigationMethod);

                        return (
                          <div key={crop.id} className="p-3.5 rounded-xl bg-obsidian-900 border border-slate-800 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h4 className="font-display font-bold text-white text-sm">{crop.name}</h4>
                                <span className="text-[10px] text-slate-400">
                                  {crop.category} • Duration: {crop.duration_days} Days • Water: {crop.water_requirement}
                                </span>
                              </div>

                              {/* Manual Adjuster Controls [-] N [+] */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">Adjust Area:</span>
                                <div className="flex items-center bg-obsidian-950 border border-slate-700 rounded-xl p-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustAcreage(crop.id, -1.0)}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-16 text-center font-mono font-bold text-white text-xs">
                                    {currentAcres} ac
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustAcreage(crop.id, 1.0)}
                                    disabled={totalAllocatedAcreage >= areaAcres}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-xs font-mono font-bold text-farm-400 w-12 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </div>

                            {/* Metrics Strip for this Crop */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                              <div>
                                <span className="text-slate-500 block">Acreage</span>
                                <strong className="text-white">{currentAcres} Acres</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Est. Daily Water</span>
                                <strong className="text-sky-300">{waterReq.dailyLiters.toLocaleString()} L/day*</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Est. Revenue</span>
                                <strong className="text-slate-200">₹{Math.round(crop.est_revenue_per_acre * currentAcres).toLocaleString()}*</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Est. Net Margin</span>
                                <strong className="text-farm-400">₹{Math.round(crop.est_profit_per_acre * currentAcres).toLocaleString()}*</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Combined Economics & What-If Simulator */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Combined Multi-Crop Financial Projections ({areaAcres} Acres)
                      </span>
                      <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Estimated / Reference Value
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Investment</span>
                        <strong className="text-white text-sm font-display mt-0.5 block">₹{Math.round(combinedInvestment).toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected Revenue</span>
                        <strong className="text-sky-300 text-sm font-display mt-0.5 block">₹{Math.round(combinedRevenue).toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-farm-500/10 border border-farm-500/30">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Margin</span>
                        <strong className="text-farm-400 text-sm font-display mt-0.5 block">₹{Math.round(combinedProfit).toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated ROI</span>
                        <strong className="text-teal-300 text-sm font-display mt-0.5 block">{combinedRoi}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 6: VARIABLE NUMBER OF ZONES (1 TO 10)           */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 6 && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-white">Step 6: Irrigation Zones & Crop Mapping</h3>
                      <p className="text-slate-400 text-[11px]">
                        Choose the number of irrigation zones (1 to 10). AGRIMIND AI dynamically distributes crops across zone boundaries.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      Sequential Actuator Map
                    </span>
                  </div>

                  {/* Variable Number of Zones Setting [-] N [+] */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-farm-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-white text-sm block">Irrigation Zones Setting</span>
                      <p className="text-[11px] text-slate-400">
                        Choose between 1 and 10 zones. Total zone area must equal total farm area ({areaAcres} acres).
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 font-semibold">Irrigation Zones:</span>
                      <div className="flex items-center bg-obsidian-900 border border-slate-700 rounded-2xl p-1">
                        <button
                          type="button"
                          onClick={() => handleNumZonesChange(numPlannerZones - 1)}
                          disabled={numPlannerZones <= 1}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-mono font-black text-base text-white">
                          {numPlannerZones}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleNumZonesChange(numPlannerZones + 1)}
                          disabled={numPlannerZones >= 10}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI Suggested Zone Mapping */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">AI Suggested Zone Mapping (Editable):</span>
                      <span className={`text-[11px] font-mono ${totalZoneAcreage === areaAcres ? 'text-teal-400' : 'text-amber-400'}`}>
                        Zone Area Sum: {totalZoneAcreage} / {areaAcres} acres
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {plannerZones.slice(0, numPlannerZones).map((z, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-farm-400 uppercase tracking-wider">
                              ZONE {z.zone_number}
                            </span>
                            <span className="text-[10px] font-bold text-sky-400">
                              Pump #{z.pump_number || idx + 1}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block font-medium">Zone Name</label>
                              <input
                                type="text"
                                value={z.name}
                                onChange={(e) => {
                                  const updated = [...plannerZones];
                                  updated[idx].name = e.target.value;
                                  setPlannerZones(updated);
                                }}
                                className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block font-medium">Assigned Crop</label>
                                <select
                                  value={z.crop_name}
                                  onChange={(e) => {
                                    const updated = [...plannerZones];
                                    updated[idx].crop_name = e.target.value;
                                    setPlannerZones(updated);
                                  }}
                                  className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                                >
                                  {selectedCrops.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block font-medium">Area (Acres)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.1"
                                  value={z.area_acres}
                                  onChange={(e) => {
                                    const updated = [...plannerZones];
                                    updated[idx].area_acres = parseFloat(e.target.value) || 0.5;
                                    setPlannerZones(updated);
                                  }}
                                  className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                              <span>Target: <strong className="text-white">{z.target_moisture}%</strong></span>
                              <span>Est. Water: <strong className="text-sky-300">{z.estimated_daily_liters?.toLocaleString()} L/day*</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 7: ZONE CONFIGURATION & IRRIGATION PLAN         */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 7 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Step 7: Sequential Zone Configuration & Irrigation Plan</h3>
                    <p className="text-slate-400 text-[11px]">
                      Configure individual relay channels, target soil moisture, and sequential priority.
                    </p>
                  </div>

                  {/* Hardware constraint and Single Flow Sensor Notice */}
                  <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 space-y-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Cpu className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-sky-200">Prototype Hardware Notice:</strong>
                        <p className="text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                          Prototype hardware supports 3 physical pump channels and a single YF-S201 flow sensor.
                          Sequential zone irrigation: only one zone operates at a time so water flow can be associated with the active zone.
                        </p>
                      </div>
                    </div>
                    {numPlannerZones > 3 && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          You have {numPlannerZones} zones configured. Zones 1–3 use physical relay channels; zones 4–10 are scheduled as logical channels on the prototype hardware.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detailed Zone Parameters */}
                  <div className="space-y-3">
                    <span className="font-bold text-white text-xs">Zone Actuator Parameters:</span>
                    <div className="space-y-2.5">
                      {plannerZones.slice(0, numPlannerZones).map((z, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-obsidian-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-6 gap-3 items-center">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-400 block font-medium">Zone & Crop</span>
                            <strong className="text-white text-xs block truncate">{z.name}</strong>
                            <span className="text-[10px] text-farm-400">{z.crop_name} • {z.area_acres} Acres</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Target Moisture</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="number"
                                min="30"
                                max="70"
                                value={z.target_moisture}
                                onChange={(e) => {
                                  const updated = [...plannerZones];
                                  updated[idx].target_moisture = parseInt(e.target.value) || 50;
                                  setPlannerZones(updated);
                                }}
                                className="w-14 bg-obsidian-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                              />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Pump Channel</span>
                            <select
                              value={z.pump_number || idx + 1}
                              onChange={(e) => {
                                const updated = [...plannerZones];
                                updated[idx].pump_number = parseInt(e.target.value);
                                setPlannerZones(updated);
                              }}
                              className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                            >
                              <option value={1}>Pump 1 (Physical)</option>
                              <option value={2}>Pump 2 (Physical)</option>
                              <option value={3}>Pump 3 (Physical)</option>
                              {Array.from({ length: 7 }, (_, i) => i + 4).map(p => (
                                <option key={p} value={p}>Pump {p} (Logical)</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Priority</span>
                            <select
                              value={z.priority || 'Medium'}
                              onChange={(e) => {
                                const updated = [...plannerZones];
                                updated[idx].priority = e.target.value as any;
                                setPlannerZones(updated);
                              }}
                              className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Mode</span>
                            <select
                              value={z.irrigation_mode || 'AUTO'}
                              onChange={(e) => {
                                const updated = [...plannerZones];
                                updated[idx].irrigation_mode = e.target.value as any;
                                setPlannerZones(updated);
                              }}
                              className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold text-farm-300"
                            >
                              <option value="AUTO">AUTO</option>
                              <option value="MANUAL">MANUAL</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated Irrigation Plan Table */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-3">
                    <span className="font-bold text-white text-xs block">Automated Irrigation Execution Plan:</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                            <th className="pb-2">Zone</th>
                            <th className="pb-2">Crop</th>
                            <th className="pb-2">Area</th>
                            <th className="pb-2">Target</th>
                            <th className="pb-2">Pump</th>
                            <th className="pb-2">Priority</th>
                            <th className="pb-2 text-right">Est. Daily Water*</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {plannerZones.slice(0, numPlannerZones).map((z) => (
                            <tr key={z.zone_number} className="text-slate-300">
                              <td className="py-2 font-bold text-white">{z.name}</td>
                              <td className="py-2">{z.crop_name}</td>
                              <td className="py-2 font-mono">{z.area_acres} ac</td>
                              <td className="py-2 text-sky-400 font-mono">{z.target_moisture}%</td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  (z.pump_number || z.zone_number) <= 3 
                                    ? 'bg-farm-500/20 text-farm-300' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  Pump #{z.pump_number || z.zone_number}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  z.priority === 'High' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {z.priority || 'Medium'}
                                </span>
                              </td>
                              <td className="py-2 font-mono text-right text-sky-300">
                                {z.estimated_daily_liters?.toLocaleString() || Math.round(z.area_acres * 3000).toLocaleString()} L/day
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 8: FINAL REVIEW SCREEN                          */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 8 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Step 8: Final Farm Plan Summary & Review</h3>
                    <p className="text-slate-400 text-[11px]">Verify multi-crop allocation and zone sequencing before creating farm in Supabase.</p>
                  </div>

                  {/* Section A: Farm Plan Details */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-farm-400 tracking-wider block">FARM PLAN</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Farm Identity</span>
                        <strong className="text-white block">{farmName}</strong>
                        <span className="text-slate-400 text-[11px]">{villageCity}, {district}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Farm Area</span>
                        <strong className="text-farm-400 text-sm font-mono block">{areaAcres} Acres</strong>
                        <span className="text-slate-400 text-[11px]">Total Plot Boundary</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Soil Profile</span>
                        <strong className="text-white block">{soilType}</strong>
                        <span className="text-teal-400 text-[11px]">pH {soilPh}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Season & Irrigation</span>
                        <strong className="text-white block">{season} Season</strong>
                        <span className="text-sky-300 text-[11px]">{irrigationMethod} Irrigation</span>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Selected Crops Allocation */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-farm-400 tracking-wider block">SELECTED CROPS</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {cropAllocationsList.map((c, i) => (
                        <div key={i} className="p-3 rounded-xl bg-obsidian-900 border border-slate-800">
                          <h4 className="font-display font-bold text-white text-xs">{c.crop_name}</h4>
                          <div className="flex justify-between items-center text-xs mt-1">
                            <span className="font-mono text-farm-300 font-bold">{c.area_acres} Acres</span>
                            <span className="font-mono text-slate-400 font-bold">{c.percentage}%</span>
                          </div>
                          <div className="text-[10px] text-slate-400 pt-1 mt-1 border-t border-slate-800 flex justify-between">
                            <span>Daily Water:</span>
                            <span className="text-sky-300 font-mono">{c.estimated_daily_liters?.toLocaleString()} L/day*</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section C: Irrigation Zones */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-farm-400 tracking-wider block">
                      IRRIGATION ZONES ({numPlannerZones} Zones)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {plannerZones.slice(0, numPlannerZones).map((z) => (
                        <div key={z.zone_number} className="p-2.5 rounded-xl bg-obsidian-900 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <strong className="text-white block">{z.name}</strong>
                            <span className="text-[11px] text-slate-400">{z.crop_name} • {z.area_acres} ac • Target: {z.target_moisture}%</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-sky-400 block">Pump #{z.pump_number || z.zone_number}</span>
                            <span className="text-[10px] text-farm-300 font-semibold">{z.irrigation_mode || 'AUTO'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section D: AI Recommendation Reasoning */}
                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-farm-500/20 space-y-1.5 text-[11px]">
                    <span className="font-bold text-white text-xs uppercase tracking-wider block mb-1">
                      AI RECOMMENDATION REASONING
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-300">
                      {aiAllocationResult.reasoning.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-farm-400 shrink-0">✓</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 9: CONFIRMATION & CREATE FARM                   */}
              {/* ---------------------------------------------------- */}
              {plannerStep === 9 && (
                <div className="space-y-5 text-center py-6 animate-in fade-in">
                  <div className="w-16 h-16 rounded-3xl bg-farm-500/20 border border-farm-500/40 text-farm-400 flex items-center justify-center mx-auto shadow-glow-sm">
                    <Sprout className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="font-display font-extrabold text-2xl text-white">Ready to Initialize Farm Plan</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Click below to persist your multi-crop farm plot, acreage allocations, and sequential irrigation zones into Supabase.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-400">Farm Name:</span>
                      <strong className="text-white">{farmName} ({areaAcres} Acres)</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-400">Configured Crop Mix:</span>
                      <strong className="text-farm-400">
                        {cropAllocationsList.map(c => `${c.crop_name.split(' ')[0]} (${c.area_acres}ac)`).join(' + ')}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-400">Irrigation Zones:</span>
                      <strong className="text-sky-300">{numPlannerZones} Sequential Actuator Zones</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Telemetry Sensor:</span>
                      <span className="text-slate-300">Single YF-S201 Inline Flow Meter</span>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleCreatePlannedFarm}
                      className="px-8 py-3 rounded-2xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-sm shadow-glow-md transition-all inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isSubmitting ? 'Creating Farm in Supabase...' : 'CREATE FARM NOW'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (plannerStep === 1) {
                      setMode('SELECT_MODE');
                    } else {
                      setPlannerStep(plannerStep - 1);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{plannerStep === 1 ? 'Back to Choice' : 'Back'}</span>
                </button>

                {plannerStep < 9 && (
                  <button
                    type="button"
                    disabled={
                      (plannerStep === 4 && selectedCropIds.length === 0) ||
                      (plannerStep === 5 && totalAllocatedAcreage > areaAcres)
                    }
                    onClick={() => {
                      if (plannerStep === 4) {
                        applyAiRecommendation();
                      }
                      setPlannerStep(plannerStep + 1);
                    }}
                    className="px-5 py-2 rounded-xl bg-farm-500 hover:bg-farm-400 disabled:opacity-40 text-obsidian-950 font-black text-xs shadow-glow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>{plannerStep === 8 ? 'Proceed to Confirmation' : 'Continue'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
