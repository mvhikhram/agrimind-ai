export interface CropAllocation {
  crop_name: string;
  area_acres: number;
  percentage: number;
  water_requirement: 'Low' | 'Medium' | 'High';
  estimated_daily_liters: number;
  expected_yield?: string;
  risk_level?: 'Low' | 'Medium' | 'High';
  est_profit_per_acre?: number;
}

export interface Farm {
  id: string;
  name: string;
  state: string;
  district: string;
  village_city: string;
  area_acres: number;
  soil_type: string;
  soil_ph: number;
  water_availability: 'High' | 'Medium' | 'Low';
  irrigation_method: 'Drip' | 'Sprinkler' | 'Flood';
  season: 'Kharif' | 'Rabi' | 'Zaid' | 'Perennial';
  crops_allocation?: CropAllocation[];
  created_at: string;
}

export interface Zone {
  id: string;
  farm_id: string;
  zone_number: number;
  name: string;
  crop_name: string;
  area_acres: number;
  target_moisture: number; // e.g. 50%
  current_moisture: number; // e.g. 42%
  pump_status: boolean;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'IRRIGATING';
  last_irrigation?: string;
  pump_number?: number; // Physical channels 1-3, logical beyond
  priority?: 'High' | 'Medium' | 'Low';
  irrigation_mode?: 'AUTO' | 'MANUAL';
  estimated_daily_liters?: number;
}

export interface SensorData {
  soil_moisture: number; // %
  tank_level: number; // %
  water_consumption_today: number; // L
  flow_rate: number; // L/min (from single YF-S201 sensor)
  temperature: number; // °C
  humidity: number; // %
  light_level: number; // lux or %
  pump_running: boolean;
  active_zone_id: string | null;
  last_updated: string;
}

export interface IrrigationEvent {
  id: string;
  farm_id: string;
  zone_id: string;
  zone_name: string;
  pump_id: number;
  mode: 'AUTO' | 'MANUAL';
  start_time: string;
  end_time: string;
  duration_minutes: number;
  water_used_liters: number;
  starting_moisture: number;
  ending_moisture: number;
  avg_flow_rate: number;
}

export interface Crop {
  id: string;
  name: string;
  category: string;
  duration_days: number;
  water_requirement: 'Low' | 'Medium' | 'High';
  optimal_soil_type: string;
  optimal_ph_range: [number, number];
  expected_yield_per_acre: string;
  est_investment_per_acre: number; // in INR
  est_revenue_per_acre: number; // in INR
  est_profit_per_acre: number; // in INR
  risk_level: 'Low' | 'Medium' | 'High';
  description?: string;
}

export interface DiseaseRecord {
  id: string;
  farm_id: string;
  zone_id?: string;
  crop_name: string;
  image_url: string;
  possible_disease: string;
  confidence: number; // %
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string;
  recommended_actions: string;
  detected_at: string;
}

export interface CommunityPost {
  id: string;
  author_name: string;
  category: 'Crop' | 'Irrigation' | 'Disease' | 'Equipment' | 'Technology' | 'General';
  title: string;
  content: string;
  image_url?: string;
  likes_count: number;
  liked_by_user?: boolean;
  created_at: string;
  comments: CommunityComment[];
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_name: string;
  comment: string;
  created_at: string;
}

export interface IoTDeviceStatus {
  stm32_status: 'ONLINE' | 'OFFLINE';
  esp32_status: 'ONLINE' | 'OFFLINE';
  connected_sensors_count: number;
  last_data_received: string;
  active_mode: 'DEMO' | 'REAL_IOT';
}

export interface DailyAction {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'UPCOMING';
  icon: string;
  title: string;
  reason: string;
  action_label?: string;
  action_target?: string;
}

export interface FlowAlert {
  id: string;
  type: 'BLOCKAGE' | 'LEAKAGE' | 'LOW_WATER' | 'BURST';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  timestamp: string;
}

export interface Expense {
  id: string;
  farm_id: string;
  category: 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Labour' | 'Electricity' | 'Irrigation' | 'Other';
  amount: number;
  description?: string;
  expense_date: string;
  created_at?: string;
}

export interface CropCycle {
  id: string;
  farm_id: string;
  zone_id: string;
  crop_id?: string;
  crop_name: string;
  sowing_date: string;
  expected_harvest_date?: string;
  current_stage: 'Land Preparation' | 'Germination' | 'Vegetative' | 'Flowering' | 'Fruiting' | 'Maturity' | 'Harvest';
  notes?: string;
  plan_data?: any;
  created_at?: string;
}

export interface SensorReadingRecord {
  id: string;
  farm_id: string;
  zone_id?: string;
  sensor_type: 'soil_moisture' | 'temperature' | 'humidity' | 'light' | 'flow_rate' | 'tank_level';
  value: number;
  unit: string;
  timestamp: string;
}
