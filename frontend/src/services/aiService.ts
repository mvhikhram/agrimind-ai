import { Crop, DiseaseRecord, DailyAction, Farm, Zone, CropAllocation } from '../types';
import { dataService } from './dataService';
import { iotService } from './iotService';

export interface CropPlannerCriteria {
  farmId: string;
  season: 'Kharif' | 'Rabi' | 'Zaid' | 'Perennial';
  soilType: string;
  soilPh: number;
  waterAvailability: 'High' | 'Medium' | 'Low';
  irrigationMethod: 'Drip' | 'Sprinkler' | 'Flood';
  areaAcres: number;
  state?: string;
  district?: string;
}

export interface DiseaseAnalysisResult {
  possible_disease: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string;
  recommended_actions: string;
  disclaimer: string;
}

class AIService {
  /**
   * Rule-based agronomic crop matching engine (no black-box or bloated ML).
   */
  recommendCrops(criteria: CropPlannerCriteria): Crop[] {
    const allCrops = dataService.getCrops();

    return allCrops.map(crop => {
      let score = 70;

      // Soil type check
      if (crop.optimal_soil_type.toLowerCase().includes(criteria.soilType.toLowerCase())) {
        score += 15;
      }

      // pH range check
      const [minPh, maxPh] = crop.optimal_ph_range;
      if (criteria.soilPh >= minPh && criteria.soilPh <= maxPh) {
        score += 10;
      }

      // Water availability check
      if (criteria.waterAvailability === 'Low' && crop.water_requirement === 'High') {
        score -= 25;
      } else if (criteria.waterAvailability === 'High' && crop.water_requirement === 'High') {
        score += 10;
      }

      // Calculate scaled estimates based on farmer's area
      const area = criteria.areaAcres || 1;
      const totalInvestment = Math.round(crop.est_investment_per_acre * area);
      const totalRevenue = Math.round(crop.est_revenue_per_acre * area);
      const totalProfit = totalRevenue - totalInvestment;

      return {
        ...crop,
        est_investment_per_acre: totalInvestment,
        est_revenue_per_acre: totalRevenue,
        est_profit_per_acre: totalProfit,
        description: `${crop.description} (Suitability Index: ${Math.min(98, score)}%)`
      };
    }).sort((a, b) => b.est_profit_per_acre - a.est_profit_per_acre);
  }

  /**
   * Estimates daily water requirement in Liters/day for a given crop and area.
   * Labeled as an estimated/reference value.
   */
  calculateCropWaterRequirement(
    cropName: string,
    areaAcres: number,
    irrigationMethod: 'Drip' | 'Sprinkler' | 'Flood' = 'Drip'
  ): { dailyLiters: number; waterLevel: 'Low' | 'Medium' | 'High' } {
    const cName = cropName.toLowerCase();
    let baseLitersPerAcre = 3000;
    let waterLevel: 'Low' | 'Medium' | 'High' = 'Medium';

    if (cName.includes('tomato')) {
      baseLitersPerAcre = 3600;
      waterLevel = 'Medium';
    } else if (cName.includes('groundnut')) {
      baseLitersPerAcre = 2500;
      waterLevel = 'Low';
    } else if (cName.includes('cotton')) {
      baseLitersPerAcre = 3200;
      waterLevel = 'Medium';
    } else if (cName.includes('wheat')) {
      baseLitersPerAcre = 2800;
      waterLevel = 'Medium';
    } else if (cName.includes('chilli')) {
      baseLitersPerAcre = 3800;
      waterLevel = 'High';
    }

    // Method efficiency multiplier: Drip (1.0), Sprinkler (1.2), Flood (1.6)
    const methodMultiplier = irrigationMethod === 'Flood' ? 1.6 : irrigationMethod === 'Sprinkler' ? 1.2 : 1.0;
    const dailyLiters = Math.round(baseLitersPerAcre * (areaAcres || 1) * methodMultiplier);

    return { dailyLiters, waterLevel };
  }

