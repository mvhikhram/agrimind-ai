import { Farm, Zone, Crop, CropAllocation, IrrigationEvent, DiseaseRecord, CommunityPost, Expense, CropCycle, SensorReadingRecord } from '../types';
import { supabase, isSupabaseConfigured, uploadToSupabaseStorage } from '../lib/supabase';

// Realistic Initial Seed Data (Fallback & Instant Hydration)
const INITIAL_FARMS: Farm[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Demo Smart Farm',
    state: 'Telangana',
    district: 'Jogulamba Gadwal',
    village_city: 'Gadwal',
    area_acres: 5.0,
    soil_type: 'Sandy Clay Loam',
    soil_ph: 6.4,
    water_availability: 'Medium',
    irrigation_method: 'Drip',
    season: 'Kharif',
    crops_allocation: [
      {
        crop_name: 'Tomato (Roma)',
        area_acres: 2.0,
        percentage: 40,
        water_requirement: 'Medium',
        estimated_daily_liters: 7200,
        expected_yield: '12 - 14 Tons',
        risk_level: 'Medium',
        est_profit_per_acre: 110000
      },
      {
        crop_name: 'Groundnut (K-6)',
        area_acres: 1.8,
        percentage: 36,
        water_requirement: 'Low',
        estimated_daily_liters: 4500,
        expected_yield: '1.2 - 1.6 Tons',
        risk_level: 'Low',
        est_profit_per_acre: 56000
      },
      {
        crop_name: 'Winter Wheat',
        area_acres: 1.2,
        percentage: 24,
        water_requirement: 'Medium',
        estimated_daily_liters: 3360,
        expected_yield: '2.0 - 2.5 Tons',
        risk_level: 'Low',
        est_profit_per_acre: 37000
      }
    ],
    created_at: '2026-09-01T00:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Experimental Precision Plot',
    state: 'Telangana',
    district: 'Rangareddy',
    village_city: 'Chevella',
    area_acres: 2.0,
    soil_type: 'Red Sandy Loam',
    soil_ph: 6.8,
    water_availability: 'High',
    irrigation_method: 'Sprinkler',
    season: 'Rabi',
    crops_allocation: [
      {
        crop_name: 'Tomato (Roma)',
        area_acres: 1.2,
        percentage: 60,
        water_requirement: 'Medium',
        estimated_daily_liters: 4320,
        risk_level: 'Medium',
        est_profit_per_acre: 110000
      },
      {
        crop_name: 'Cover Crop',
        area_acres: 0.8,
        percentage: 40,
        water_requirement: 'Low',
        estimated_daily_liters: 2000,
        risk_level: 'Low',
        est_profit_per_acre: 30000
      }
    ],
    created_at: '2026-09-10T00:00:00Z'
  }
];

const INITIAL_ZONES: Zone[] = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_number: 1,
    name: 'Zone 1 - North Tomato Block',
    crop_name: 'Tomato (Roma)',
    area_acres: 2.0,
    target_moisture: 50.0,
    current_moisture: 48.0,
    pump_status: false,
    status: 'NORMAL',
    last_irrigation: 'Today, 06:30 AM',
    pump_number: 1,
    priority: 'High',
    irrigation_mode: 'AUTO',
    estimated_daily_liters: 7200
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_number: 2,
    name: 'Zone 2 - Central Groundnut Field',
    crop_name: 'Groundnut (K-6)',
    area_acres: 1.8,
    target_moisture: 45.0,
    current_moisture: 42.0,
    pump_status: false,
    status: 'NORMAL',
    last_irrigation: 'Yesterday, 05:00 PM',
    pump_number: 2,
    priority: 'Medium',
    irrigation_mode: 'AUTO',
    estimated_daily_liters: 4500
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_number: 3,
    name: 'Zone 3 - South Wheat & Fallow',
    crop_name: 'Winter Wheat',
    area_acres: 1.2,
    target_moisture: 52.0,
    current_moisture: 52.0,
    pump_status: false,
    status: 'NORMAL',
    last_irrigation: '2 days ago',
    pump_number: 3,
    priority: 'Medium',
    irrigation_mode: 'AUTO',
    estimated_daily_liters: 3360
  }
];

