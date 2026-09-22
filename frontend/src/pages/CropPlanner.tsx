import React, { useState, useMemo } from 'react';
import { 
  Sprout, 
  CheckCircle2, 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sliders,
  Check,
  Minus,
  Plus,
  Layers,
  Droplets,
  Cpu,
  Info
} from 'lucide-react';
import { Farm, Crop, Zone, CropAllocation } from '../types';
import { aiService, CropPlannerCriteria } from '../services/aiService';
import { dataService } from '../services/dataService';

interface CropPlannerProps {
  farm: Farm;
}

export const CropPlanner: React.FC<CropPlannerProps> = ({ farm }) => {
  // Wizard State (Steps 1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [season, setSeason] = useState<'Kharif' | 'Rabi' | 'Zaid' | 'Perennial'>(farm.season || 'Rabi');
  const [soilType, setSoilType] = useState<string>(farm.soil_type || 'Sandy Clay Loam');
  const [soilPh, setSoilPh] = useState<number>(farm.soil_ph || 6.5);
  const [waterAvailability, setWaterAvailability] = useState<'High' | 'Medium' | 'Low'>(farm.water_availability || 'Medium');
  const [irrigationMethod, setIrrigationMethod] = useState<'Drip' | 'Sprinkler' | 'Flood'>(farm.irrigation_method || 'Drip');
  const [farmArea, setFarmArea] = useState<number>(farm.area_acres || 20.0);

  // Recommendations result
  const [recommendedCrops, setRecommendedCrops] = useState<Crop[]>(() => {
    return aiService.recommendCrops({
      farmId: farm.id,
      season: farm.season || 'Rabi',
      soilType: farm.soil_type || 'Sandy Clay Loam',
      soilPh: farm.soil_ph || 6.5,
      waterAvailability: farm.water_availability || 'Medium',
      irrigationMethod: farm.irrigation_method || 'Drip',
      areaAcres: farm.area_acres || 20.0
    });
  });

  // Step 4: Multi-crop selection (1, 2, 3 or more crops)
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>(() => {
    if (farm.crops_allocation && farm.crops_allocation.length > 0) {
      const matchIds = recommendedCrops
        .filter(c => farm.crops_allocation?.some(a => a.crop_name.includes(c.name.split(' ')[0])))
        .map(c => c.id);
      if (matchIds.length > 0) return matchIds;
    }
    return recommendedCrops.slice(0, 3).map(c => c.id);
  });

  const selectedCrops: Crop[] = useMemo(() => {
    const list = recommendedCrops.filter(c => selectedCropIds.includes(c.id));
    return list.length > 0 ? list : [recommendedCrops[0]];
  }, [recommendedCrops, selectedCropIds]);

  const toggleCropSelection = (cropId: string) => {
    setSelectedCropIds(prev => {
      if (prev.includes(cropId)) {
        if (prev.length === 1) return prev; // retain at least one
        return prev.filter(id => id !== cropId);
      } else {
        return [...prev, cropId];
      }
    });
  };

  // Step 5: Crop Acreage Allocation State
  const [cropAcreageMap, setCropAcreageMap] = useState<Record<string, number>>(() => {
    if (farm.crops_allocation && farm.crops_allocation.length > 0) {
      const map: Record<string, number> = {};
      farm.crops_allocation.forEach(a => {
        const match = recommendedCrops.find(c => c.name.includes(a.crop_name.split(' ')[0]));
        if (match) map[match.id] = a.area_acres;
      });
      if (Object.keys(map).length > 0) return map;
    }
    // Default 20 acres split 8, 7, 5
    return {
      [recommendedCrops[0]?.id || '1']: 8.0,
      [recommendedCrops[1]?.id || '2']: 7.0,
      [recommendedCrops[2]?.id || '3']: 5.0
    };
  });
  const [isCustomAllocation, setIsCustomAllocation] = useState<boolean>(false);

  // Profit/Loss What-If Sensitivity Modifiers
  const [yieldModifierPercent, setYieldModifierPercent] = useState<number>(0);
  const [priceModifierPercent, setPriceModifierPercent] = useState<number>(0);

  // Plan applied notification
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Compute AI Recommended Allocation
  const aiAllocationResult = useMemo(() => {
    return aiService.recommendCropAllocation({
      farmId: farm.id,
      season,
      soilType,
      soilPh,
      waterAvailability,
      irrigationMethod,
      areaAcres: farmArea,
      state: farm.state,
      district: farm.district
    }, selectedCrops);
  }, [farm, season, soilType, soilPh, waterAvailability, irrigationMethod, farmArea, selectedCrops]);

  // Apply AI Recommendation
  const applyAiRecommendation = () => {
    const newMap: Record<string, number> = {};
    aiAllocationResult.allocations.forEach(a => {
      const match = recommendedCrops.find(c => c.name === a.crop_name);
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
    const maxAllowed = Math.max(0.5, Math.round((farmArea - otherTotal) * 10) / 10);
    const clamped = Math.max(0.5, Math.min(maxAllowed, rounded));

    setCropAcreageMap(prev => ({
      ...prev,
      [cropId]: clamped
    }));
    setIsCustomAllocation(true);
  };

  const handleAdjustAcreage = (cropId: string, delta: number) => {
    const current = cropAcreageMap[cropId] || (Math.round((farmArea / selectedCrops.length) * 10) / 10);
    handleAcreageChange(cropId, current + delta);
  };

  // Total Allocated and Remaining Acreage
  const totalAllocatedAcreage = useMemo(() => {
    const sum = selectedCrops.reduce((s, c) => s + (cropAcreageMap[c.id] || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [selectedCrops, cropAcreageMap]);

  const remainingAcreage = useMemo(() => {
    return Math.round((farmArea - totalAllocatedAcreage) * 10) / 10;
  }, [farmArea, totalAllocatedAcreage]);

  // List of Crop Allocations with water and economics
  const cropAllocationsList: CropAllocation[] = useMemo(() => {
    return selectedCrops.map(crop => {
      const acres = cropAcreageMap[crop.id] || (Math.round((farmArea / selectedCrops.length) * 10) / 10);
      const percentage = farmArea > 0 ? Math.round((acres / farmArea) * 100) : 0;
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
  }, [selectedCrops, cropAcreageMap, farmArea, irrigationMethod]);

  // Variable Zones setup (1 to 10 zones)
  const [numZones, setNumZones] = useState<number>(() => {
    const currentZones = dataService.getZones(farm.id);
    return currentZones.length > 0 ? currentZones.length : 3;
  });

  const generatedZones = useMemo(() => {
    return aiService.generateZonesForCrops(farmArea, numZones, cropAllocationsList, irrigationMethod);
  }, [farmArea, numZones, cropAllocationsList, irrigationMethod]);

  // Multi-crop economics
  const combinedInvestment = useMemo(() => {
    return cropAllocationsList.reduce((sum, a) => {
      const match = recommendedCrops.find(c => c.name === a.crop_name);
      return sum + (match ? match.est_investment_per_acre * a.area_acres : 45000 * a.area_acres);
    }, 0);
  }, [cropAllocationsList, recommendedCrops]);

  const combinedRevenue = useMemo(() => {
    const base = cropAllocationsList.reduce((sum, a) => {
      const match = recommendedCrops.find(c => c.name === a.crop_name);
      return sum + (match ? match.est_revenue_per_acre * a.area_acres : 120000 * a.area_acres);
    }, 0);
    const withYieldMod = base * (1 + yieldModifierPercent / 100);
    return withYieldMod * (1 + priceModifierPercent / 100);
  }, [cropAllocationsList, recommendedCrops, yieldModifierPercent, priceModifierPercent]);

  const combinedProfit = useMemo(() => combinedRevenue - combinedInvestment, [combinedRevenue, combinedInvestment]);
  const combinedRoi = useMemo(() => combinedInvestment > 0 ? Math.round((combinedProfit / combinedInvestment) * 100) : 0, [combinedProfit, combinedInvestment]);

  // Recalculate recommendations
  const runCropRecommendation = () => {
    const criteria: CropPlannerCriteria = {
      farmId: farm.id,
      season,
      soilType,
      soilPh,
      waterAvailability,
      irrigationMethod,
      areaAcres: farmArea,
      state: farm.state,
      district: farm.district
    };
    const results = aiService.recommendCrops(criteria);
    setRecommendedCrops(results);
    setCurrentStep(6);
  };

  // Apply Plan to Active Farm
  const handleApplyToActiveFarm = async () => {
    const zonesToUpdate: Zone[] = generatedZones.map(z => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `zone-${z.zone_number}`,
      farm_id: farm.id,
      zone_number: z.zone_number,
      name: z.name,
      crop_name: z.crop_name,
      area_acres: z.area_acres,
      target_moisture: z.target_moisture,
      current_moisture: z.target_moisture - 4,
      pump_status: false,
      pump_number: z.pump_number,
      priority: z.priority,
      irrigation_mode: z.irrigation_mode,
      estimated_daily_liters: z.estimated_daily_liters,
      status: 'NORMAL'
    }));

    await dataService.updateFarmCropAllocationAndZones(farm.id, cropAllocationsList, zonesToUpdate);
    setAppliedNotice(`Multi-crop farm plan (${cropAllocationsList.map(c => `${c.crop_name.split(' ')[0]} ${c.area_acres}ac`).join(' + ')}) applied to ${farm.name}!`);
    setTimeout(() => setAppliedNotice(null), 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
            <Sprout className="w-6 h-6 text-farm-400" />
            <span>Guided Multi-Crop Planning & Acreage Allocation</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Multi-crop allocation, acreage adjustments, and sequential irrigation zoning for {farm.name}.
          </p>
        </div>
        <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
          ⚠️ All yield & economic figures are estimated / reference values.
        </div>
      </div>

      {appliedNotice && (
        <div className="p-4 rounded-2xl bg-farm-900/60 border border-farm-500/40 text-xs font-bold text-farm-300 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-farm-400 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* 6-Step Guided Workflow Container */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6 space-y-6">
        {/* Step Indicators */}
        <div className="flex items-center justify-between overflow-x-auto pb-4 border-b border-farm-500/10 gap-2">
          {[
            { num: 1, label: 'Farm Area' },
            { num: 2, label: 'Location' },
            { num: 3, label: 'Season' },
            { num: 4, label: 'Soil & pH' },
            { num: 5, label: 'Water & Method' },
            { num: 6, label: 'Crop Mix & Allocation' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                currentStep === s.num
                  ? 'bg-farm-500 text-obsidian-950 shadow-glow-sm'
                  : currentStep > s.num
                  ? 'bg-farm-500/20 text-farm-300'
                  : 'bg-obsidian-900 text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-obsidian-950/20 flex items-center justify-center text-[10px]">
                {s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="text-xs">
          {currentStep === 1 && (
            <div className="space-y-4 max-w-lg">
              <h4 className="font-display font-bold text-base text-white">Step 1: Farm Area Confirmation</h4>
              <p className="text-slate-400">Specify total acres available for multi-crop zone allocation.</p>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Farm Plot Area (Acres)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0.5"
                  value={farmArea} 
                  onChange={(e) => setFarmArea(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none font-mono font-bold"
                />
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-farm-500 text-obsidian-950 font-bold text-xs"
              >
                <span>Continue to Location</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 max-w-lg">
              <h4 className="font-display font-bold text-base text-white">Step 2: Location Profile</h4>
              <p className="text-slate-400">Using geographic parameters from selected farm: {farm.name}.</p>
              <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">State:</span>
                  <strong className="text-white">{farm.state}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">District:</span>
                  <strong className="text-white">{farm.district}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agro-climatic Basin:</span>
                  <strong className="text-farm-300">Southern Telangana Semi-Arid Deccan</strong>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-farm-500 text-obsidian-950 font-bold text-xs"
              >
                <span>Continue to Season</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 max-w-lg">
              <h4 className="font-display font-bold text-base text-white">Step 3: Planting Season</h4>
              <p className="text-slate-400">Select upcoming agricultural window.</p>
              <div className="grid grid-cols-2 gap-3">
                {(['Kharif', 'Rabi', 'Zaid', 'Perennial'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      season === s 
                        ? 'bg-farm-500/20 border-farm-400 text-farm-300' 
                        : 'bg-obsidian-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {s} Season
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-farm-500 text-obsidian-950 font-bold text-xs"
              >
                <span>Continue to Soil</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 max-w-lg">
              <h4 className="font-display font-bold text-base text-white">Step 4: Soil Chemistry & pH</h4>
              <p className="text-slate-400">Calibrate crop suitability for soil texture and pH acidity.</p>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Soil Texture Type</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Sandy Clay Loam">Sandy Clay Loam</option>
                  <option value="Black Cotton Soil">Black Cotton Soil (Regur)</option>
                  <option value="Red Sandy Loam">Red Sandy Loam</option>
                  <option value="Alluvial Loam">Alluvial Loam</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Soil pH ({soilPh})</label>
                <input
                  type="range"
                  min="4.5"
                  max="8.5"
                  step="0.1"
                  value={soilPh}
                  onChange={(e) => setSoilPh(parseFloat(e.target.value))}
                  className="w-full accent-farm-500"
                />
              </div>
              <button
                onClick={() => setCurrentStep(5)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-farm-500 text-obsidian-950 font-bold text-xs"
              >
                <span>Continue to Water & Method</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 max-w-lg">
              <h4 className="font-display font-bold text-base text-white">Step 5: Water Supply & Delivery</h4>
              <p className="text-slate-400">Available irrigation volume dictates crop drought risk factor.</p>
              <div className="grid grid-cols-3 gap-2">
                {(['High', 'Medium', 'Low'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWaterAvailability(w)}
                    className={`p-3 rounded-xl border font-bold text-center ${
                      waterAvailability === w 
                        ? 'bg-farm-500/20 border-farm-400 text-farm-300' 
                        : 'bg-obsidian-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {w} Supply
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Irrigation Method</label>
                <select
                  value={irrigationMethod}
                  onChange={(e) => setIrrigationMethod(e.target.value as any)}
                  className="w-full bg-obsidian-800 border border-farm-500/20 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Drip">Precision Drip Emitters (~90% Efficiency)</option>
                  <option value="Sprinkler">Micro-Sprinkler (~75% Efficiency)</option>
                  <option value="Flood">Surface Flood (~50% Efficiency)</option>
                </select>
              </div>

              <button
                onClick={runCropRecommendation}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-sm shadow-glow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Compute Agronomic Crop Options</span>
              </button>
            </div>
          )}

          {/* STEP 6: MULTI-CROP SELECTION & ACREAGE ALLOCATION */}
          {currentStep === 6 && (
            <div className="space-y-6">
              {/* Top Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-display font-bold text-base text-white">Multi-Crop Selection & AI Acreage Allocation</h4>
                  <p className="text-slate-400">Select candidate crops and fine-tune acreage distribution across {farmArea} acres.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                    !isCustomAllocation ? 'bg-farm-500/20 text-farm-300 border-farm-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {!isCustomAllocation ? '✨ AGRIMIND AI Recommendation' : '✏️ Custom Farm Plan'}
                  </span>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-farm-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Adjust Criteria</span>
                  </button>
                </div>
              </div>

              {/* Crop Cards Selection Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Select Crops (Selected: <strong className="text-farm-400">{selectedCropIds.length}</strong>):
                  </span>
                  <span className="text-[10px] text-slate-400">Click card or checkbox to select/unselect</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendedCrops.map((crop) => {
                    const isChecked = selectedCropIds.includes(crop.id);
                    return (
                      <div
                        key={crop.id}
                        onClick={() => toggleCropSelection(crop.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-farm-500/15 border-farm-400 shadow-glow-sm' 
                            : 'bg-obsidian-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isChecked ? 'bg-farm-500 border-farm-400 text-obsidian-950' : 'border-slate-600'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-display font-bold text-white text-sm">{crop.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {crop.risk_level}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mb-2 line-clamp-2">{crop.description}</p>

                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-800">
                          <div>
                            <span className="text-slate-500 block">Water Need</span>
                            <strong className="text-sky-300">{crop.water_requirement}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Est. Yield</span>
                            <strong className="text-slate-200">{crop.expected_yield_per_acre}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Farm Area Allocation Section */}
              <div className="p-5 rounded-2xl bg-obsidian-900 border border-farm-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-farm-400" />
                    <h4 className="font-display font-bold text-white text-sm">AI Farm Area Allocation</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyAiRecommendation}
                      className="px-3 py-1 rounded-lg bg-farm-500/20 hover:bg-farm-500 text-farm-300 hover:text-obsidian-950 border border-farm-500/30 text-[10px] font-bold"
                    >
                      Use AI Recommendation
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomAllocation(true)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                    >
                      Customize Allocation
                    </button>
                  </div>
                </div>

                {/* Acreage Summary Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Total Farm Area: </span>
                    <strong className="font-mono text-white text-sm">{farmArea} acres</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Allocated: </span>
                    <strong className={`font-mono text-sm ${totalAllocatedAcreage > farmArea ? 'text-rose-400' : 'text-farm-400'}`}>
                      {totalAllocatedAcreage} / {farmArea} acres
                    </strong>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-obsidian-950 border border-slate-800">
                    <span className="text-slate-400">Remaining: </span>
                    <strong className={`font-mono ${remainingAcreage < 0 ? 'text-rose-400' : 'text-teal-400'}`}>
                      {remainingAcreage} acres
                    </strong>
                  </div>
                </div>

                {/* Allocation Controls */}
                <div className="space-y-3 pt-2">
                  {selectedCrops.map((crop) => {
                    const currentAcres = cropAcreageMap[crop.id] || (Math.round((farmArea / selectedCrops.length) * 10) / 10);
                    const pct = farmArea > 0 ? Math.round((currentAcres / farmArea) * 100) : 0;
                    const waterReq = aiService.calculateCropWaterRequirement(crop.name, currentAcres, irrigationMethod);

                    return (
                      <div key={crop.id} className="p-3.5 rounded-xl bg-obsidian-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <strong className="text-white text-sm block">{crop.name}</strong>
                          <span className="text-[11px] text-slate-400">
                            Est. Daily Water: <strong className="text-sky-300">{waterReq.dailyLiters.toLocaleString()} L/day*</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">Adjust Area:</span>
                          <div className="flex items-center bg-obsidian-900 border border-slate-700 rounded-xl p-1">
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
                              disabled={totalAllocatedAcreage >= farmArea}
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
                    );
                  })}
                </div>

                {/* Why this allocation? */}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
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

              {/* Variable Zones Configuration Preview */}
              <div className="p-5 rounded-2xl bg-obsidian-900 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-white text-sm">Irrigation Zones Configuration</h4>
                    <p className="text-[11px] text-slate-400">Choose between 1 and 10 zones. The software maps crops sequentially.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 font-semibold">Irrigation Zones:</span>
                    <div className="flex items-center bg-obsidian-950 border border-slate-700 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setNumZones(Math.max(1, numZones - 1))}
                        disabled={numZones <= 1}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-mono font-bold text-white text-xs">
                        {numZones}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNumZones(Math.min(10, numZones + 1))}
                        disabled={numZones >= 10}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {generatedZones.map((z) => (
                    <div key={z.zone_number} className="p-3 rounded-xl bg-obsidian-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white block">{z.name}</strong>
                        <span className="text-[11px] text-slate-400">{z.crop_name} • {z.area_acres} ac • Target: {z.target_moisture}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-sky-400 block">Pump #{z.pump_number}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{z.estimated_daily_liters?.toLocaleString()} L/d</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Apply to Farm Button */}
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyToActiveFarm}
                    className="px-6 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-xs shadow-glow-sm transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply Multi-Crop Plan to {farm.name}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparative Agronomic Matrix */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">Comparative Agronomic Matrix</h3>
            <p className="text-xs text-slate-400">Side-by-side demonstration estimates for candidate crops.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Normalized to 1 Acre</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-farm-500/15 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Crop Name</th>
                <th className="pb-3 font-semibold">Duration</th>
                <th className="pb-3 font-semibold">Water Need</th>
                <th className="pb-3 font-semibold">Est. Investment</th>
                <th className="pb-3 font-semibold">Est. Yield</th>
                <th className="pb-3 font-semibold">Est. Revenue</th>
                <th className="pb-3 font-semibold text-right">Est. Profit*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recommendedCrops.slice(0, 5).map((c) => (
                <tr key={c.id} className="hover:bg-farm-900/10">
                  <td className="py-3 font-bold text-white">{c.name}</td>
                  <td className="py-3 text-slate-300">{c.duration_days} Days</td>
                  <td className="py-3 text-sky-400">{c.water_requirement}</td>
                  <td className="py-3 text-slate-300">₹{c.est_investment_per_acre.toLocaleString()}</td>
                  <td className="py-3 text-slate-300">{c.expected_yield_per_acre}</td>
                  <td className="py-3 text-slate-300">₹{c.est_revenue_per_acre.toLocaleString()}</td>
                  <td className="py-3 font-bold text-farm-300 text-right">₹{c.est_profit_per_acre.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Crop Financial Summary Strip */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-farm-500/15">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-farm-400" />
            <span>Combined Multi-Crop Economic Sensitivity</span>
          </h3>
          <span className="text-xs font-mono text-farm-400">Total Plot: {farmArea} Acres</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Investment</span>
            <strong className="text-white text-base font-display mt-0.5 block">₹{Math.round(combinedInvestment).toLocaleString()}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected Revenue</span>
            <strong className="text-sky-300 text-base font-display mt-0.5 block">₹{Math.round(combinedRevenue).toLocaleString()}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-farm-500/10 border border-farm-500/30">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Margin</span>
            <strong className="text-farm-400 text-base font-display mt-0.5 block">₹{Math.round(combinedProfit).toLocaleString()}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-obsidian-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated ROI</span>
            <strong className="text-teal-300 text-base font-display mt-0.5 block">{combinedRoi}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