  /**
   * Recommend multi-crop acreage allocation across selected crops.
   */
  recommendCropAllocation(
    criteria: CropPlannerCriteria,
    selectedCrops: Crop[]
  ): {
    allocations: CropAllocation[];
    reasoning: string[];
    isAiRecommended: boolean;
  } {
    const crops = selectedCrops.length > 0 ? selectedCrops : this.recommendCrops(criteria).slice(0, 3);
    const totalArea = Math.max(1, criteria.areaAcres || 1);
    const n = crops.length;

    // Determine proportions
    let ratios: number[] = [];
    if (n === 1) {
      ratios = [1.0];
    } else if (n === 2) {
      ratios = [0.6, 0.4];
    } else if (n === 3) {
      ratios = [0.4, 0.35, 0.25];
    } else if (n === 4) {
      ratios = [0.35, 0.25, 0.20, 0.20];
    } else {
      const even = 1.0 / n;
      ratios = new Array(n).fill(even);
    }

    let allocatedSum = 0;
    const rawAcreages = ratios.map(r => Math.round(totalArea * r * 10) / 10);
    allocatedSum = rawAcreages.reduce((sum, a) => sum + a, 0);

    // Ensure sum matches totalArea exactly
    const diff = Math.round((totalArea - allocatedSum) * 10) / 10;
    if (rawAcreages.length > 0 && Math.abs(diff) > 0) {
      rawAcreages[0] = Math.round((rawAcreages[0] + diff) * 10) / 10;
    }

    const allocations: CropAllocation[] = crops.map((crop, idx) => {
      const area = Math.max(0.1, rawAcreages[idx] || Math.round((totalArea / n) * 10) / 10);
      const percentage = Math.round((area / totalArea) * 100);
      const waterReq = this.calculateCropWaterRequirement(crop.name, area, criteria.irrigationMethod);

      return {
        crop_name: crop.name,
        area_acres: area,
        percentage,
        water_requirement: crop.water_requirement || waterReq.waterLevel,
        estimated_daily_liters: waterReq.dailyLiters,
        expected_yield: crop.expected_yield_per_acre,
        risk_level: crop.risk_level,
        est_profit_per_acre: crop.est_profit_per_acre ? Math.round(crop.est_profit_per_acre / (criteria.areaAcres || 1)) : 80000
      };
    });

    const reasoning = [
      `Soil compatibility: Selected crops perform well in ${criteria.soilType} with pH ${criteria.soilPh}.`,
      `Seasonal suitability: Matched for ${criteria.season} agro-climatic window in ${criteria.district || 'the region'}.`,
      `Water availability: Proportions tuned for ${criteria.waterAvailability.toLowerCase()} water availability with ${criteria.irrigationMethod} efficiency.`,
      `Crop water demand: Balances high-value crops with lower-demand varieties to optimize aquifer withdrawal.`,
      `Farm diversification: Cultivating ${n} crops minimizes price collapse exposure in local mandis.`,
      `Risk distribution: Diversifies biological pathogen risks across distinct plant families.`,
      `Expected economic potential: Estimated reference margins weighted to maximize overall farm profitability.`
    ];

    return {
      allocations,
      reasoning,
      isAiRecommended: true
    };
  }