const INITIAL_CROPS: Crop[] = [
  {
    id: 'crop-1',
    name: 'Tomato (Roma Hybrid)',
    category: 'Solanaceous Vegetable',
    duration_days: 100,
    water_requirement: 'Medium',
    optimal_soil_type: 'Sandy Clay Loam',
    optimal_ph_range: [6.0, 6.8],
    expected_yield_per_acre: '10 - 12 Tons',
    est_investment_per_acre: 80000,
    est_revenue_per_acre: 200000,
    est_profit_per_acre: 120000,
    risk_level: 'Medium',
    description: 'High market demand in South Indian wholesale mandis; responsive to drip fertigation.'
  },
  {
    id: 'crop-2',
    name: 'Groundnut (Spanish Bunch)',
    category: 'Legume / Oilseed',
    duration_days: 120,
    water_requirement: 'Medium',
    optimal_soil_type: 'Sandy Loam',
    optimal_ph_range: [5.8, 6.8],
    expected_yield_per_acre: '7 - 8 Tons',
    est_investment_per_acre: 60000,
    est_revenue_per_acre: 140000,
    est_profit_per_acre: 80000,
    risk_level: 'Low',
    description: 'Fixes atmospheric nitrogen into soil; drought resilient with steady minimum support prices.'
  },
  {
    id: 'crop-3',
    name: 'Winter Wheat (HD-2967)',
    category: 'Cereal Grain',
    duration_days: 115,
    water_requirement: 'Medium',
    optimal_soil_type: 'Clay Loam',
    optimal_ph_range: [6.2, 7.5],
    expected_yield_per_acre: '5 - 6 Tons',
    est_investment_per_acre: 45000,
    est_revenue_per_acre: 95000,
    est_profit_per_acre: 50000,
    risk_level: 'Low',
    description: 'Staple grain crop with guaranteed procurement, low pest vulnerability.'
  },
  {
    id: 'crop-4',
    name: 'Cotton (Bt Hybrid)',
    category: 'Commercial Fiber',
    duration_days: 160,
    water_requirement: 'High',
    optimal_soil_type: 'Deep Black Cotton Soil',
    optimal_ph_range: [6.5, 7.8],
    expected_yield_per_acre: '8 - 10 Quintals',
    est_investment_per_acre: 75000,
    est_revenue_per_acre: 160000,
    est_profit_per_acre: 85000,
    risk_level: 'High',
    description: 'High reward cash crop; requires pest vigilance against pink bollworm.'
  },
  {
    id: 'crop-5',
    name: 'Green Chilli (G4 Teja)',
    category: 'Spice / Solanaceae',
    duration_days: 140,
    water_requirement: 'High',
    optimal_soil_type: 'Well-drained Loam',
    optimal_ph_range: [6.0, 7.0],
    expected_yield_per_acre: '6 - 7 Tons',
    est_investment_per_acre: 95000,
    est_revenue_per_acre: 230000,
    est_profit_per_acre: 135000,
    risk_level: 'Medium',
    description: 'Very lucrative export grade spice with excellent price realization during dry seasons.'
  }
];

const INITIAL_IRRIGATION_EVENTS: IrrigationEvent[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_id: '00000000-0000-0000-0000-000000000011',
    zone_name: 'Zone 1 - North Tomato Block',
    pump_id: 1,
    mode: 'AUTO',
    start_time: '2026-09-21T06:00:00Z',
    end_time: '2026-09-21T06:25:00Z',
    duration_minutes: 25,
    water_used_liters: 420,
    starting_moisture: 36,
    ending_moisture: 50,
    avg_flow_rate: 1.7
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_id: '00000000-0000-0000-0000-000000000013',
    zone_name: 'Zone 3 - South Wheat',
    pump_id: 3,
    mode: 'MANUAL',
    start_time: '2026-09-20T17:10:00Z',
    end_time: '2026-09-20T17:35:00Z',
    duration_minutes: 25,
    water_used_liters: 410,
    starting_moisture: 38,
    ending_moisture: 53,
    avg_flow_rate: 1.65
  }
];

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    author_name: 'Ramesh Reddy (Gadwal Farmer)',
    category: 'Irrigation',
    title: 'Drip flow efficiency with YF-S201 flow sensor on 3-acre tomato',
    content: 'Switched from flood irrigation to sequential drip cycles with single flow meter telemetry. Noticed a 38% reduction in borewell pump electricity usage this fortnight!',
    likes_count: 14,
    created_at: '2 hours ago',
    comments: [
      {
        id: 'c-1',
        post_id: '00000000-0000-0000-0000-000000000201',
        author_name: 'Venkat Rao',
        comment: 'What is your operating flow rate per minute when only Zone 1 is active?',
        created_at: '1 hour ago'
      },
      {
        id: 'c-2',
        post_id: '00000000-0000-0000-0000-000000000201',
        author_name: 'Ramesh Reddy',
        comment: 'Holding steady around 1.7 L/min at 1.5 bar pressure.',
        created_at: '45 mins ago'
      }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    author_name: 'Ananya Sharma (Agronomist)',
    category: 'Disease',
    title: 'Early Blight containment during humid overcast mornings',
    content: 'For farmers seeing target-board brown lesions on lower foliage: prune lower leaves up to 8 inches off the ground to stop rain splash pathogens, and spray bio-fungicides early morning.',
    likes_count: 29,
    created_at: '5 hours ago',
    comments: []
  }
];