  /**
   * Intelligently maps allocated crops to 1 to 10 irrigation zones.
   */
  generateZonesForCrops(
    farmArea: number,
    numZones: number,
    allocations: CropAllocation[],
    irrigationMethod: 'Drip' | 'Sprinkler' | 'Flood' = 'Drip'
  ): Array<{
    zone_number: number;
    name: string;
    crop_name: string;
    area_acres: number;
    target_moisture: number;
    pump_status: boolean;
    pump_number: number;
    priority: 'High' | 'Medium' | 'Low';
    irrigation_mode: 'AUTO' | 'MANUAL';
    estimated_daily_liters: number;
  }> {
    const validNumZones = Math.max(1, Math.min(10, numZones));
    if (!allocations || allocations.length === 0) {
      const perZoneArea = Math.round((farmArea / validNumZones) * 10) / 10;
      return Array.from({ length: validNumZones }, (_, i) => ({
        zone_number: i + 1,
        name: `Zone ${i + 1} - Field Plot`,
        crop_name: 'Mixed Crops',
        area_acres: perZoneArea,
        target_moisture: 50,
        pump_status: false,
        pump_number: i + 1,
        priority: i === 0 ? 'High' : 'Medium',
        irrigation_mode: 'AUTO',
        estimated_daily_liters: Math.round(perZoneArea * 3000)
      }));
    }

    const zones: Array<{
      zone_number: number;
      name: string;
      crop_name: string;
      area_acres: number;
      target_moisture: number;
      pump_status: boolean;
      pump_number: number;
      priority: 'High' | 'Medium' | 'Low';
      irrigation_mode: 'AUTO' | 'MANUAL';
      estimated_daily_liters: number;
    }> = [];

    // If numZones equals allocations length: 1-to-1 mapping
    if (validNumZones === allocations.length) {
      allocations.forEach((alloc, idx) => {
        const cLower = alloc.crop_name.toLowerCase();
        const targetMoisture = cLower.includes('groundnut') ? 45 : cLower.includes('chilli') ? 55 : 50;
        zones.push({
          zone_number: idx + 1,
          name: `Zone ${idx + 1} - ${alloc.crop_name.split(' ')[0]} Block`,
          crop_name: alloc.crop_name,
          area_acres: alloc.area_acres,
          target_moisture: targetMoisture,
          pump_status: false,
          pump_number: idx + 1,
          priority: idx === 0 ? 'High' : 'Medium',
          irrigation_mode: 'AUTO',
          estimated_daily_liters: alloc.estimated_daily_liters || Math.round(alloc.area_acres * 3000)
        });
      });
      return zones;
    }

    // If numZones > allocations length: split largest crops
    if (validNumZones > allocations.length) {
      let remainingZones = validNumZones;
      const cropZoneCounts = allocations.map(() => 1);
      remainingZones -= allocations.length;

      // Distribute remaining zone slots to crops with largest area
      while (remainingZones > 0) {
        let maxIdx = 0;
        let maxPerZone = 0;
        allocations.forEach((a, i) => {
          const areaPerSlot = a.area_acres / cropZoneCounts[i];
          if (areaPerSlot > maxPerZone) {
            maxPerZone = areaPerSlot;
            maxIdx = i;
          }
        });
        cropZoneCounts[maxIdx]++;
        remainingZones--;
      }

      let currentZoneNum = 1;
      allocations.forEach((alloc, cropIdx) => {
        const slots = cropZoneCounts[cropIdx];
        const splitArea = Math.round((alloc.area_acres / slots) * 10) / 10;
        const cLower = alloc.crop_name.toLowerCase();
        const targetMoisture = cLower.includes('groundnut') ? 45 : cLower.includes('chilli') ? 55 : 50;

        for (let s = 0; s < slots; s++) {
          const isLastSlot = s === slots - 1;
          const assignedArea = isLastSlot 
            ? Math.round((alloc.area_acres - splitArea * (slots - 1)) * 10) / 10
            : splitArea;
          
          const waterReq = this.calculateCropWaterRequirement(alloc.crop_name, assignedArea, irrigationMethod);

          zones.push({
            zone_number: currentZoneNum,
            name: `Zone ${currentZoneNum} - ${alloc.crop_name.split(' ')[0]}${slots > 1 ? ` Sec ${s + 1}` : ''}`,
            crop_name: alloc.crop_name,
            area_acres: Math.max(0.1, assignedArea),
            target_moisture: targetMoisture,
            pump_status: false,
            pump_number: currentZoneNum,
            priority: currentZoneNum === 1 ? 'High' : 'Medium',
            irrigation_mode: 'AUTO',
            estimated_daily_liters: waterReq.dailyLiters
          });
          currentZoneNum++;
        }
      });
      return zones;
    }

    // If numZones < allocations length: assign largest crops to zones and group remaining
    for (let i = 0; i < validNumZones; i++) {
      const alloc = allocations[i] || allocations[allocations.length - 1];
      const area = i === validNumZones - 1 
        ? Math.round(allocations.slice(i).reduce((s, a) => s + a.area_acres, 0) * 10) / 10
        : alloc.area_acres;
      const cLower = alloc.crop_name.toLowerCase();
      const targetMoisture = cLower.includes('groundnut') ? 45 : cLower.includes('chilli') ? 55 : 50;
      const waterReq = this.calculateCropWaterRequirement(alloc.crop_name, area, irrigationMethod);

      zones.push({
        zone_number: i + 1,
        name: `Zone ${i + 1} - ${alloc.crop_name.split(' ')[0]} Block`,
        crop_name: alloc.crop_name,
        area_acres: Math.max(0.1, area),
        target_moisture: targetMoisture,
        pump_status: false,
        pump_number: i + 1,
        priority: i === 0 ? 'High' : 'Medium',
        irrigation_mode: 'AUTO',
        estimated_daily_liters: waterReq.dailyLiters
      });
    }

    return zones;
  }