const INITIAL_DISEASE_RECORDS: DiseaseRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000301',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_id: '00000000-0000-0000-0000-000000000011',
    crop_name: 'Tomato',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef231c9?w=500&auto=format&fit=crop&q=60',
    possible_disease: 'Tomato Early Blight (Alternaria solani)',
    confidence: 91.0,
    severity: 'Medium',
    symptoms: 'Concentric brown target rings on older foliage with yellow chlorotic margin.',
    recommended_actions: 'Inspect nearby plants, remove lower infected leaves, apply copper octanoate fungicide.',
    detected_at: 'Yesterday, 11:20 AM'
  }
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: '00000000-0000-0000-0000-000000000401',
    farm_id: '00000000-0000-0000-0000-000000000001',
    category: 'Fertilizer',
    amount: 8500,
    description: 'Soluble NPK 19-19-19 for Drip Fertigation Block',
    expense_date: '2026-09-15'
  },
  {
    id: '00000000-0000-0000-0000-000000000402',
    farm_id: '00000000-0000-0000-0000-000000000001',
    category: 'Seeds',
    amount: 14000,
    description: 'Roma Hybrid F1 certified seed trays',
    expense_date: '2026-09-02'
  }
];

const INITIAL_CROP_CYCLES: CropCycle[] = [
  {
    id: '00000000-0000-0000-0000-000000000501',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_id: '00000000-0000-0000-0000-000000000011',
    crop_name: 'Tomato (Roma Hybrid)',
    sowing_date: '2026-08-15',
    expected_harvest_date: '2026-11-25',
    current_stage: 'Vegetative',
    notes: 'Transplanted 30-day seedlings under drip irrigation.'
  }
];

const INITIAL_SENSOR_READINGS: SensorReadingRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000601',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_id: '00000000-0000-0000-0000-000000000011',
    sensor_type: 'soil_moisture',
    value: 48.0,
    unit: '%',
    timestamp: '2026-09-21T06:30:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000602',
    farm_id: '00000000-0000-0000-0000-000000000001',
    zone_id: '00000000-0000-0000-0000-000000000011',
    sensor_type: 'flow_rate',
    value: 1.7,
    unit: 'L/min',
    timestamp: '2026-09-21T06:30:00Z'
  }
];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`agrimind_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(`agrimind_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
}

export type DataChangeListener = () => void;

export class DataService {
  private farms: Farm[] = getStorage('farms', INITIAL_FARMS);
  private zones: Zone[] = getStorage('zones', INITIAL_ZONES);
  private crops: Crop[] = INITIAL_CROPS;
  private cropCycles: CropCycle[] = getStorage('crop_cycles', INITIAL_CROP_CYCLES);
  private expenses: Expense[] = getStorage('expenses', INITIAL_EXPENSES);
  private sensorReadings: SensorReadingRecord[] = getStorage('sensor_readings', INITIAL_SENSOR_READINGS);
  private irrigationEvents: IrrigationEvent[] = getStorage('irrig_events', INITIAL_IRRIGATION_EVENTS);
  private diseaseRecords: DiseaseRecord[] = getStorage('disease_records', INITIAL_DISEASE_RECORDS);
  private communityPosts: CommunityPost[] = getStorage('community_posts', INITIAL_COMMUNITY_POSTS);

  private listeners: Set<DataChangeListener> = new Set();
  private isSyncing: boolean = false;

  constructor() {
    // Attempt background sync from Supabase if connected
    this.syncFromSupabase();
  }