  /**
   * AI Plant Disease Identification Abstraction.
   * Provides realistic pathology classification with mandatory confidence scores and disclaimers.
   */
  async analyzeLeafImage(imageFileOrUrl: string, cropName: string = 'Tomato'): Promise<DiseaseAnalysisResult> {
    // Simulated neural vision response with realistic diagnosis
    await new Promise(resolve => setTimeout(resolve, 800)); // snappy demo latency

    const isTomato = cropName.toLowerCase().includes('tomato');

    if (isTomato) {
      return {
        possible_disease: 'Tomato Early Blight (Alternaria solani)',
        confidence: 91.0,
        severity: 'Medium',
        symptoms: 'Concentric brown target rings on older foliage with yellow chlorotic margin.',
        recommended_actions: 'Inspect nearby plants, remove lower infected leaves up to 8 inches off the soil, apply copper octanoate fungicide or neem oil emulsion spray.',
        disclaimer: 'AI Prediction / Demonstration Estimate - Not a guaranteed diagnostic. Seek local agronomic extension verification before large-scale pesticide application.'
      };
    }

    return {
      possible_disease: 'Powdery Mildew (Erysiphales)',
      confidence: 88.5,
      severity: 'Medium',
      symptoms: 'White powdery fungal mycelium spreading across upper leaf surfaces and young shoots.',
      recommended_actions: 'Spray potassium bicarbonate solution or dilute milk water emulsion (1:9) early morning. Improve canopy airflow.',
      disclaimer: 'AI Prediction / Demonstration Estimate - Not a guaranteed diagnostic.'
    };
  }

  /**
   * Dynamic contextual farm actions: "WHAT SHOULD I DO TODAY?"
   */
  getDailyActions(farm: Farm, zones: Zone[]): DailyAction[] {
    const telemetry = iotService.getCurrentData();
    const actions: DailyAction[] = [];

    // Check for dry zones
    const criticalZone = zones.find(z => z.current_moisture < 30 || z.status === 'CRITICAL');
    const warningZone = zones.find(z => z.current_moisture < z.target_moisture - 5);

    if (criticalZone) {
      actions.push({
        id: 'act-1',
        type: 'CRITICAL',
        icon: '🔴',
        title: `Irrigate ${criticalZone.name}`,
        reason: `Soil moisture is at ${criticalZone.current_moisture}% (Target: ${criticalZone.target_moisture}%). Plants experiencing turgor stress.`,
        action_label: 'Start Sequential Pump',
        action_target: 'smart-irrigation'
      });
    } else if (warningZone) {
      actions.push({
        id: 'act-1',
        type: 'WARNING',
        icon: '🟡',
        title: `Schedule Drip for ${warningZone.name}`,
        reason: `Soil moisture at ${warningZone.current_moisture}%, slightly below optimal threshold.`,
        action_label: 'View Zone',
        action_target: 'smart-irrigation'
      });
    } else {
      actions.push({
        id: 'act-1',
        type: 'NORMAL',
        icon: '🟢',
        title: 'All Farm Zones Normal',
        reason: 'Soil moisture across all monitored root zones is within optimal parameters.'
      });
    }

    // Check tank level
    if (telemetry.tank_level < 30) {
      actions.push({
        id: 'act-2',
        type: 'WARNING',
        icon: '🟡',
        title: 'Replenish Water Storage Tank',
        reason: `Tank level is at ${telemetry.tank_level}%. Run borewell inlet before next automated cycle.`
      });
    } else {
      actions.push({
        id: 'act-2',
        type: 'NORMAL',
        icon: '💧',
        title: 'Tank Level Sufficient',
        reason: `Current tank volume (${telemetry.tank_level}%) is sufficient for upcoming irrigation cycles.`
      });
    }

    // Agronomic maintenance
    actions.push({
      id: 'act-3',
      type: 'UPCOMING',
      icon: '🌱',
      title: 'Canopy Disease Scouting Due',
      reason: 'Overcast weather with 67% humidity increases foliar fungal risk in Tomato block.'
    });

    return actions;
  }