  subscribe(listener: DataChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  /**
   * Sync data from Supabase PostgreSQL tables if connected.
   */
  async syncFromSupabase(): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    try {
      // 1. Fetch Farms
      const { data: remoteFarms, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: true });

      if (!farmsError && remoteFarms && remoteFarms.length > 0) {
        this.farms = remoteFarms.map(f => ({
          id: f.id,
          name: f.name,
          state: f.state,
          district: f.district,
          village_city: f.village_city,
          area_acres: Number(f.area_acres),
          soil_type: f.soil_type,
          soil_ph: Number(f.soil_ph || 6.5),
          water_availability: f.water_availability,
          irrigation_method: f.irrigation_method,
          season: f.season,
          crops_allocation: f.crops_allocation || undefined,
          created_at: f.created_at
        }));
        setStorage('farms', this.farms);
      }

      // 2. Fetch Zones
      const { data: remoteZones, error: zonesError } = await supabase
        .from('zones')
        .select('*')
        .order('zone_number', { ascending: true });

      if (!zonesError && remoteZones && remoteZones.length > 0) {
        this.zones = remoteZones.map(z => ({
          id: z.id,
          farm_id: z.farm_id,
          zone_number: z.zone_number,
          name: z.name,
          crop_name: z.crop_name,
          area_acres: Number(z.area_acres),
          target_moisture: Number(z.target_moisture),
          current_moisture: Number(z.current_moisture),
          pump_status: Boolean(z.pump_status),
          pump_number: Number(z.pump_number || z.zone_number || 1),
          priority: (z.priority || 'Medium') as 'High' | 'Medium' | 'Low',
          irrigation_mode: (z.irrigation_mode || 'AUTO') as 'AUTO' | 'MANUAL',
          status: (z.current_moisture < z.target_moisture - 5 ? 'WARNING' : 'NORMAL') as any
        }));
        setStorage('zones', this.zones);
      }

      // 3. Fetch Irrigation Events
      const { data: remoteEvents, error: eventsError } = await supabase
        .from('irrigation_events')
        .select('*')
        .order('start_time', { ascending: false });

      if (!eventsError && remoteEvents && remoteEvents.length > 0) {
        this.irrigationEvents = remoteEvents.map(e => ({
          id: e.id,
          farm_id: e.farm_id,
          zone_id: e.zone_id,
          zone_name: e.zone_name || 'Field Zone',
          pump_id: e.pump_id,
          mode: e.mode as any,
          start_time: e.start_time,
          end_time: e.end_time || e.start_time,
          duration_minutes: e.duration_minutes || 20,
          water_used_liters: Number(e.water_used_liters),
          starting_moisture: Number(e.starting_moisture),
          ending_moisture: Number(e.ending_moisture),
          avg_flow_rate: Number(e.avg_flow_rate || 1.7)
        }));
        setStorage('irrig_events', this.irrigationEvents);
      }

      // 4. Fetch Disease Records
      const { data: remoteDisease, error: diseaseError } = await supabase
        .from('disease_records')
        .select('*')
        .order('detected_at', { ascending: false });

      if (!diseaseError && remoteDisease && remoteDisease.length > 0) {
        this.diseaseRecords = remoteDisease.map(d => ({
          id: d.id,
          farm_id: d.farm_id,
          zone_id: d.zone_id,
          crop_name: d.crop_name,
          image_url: d.image_url,
          possible_disease: d.possible_disease,
          confidence: Number(d.confidence),
          severity: d.severity as any,
          symptoms: d.symptoms,
          recommended_actions: d.recommended_actions,
          detected_at: d.detected_at
        }));
        setStorage('disease_records', this.diseaseRecords);
      }

      // 5. Fetch Community Posts
      const { data: remotePosts, error: postsError } = await supabase
        .from('community_posts')
        .select('*, community_comments(*)')
        .order('created_at', { ascending: false });

      if (!postsError && remotePosts && remotePosts.length > 0) {
        this.communityPosts = remotePosts.map(p => ({
          id: p.id,
          author_name: p.author_name,
          category: p.category as any,
          title: p.title,
          content: p.content,
          image_url: p.image_url,
          likes_count: p.likes_count || 0,
          created_at: p.created_at,
          comments: (p.community_comments || []).map((c: any) => ({
            id: c.id,
            post_id: c.post_id,
            author_name: c.author_name,
            comment: c.comment,
            created_at: c.created_at
          }))
        }));
        setStorage('community_posts', this.communityPosts);
      }

      // 6. Fetch Crops reference catalog
      const { data: remoteCrops, error: cropsError } = await supabase
        .from('crops')
        .select('*');

      if (!cropsError && remoteCrops && remoteCrops.length > 0) {
        this.crops = remoteCrops.map(c => ({
          id: c.id,
          name: c.name,
          category: c.category,
          duration_days: c.duration_days,
          water_requirement: c.water_requirement as any,
          optimal_soil_type: c.optimal_soil_type,
          optimal_ph_range: [Number(c.optimal_ph_min || 6.0), Number(c.optimal_ph_max || 7.0)],
          expected_yield_per_acre: c.expected_yield_per_acre,
          est_investment_per_acre: Number(c.est_investment_per_acre),
          est_revenue_per_acre: Number(c.est_revenue_per_acre),
          est_profit_per_acre: Number(c.est_profit_per_acre || 0),
          risk_level: c.risk_level as any,
          description: c.description
        }));
      }

      // 7. Fetch Crop Cycles
      const { data: remoteCycles, error: cyclesError } = await supabase
        .from('crop_cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!cyclesError && remoteCycles && remoteCycles.length > 0) {
        this.cropCycles = remoteCycles.map(c => ({
          id: c.id,
          farm_id: c.farm_id,
          zone_id: c.zone_id,
          crop_id: c.crop_id,
          crop_name: c.crop_name,
          sowing_date: c.sowing_date,
          expected_harvest_date: c.expected_harvest_date,
          current_stage: c.current_stage as any,
          notes: c.notes,
          created_at: c.created_at
        }));
        setStorage('crop_cycles', this.cropCycles);
      }

      // 8. Fetch Expenses
      const { data: remoteExpenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (!expError && remoteExpenses && remoteExpenses.length > 0) {
        this.expenses = remoteExpenses.map(e => ({
          id: e.id,
          farm_id: e.farm_id,
          category: e.category as any,
          amount: Number(e.amount),
          description: e.description,
          expense_date: e.expense_date,
          created_at: e.created_at
        }));
        setStorage('expenses', this.expenses);
      }

      // 9. Fetch Sensor Readings
      const { data: remoteSensors, error: sensorError } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!sensorError && remoteSensors && remoteSensors.length > 0) {
        this.sensorReadings = remoteSensors.map(s => ({
          id: s.id,
          farm_id: s.farm_id,
          zone_id: s.zone_id,
          sensor_type: s.sensor_type as any,
          value: Number(s.value),
          unit: s.unit,
          timestamp: s.timestamp
        }));
        setStorage('sensor_readings', this.sensorReadings);
      }

      this.notify();
      return true;
    } catch (err) {
      console.warn('Supabase sync exception, maintaining local cache:', err);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Active Farm
  getActiveFarmId(): string {
    return getStorage('active_farm_id', this.farms[0]?.id || INITIAL_FARMS[0].id);
  }

  setActiveFarmId(farmId: string): void {
    setStorage('active_farm_id', farmId);
    this.notify();
  }

  getFarms(): Farm[] {
    return this.farms;
  }

  /**
   * Add a farm: saves locally and pushes to Supabase PostgreSQL.
   */
  async addFarm(
    newFarm: Omit<Farm, 'id' | 'created_at'>,
    customZones?: Array<{
      zone_number: number;
      name: string;
      crop_name: string;
      area_acres: number;
      target_moisture: number;
      current_moisture?: number;
      pump_status?: boolean;
      pump_number?: number;
      priority?: 'High' | 'Medium' | 'Low';
      irrigation_mode?: 'AUTO' | 'MANUAL';
      estimated_daily_liters?: number;
    }>
  ): Promise<Farm> {
    const farmId = generateUUID();
    const farm: Farm = {
      ...newFarm,
      id: farmId,
      created_at: new Date().toISOString()
    };

    // Auto-create custom or default 3 segmented zones
    const createdZones: Zone[] = customZones && customZones.length > 0
      ? customZones.map((cz, idx) => ({
          id: generateUUID(),
          farm_id: farm.id,
          zone_number: cz.zone_number || (idx + 1),
          name: cz.name,
          crop_name: cz.crop_name,
          area_acres: cz.area_acres,
          target_moisture: cz.target_moisture || 50.0,
          current_moisture: cz.current_moisture !== undefined ? cz.current_moisture : (cz.target_moisture - 4),
          pump_status: Boolean(cz.pump_status),
          pump_number: cz.pump_number || (idx + 1),
          priority: cz.priority || (idx === 0 ? 'High' : 'Medium'),
          irrigation_mode: cz.irrigation_mode || 'AUTO',
          estimated_daily_liters: cz.estimated_daily_liters,
          status: 'NORMAL' as const
        }))
      : [
          {
            id: generateUUID(),
            farm_id: farm.id,
            zone_number: 1,
            name: `Zone 1 - Main Field`,
            crop_name: 'Primary Crop',
            area_acres: Math.round((farm.area_acres * 0.4) * 10) / 10,
            target_moisture: 50.0,
            current_moisture: 46.0,
            pump_status: false,
            pump_number: 1,
            priority: 'High',
            irrigation_mode: 'AUTO',
            status: 'NORMAL'
          },
          {
            id: generateUUID(),
            farm_id: farm.id,
            zone_number: 2,
            name: `Zone 2 - Secondary Plot`,
            crop_name: 'Secondary Crop',
            area_acres: Math.round((farm.area_acres * 0.35) * 10) / 10,
            target_moisture: 45.0,
            current_moisture: 44.0,
            pump_status: false,
            pump_number: 2,
            priority: 'Medium',
            irrigation_mode: 'AUTO',
            status: 'NORMAL'
          },
          {
            id: generateUUID(),
            farm_id: farm.id,
            zone_number: 3,
            name: `Zone 3 - Nursery / Fallow`,
            crop_name: 'Cover Crop',
            area_acres: Math.round((farm.area_acres * 0.25) * 10) / 10,
            target_moisture: 50.0,
            current_moisture: 50.0,
            pump_status: false,
            pump_number: 3,
            priority: 'Medium',
            irrigation_mode: 'AUTO',
            status: 'NORMAL'
          }
        ];

    // 1. Optimistic Local Persistence
    this.farms.push(farm);
    setStorage('farms', this.farms);
    this.zones.push(...createdZones);
    setStorage('zones', this.zones);
    this.notify();

    // 2. Persist to Supabase if connected
    if (supabase && isSupabaseConfigured) {
      try {
        const { error: farmErr } = await supabase.from('farms').insert({
          id: farm.id,
          name: farm.name,
          state: farm.state,
          district: farm.district,
          village_city: farm.village_city,
          area_acres: farm.area_acres,
          soil_type: farm.soil_type,
          soil_ph: farm.soil_ph,
          water_availability: farm.water_availability,
          irrigation_method: farm.irrigation_method,
          season: farm.season,
          crops_allocation: farm.crops_allocation
        });

        if (!farmErr) {
          await supabase.from('zones').insert(
            createdZones.map(z => ({
              id: z.id,
              farm_id: z.farm_id,
              zone_number: z.zone_number,
              name: z.name,
              crop_name: z.crop_name,
              area_acres: z.area_acres,
              target_moisture: z.target_moisture,
              current_moisture: z.current_moisture,
              pump_status: z.pump_status,
              pump_number: z.pump_number || z.zone_number,
              priority: z.priority || 'Medium',
              irrigation_mode: z.irrigation_mode || 'AUTO'
            }))
          );
        } else {
          console.warn('Supabase farm insert error:', farmErr);
        }
      } catch (err) {
        console.warn('Failed to insert farm into Supabase:', err);
      }
    }

    return farm;
  }

  /**
   * Update a farm's crop allocation and irrigation zones.
   */
  async updateFarmCropAllocationAndZones(
    farmId: string,
    cropsAllocation: CropAllocation[],
    newZones: Zone[]
  ): Promise<void> {
    const farmIdx = this.farms.findIndex(f => f.id === farmId);
    if (farmIdx !== -1) {
      this.farms[farmIdx] = {
        ...this.farms[farmIdx],
        crops_allocation: cropsAllocation
      };
      setStorage('farms', this.farms);
    }

    // Replace zones for this farm
    this.zones = this.zones.filter(z => z.farm_id !== farmId).concat(newZones);
    setStorage('zones', this.zones);
    this.notify();

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('farms')
          .update({ crops_allocation: cropsAllocation })
          .eq('id', farmId);

        await supabase.from('zones').delete().eq('farm_id', farmId);
        await supabase.from('zones').insert(
          newZones.map(z => ({
            id: z.id,
            farm_id: farmId,
            zone_number: z.zone_number,
            name: z.name,
            crop_name: z.crop_name,
            area_acres: z.area_acres,
            target_moisture: z.target_moisture,
            current_moisture: z.current_moisture,
            pump_status: z.pump_status,
            pump_number: z.pump_number || z.zone_number,
            priority: z.priority || 'Medium',
            irrigation_mode: z.irrigation_mode || 'AUTO'
          }))
        );
      } catch (err) {
        console.warn('Failed to update farm allocation in Supabase:', err);
      }
    }
  }

  /**
   * Update an existing farm in memory, local storage, and Supabase PostgreSQL.
   */
  async updateFarm(updatedFarm: Farm): Promise<Farm> {
    this.farms = this.farms.map(f => f.id === updatedFarm.id ? updatedFarm : f);
    setStorage('farms', this.farms);
    this.notify();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('farms')
          .update({
            name: updatedFarm.name,
            state: updatedFarm.state,
            district: updatedFarm.district,
            village_city: updatedFarm.village_city,
            area_acres: updatedFarm.area_acres,
            soil_type: updatedFarm.soil_type,
            soil_ph: updatedFarm.soil_ph,
            water_availability: updatedFarm.water_availability,
            irrigation_method: updatedFarm.irrigation_method,
            season: updatedFarm.season
          })
          .eq('id', updatedFarm.id);

        if (error) {
          console.warn('Supabase updateFarm error:', error);
        }
      } catch (err) {
        console.warn('Failed to update farm in Supabase:', err);
      }
    }

    return updatedFarm;
  }

  /**
   * Delete a farm from Supabase (cascading) and clean up local cache.
   */
  async deleteFarm(farmId: string): Promise<boolean> {
    // 1. Delete from Supabase (foreign keys ON DELETE CASCADE handle children)
    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('farms')
          .delete()
          .eq('id', farmId);

        if (error) {
          console.warn('Supabase deleteFarm error:', error);
        }
      } catch (err) {
        console.warn('Failed to delete farm from Supabase:', err);
      }
    }

    // 2. Clean up in-memory and local storage
    this.farms = this.farms.filter(f => f.id !== farmId);
    setStorage('farms', this.farms);

    this.zones = this.zones.filter(z => z.farm_id !== farmId);
    setStorage('zones', this.zones);

    this.irrigationEvents = this.irrigationEvents.filter(e => e.farm_id !== farmId);
    setStorage('irrig_events', this.irrigationEvents);

    this.cropCycles = this.cropCycles.filter(c => c.farm_id !== farmId);
    setStorage('crop_cycles', this.cropCycles);

    this.expenses = this.expenses.filter(e => e.farm_id !== farmId);
    setStorage('expenses', this.expenses);

    this.diseaseRecords = this.diseaseRecords.filter(d => d.farm_id !== farmId);
    setStorage('disease_records', this.diseaseRecords);

    this.sensorReadings = this.sensorReadings.filter(s => s.farm_id !== farmId);
    setStorage('sensor_readings', this.sensorReadings);

    // If deleted farm was the active farm, select the first available farm
    if (this.getActiveFarmId() === farmId && this.farms.length > 0) {
      this.setActiveFarmId(this.farms[0].id);
    }

    this.notify();
    return true;
  }

  getZones(farmId?: string): Zone[] {
    const targetFarm = farmId || this.getActiveFarmId();
    return this.zones.filter(z => z.farm_id === targetFarm);
  }

  async updateZone(updatedZone: Zone): Promise<void> {
    this.zones = this.zones.map(z => z.id === updatedZone.id ? updatedZone : z);
    setStorage('zones', this.zones);
    this.notify();

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('zones')
          .update({
            current_moisture: updatedZone.current_moisture,
            target_moisture: updatedZone.target_moisture,
            pump_status: updatedZone.pump_status
          })
          .eq('id', updatedZone.id);
      } catch (err) {
        console.warn('Failed to update zone in Supabase:', err);
      }
    }
  }

  getCrops(): Crop[] {
    return this.crops;
  }

  getIrrigationEvents(farmId?: string): IrrigationEvent[] {
    const targetFarm = farmId || this.getActiveFarmId();
    return this.irrigationEvents.filter(e => e.farm_id === targetFarm);
  }

  /**
   * Add irrigation event: saves locally and writes to Supabase PostgreSQL.
   */
  async addIrrigationEvent(event: Omit<IrrigationEvent, 'id'>): Promise<IrrigationEvent> {
    const newEvent: IrrigationEvent = {
      ...event,
      id: generateUUID()
    };

    // 1. Optimistic local persistence
    this.irrigationEvents.unshift(newEvent);
    setStorage('irrig_events', this.irrigationEvents);
    this.notify();

    // 2. Persist to Supabase if connected
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('irrigation_events').insert({
          id: newEvent.id,
          farm_id: newEvent.farm_id,
          zone_id: newEvent.zone_id,
          zone_name: newEvent.zone_name,
          pump_id: newEvent.pump_id,
          mode: newEvent.mode,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          duration_minutes: newEvent.duration_minutes,
          water_used_liters: newEvent.water_used_liters,
          starting_moisture: newEvent.starting_moisture,
          ending_moisture: newEvent.ending_moisture,
          avg_flow_rate: newEvent.avg_flow_rate
        });

        // Also record a sensor telemetry log
        await supabase.from('sensor_readings').insert([
          {
            farm_id: newEvent.farm_id,
            zone_id: newEvent.zone_id,
            sensor_type: 'soil_moisture',
            value: newEvent.ending_moisture,
            unit: '%'
          },
          {
            farm_id: newEvent.farm_id,
            zone_id: newEvent.zone_id,
            sensor_type: 'flow_rate',
            value: newEvent.avg_flow_rate,
            unit: 'L/min'
          }
        ]);
      } catch (err) {
        console.warn('Failed to insert irrigation event into Supabase:', err);
      }
    }

    return newEvent;
  }

  getDiseaseRecords(farmId?: string): DiseaseRecord[] {
    const targetFarm = farmId || this.getActiveFarmId();
    return this.diseaseRecords.filter(d => d.farm_id === targetFarm);
  }

  /**
   * Add disease record: optionally uploads image to Supabase Storage and records to PostgreSQL.
   */
  async addDiseaseRecord(
    record: Omit<DiseaseRecord, 'id' | 'detected_at'>,
    imageBlob?: Blob | File
  ): Promise<DiseaseRecord> {
    let finalImageUrl = record.image_url;

    // Upload to Supabase Storage if file is present
    if (imageBlob) {
      const uploadedUrl = await uploadToSupabaseStorage('disease-images', imageBlob, `leaf_${Date.now()}.jpg`);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
    }

    const newRecord: DiseaseRecord = {
      ...record,
      image_url: finalImageUrl,
      id: generateUUID(),
      detected_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.diseaseRecords.unshift(newRecord);
    setStorage('disease_records', this.diseaseRecords);
    this.notify();

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('disease_records').insert({
          id: newRecord.id,
          farm_id: newRecord.farm_id,
          zone_id: newRecord.zone_id || null,
          crop_name: newRecord.crop_name,
          image_url: newRecord.image_url,
          possible_disease: newRecord.possible_disease,
          confidence: newRecord.confidence,
          severity: newRecord.severity,
          symptoms: newRecord.symptoms,
          recommended_actions: newRecord.recommended_actions
        });
      } catch (err) {
        console.warn('Failed to insert disease record to Supabase:', err);
      }
    }

    return newRecord;
  }

  getCommunityPosts(): CommunityPost[] {
    return this.communityPosts;
  }

  async addCommunityPost(
    post: Omit<CommunityPost, 'id' | 'likes_count' | 'created_at' | 'comments'>
  ): Promise<CommunityPost> {
    const newPost: CommunityPost = {
      ...post,
      id: generateUUID(),
      likes_count: 0,
      created_at: 'Just now',
      comments: []
    };

    this.communityPosts.unshift(newPost);
    setStorage('community_posts', this.communityPosts);
    this.notify();

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('community_posts').insert({
          id: newPost.id,
          author_name: newPost.author_name,
          category: newPost.category,
          title: newPost.title,
          content: newPost.content,
          image_url: newPost.image_url || null,
          likes_count: 0
        });
      } catch (err) {
        console.warn('Failed to insert community post into Supabase:', err);
      }
    }

    return newPost;
  }

  async toggleLikePost(postId: string): Promise<void> {
    const p = this.communityPosts.find(post => post.id === postId);
    if (p) {
      p.liked_by_user = !p.liked_by_user;
      p.likes_count += p.liked_by_user ? 1 : -1;
      setStorage('community_posts', this.communityPosts);
      this.notify();

      if (supabase && isSupabaseConfigured) {
        try {
          await supabase
            .from('community_posts')
            .update({ likes_count: p.likes_count })
            .eq('id', postId);
        } catch (err) {
          console.warn('Failed to update likes in Supabase:', err);
        }
      }
    }
  }

  async addComment(postId: string, authorName: string, commentText: string): Promise<void> {
    const p = this.communityPosts.find(post => post.id === postId);
    if (p) {
      const commentId = generateUUID();
      const newComment = {
        id: commentId,
        post_id: postId,
        author_name: authorName,
        comment: commentText,
        created_at: 'Just now'
      };

      p.comments.push(newComment);
      setStorage('community_posts', this.communityPosts);
      this.notify();

      if (supabase && isSupabaseConfigured) {
        try {
          await supabase.from('community_comments').insert({
            id: commentId,
            post_id: postId,
            author_name: authorName,
            comment: commentText
          });
        } catch (err) {
          console.warn('Failed to insert comment into Supabase:', err);
        }
      }
    }
  }

  // Expenses CRUD
  getExpenses(farmId?: string): Expense[] {
    const targetFarm = farmId || this.getActiveFarmId();
    return this.expenses.filter(e => e.farm_id === targetFarm);
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('expenses').insert({
          id: newExpense.id,
          farm_id: newExpense.farm_id,
          category: newExpense.category,
          amount: newExpense.amount,
          description: newExpense.description || null,
          expense_date: newExpense.expense_date
        });
      } catch (err) {
        console.warn('Failed to insert expense into Supabase:', err);
      }
    }

    this.expenses.unshift(newExpense);
    setStorage('expenses', this.expenses);
    this.notify();
    return newExpense;
  }

  // Crop Cycles CRUD
  getCropCycles(farmId?: string): CropCycle[] {
    const targetFarm = farmId || this.getActiveFarmId();
    return this.cropCycles.filter(c => c.farm_id === targetFarm);
  }

  async addCropCycle(cycle: Omit<CropCycle, 'id'>): Promise<CropCycle> {
    const newCycle: CropCycle = {
      ...cycle,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('crop_cycles').insert({
          id: newCycle.id,
          farm_id: newCycle.farm_id,
          zone_id: newCycle.zone_id,
          crop_id: newCycle.crop_id || null,
          crop_name: newCycle.crop_name,
          sowing_date: newCycle.sowing_date,
          expected_harvest_date: newCycle.expected_harvest_date || null,
          current_stage: newCycle.current_stage,
          notes: newCycle.notes || null,
          plan_data: newCycle.plan_data || null
        });
      } catch (err) {
        console.warn('Failed to insert crop cycle into Supabase:', err);
      }
    }

    this.cropCycles.unshift(newCycle);
    setStorage('crop_cycles', this.cropCycles);
    this.notify();
    return newCycle;
  }

  // Sensor Readings Telemetry
  getSensorReadings(farmId?: string, zoneId?: string): SensorReadingRecord[] {
    const targetFarm = farmId || this.getActiveFarmId();
    return this.sensorReadings.filter(s => {
      if (s.farm_id !== targetFarm) return false;
      if (zoneId && s.zone_id !== zoneId) return false;
      return true;
    });
  }

  async addSensorReading(reading: Omit<SensorReadingRecord, 'id' | 'timestamp'>): Promise<SensorReadingRecord> {
    const newReading: SensorReadingRecord = {
      ...reading,
      id: generateUUID(),
      timestamp: new Date().toISOString()
    };

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('sensor_readings').insert({
          id: newReading.id,
          farm_id: newReading.farm_id,
          zone_id: newReading.zone_id || null,
          sensor_type: newReading.sensor_type,
          value: newReading.value,
          unit: newReading.unit
        });
      } catch (err) {
        console.warn('Failed to insert sensor reading into Supabase:', err);
      }
    }

    this.sensorReadings.unshift(newReading);
    setStorage('sensor_readings', this.sensorReadings);
    this.notify();
    return newReading;
  }
}

export const dataService = new DataService();