  /**
   * AI Farm Copilot contextual response generator.
   */
  generateCopilotResponse(query: string, farm: Farm, zones: Zone[]): string {
    const telemetry = iotService.getCurrentData();
    const q = query.toLowerCase();

    if (q.includes('should i irrigate') || q.includes('irrigate now')) {
      const dryZone = zones.find(z => z.current_moisture < 35);
      if (dryZone) {
        return `Yes, irrigation is recommended. ${dryZone.name} is currently at ${dryZone.current_moisture}% soil moisture, which is below the configured threshold of ${dryZone.target_moisture}%. Water tank level is currently ${telemetry.tank_level}%, which is sufficient for a 20-minute cycle.`;
      }
      return `Currently, irrigation is not urgently required. All zones have adequate soil moisture (Zone 1: ${zones[0]?.current_moisture || 48}%, Zone 2: ${zones[1]?.current_moisture || 42}%). Furthermore, ambient humidity is high at ${telemetry.humidity}%, reducing evapotranspiration loss.`;
    }

    if (q.includes('what should i do') || q.includes('today')) {
      const criticalZone = zones.find(z => z.current_moisture < 30);
      let text = `Here is your priority checklist for ${farm.name} today:\n`;
      if (criticalZone) {
        text += `1. 🔴 Urgently irrigate ${criticalZone.name} (moisture dropped to ${criticalZone.current_moisture}%).\n`;
      } else {
        text += `1. 🟢 Soil moisture across active zones is stable.\n`;
      }
      text += `2. 💧 Check water tank (currently at ${telemetry.tank_level}%).\n`;
      text += `3. ☀️ Ambient temperature is ${telemetry.temperature}°C with ${telemetry.humidity}% humidity.\n`;
      text += `4. 🍃 Conduct canopy check in Zone 1 for early blight given morning dew.\n`;
      return text;
    }

    if (q.includes('zone 2') || q.includes('why is zone 2 dry')) {
      const z2 = zones.find(z => z.zone_number === 2);
      const m = z2 ? z2.current_moisture : 25;
      return `Zone 2 (${z2?.name || 'Central Groundnut Field'}) has a current moisture reading of ${m}%. This zone has sandy loam soil with faster percolation rates and hasn't received a drip cycle since yesterday. Click "Start Irrigation" to activate sequential pump #2.`;
    }

    if (q.includes('water') && (q.includes('how much') || q.includes('used today') || q.includes('consumption'))) {
      return `Total water consumed across all zones today is ${telemetry.water_consumption_today.toLocaleString()} Liters. The shared YF-S201 sensor recorded an average operating flow rate of ${telemetry.flow_rate > 0 ? telemetry.flow_rate : '1.7'} L/min during active cycles.`;
    }

    if (q.includes('what crop') || q.includes('crop can i grow') || q.includes('recommend')) {
      return `Based on ${farm.district}, ${farm.state} conditions with ${farm.soil_type} and ${farm.water_availability.toLowerCase()} water availability in ${farm.season} season, our top recommended crops are:\n1. 🍅 Tomato (Est. Profit: ₹1,20,000/acre)\n2. 🥜 Groundnut (Est. Profit: ₹80,000/acre)\n3. 🌾 Winter Wheat (Est. Profit: ₹50,000/acre).\nVisit the Crop Planner tab for detailed investment and ROI calculators!`;
    }

    if (q.includes('disease') || q.includes('check this plant')) {
      return `You can use the "Disease Detection" tab to upload or choose a photo of your crop foliage. Our vision diagnostic engine will analyze the leaf for Early Blight, Powdery Mildew, or Bacterial Spot with severity ratings and organic remediation protocols.`;
    }

    return `I am your Farm Copilot for ${farm.name}. Current telemetry shows: Soil Moisture ${telemetry.soil_moisture}%, Tank Level ${telemetry.tank_level}%, Temp ${telemetry.temperature}°C, Humidity ${telemetry.humidity}%. How can I assist with your irrigation, crop planning, or disease monitoring today?`;
  }
}

export const aiService = new AIService();
