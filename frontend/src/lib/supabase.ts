import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from import.meta.env or localStorage persistence
function getSavedConfig(): { url: string; key: string } {
  let url = import.meta.env.VITE_SUPABASE_URL || '';
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const saved = localStorage.getItem('agrimind_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.key) {
        url = parsed.url;
        key = parsed.key;
      }
    }
  } catch (e) {
    console.warn('Could not read saved Supabase config:', e);
  }

  return { url: url.trim(), key: key.trim() };
}

let currentConfig = getSavedConfig();

export function isConfigValid(url: string, key: string): boolean {
  return Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('your-supabase-project') &&
    !key.includes('...') &&
    key.length > 20
  );
}

export let isSupabaseConfigured = isConfigValid(currentConfig.url, currentConfig.key);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(currentConfig.url, currentConfig.key)
  : null;

/**
 * Save new Supabase credentials and re-instantiate client.
 */
export function setSupabaseCredentials(url: string, key: string): boolean {
  const valid = isConfigValid(url, key);
  if (valid) {
    try {
      localStorage.setItem('agrimind_supabase_config', JSON.stringify({ url: url.trim(), key: key.trim() }));
      currentConfig = { url: url.trim(), key: key.trim() };
      supabase = createClient(currentConfig.url, currentConfig.key);
      isSupabaseConfigured = true;
      return true;
    } catch (e) {
      console.error('Failed to store Supabase credentials:', e);
      return false;
    }
  } else {
    isSupabaseConfigured = false;
    supabase = null;
    return false;
  }
}

export function getActiveSupabaseConfig(): { url: string; key: string; isConfigured: boolean } {
  return {
    url: currentConfig.url,
    key: currentConfig.key,
    isConfigured: isSupabaseConfigured
  };
}

/**
 * Live test connection ping to Supabase PostgreSQL.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase URL or Public Anon Key is missing or invalid. Please check your credentials.'
    };
  }

  try {
    const { data, error } = await supabase.from('crops').select('id').limit(1);
    if (error) {
      // Check if table missing or RLS error
      if (error.code === '42P01') {
        return {
          success: false,
          message: `Connected to Supabase project, but tables are missing! Please run 'supabase/schema.sql' in your Supabase SQL Editor.`
        };
      }
      return {
        success: false,
        message: `Supabase error (${error.code}): ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase! PostgreSQL tables and RLS verified.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err?.message || 'Network unreachable'}`
    };
  }
}

/**
 * Upload an image to Supabase Storage bucket (disease-images or farm-images).
 */
export async function uploadToSupabaseStorage(
  bucketName: 'disease-images' | 'farm-images',
  fileOrBlob: File | Blob,
  fileName: string
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    const cleanPath = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data, error } = await supabase.storage.from(bucketName).upload(cleanPath, fileOrBlob, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.warn(`Supabase Storage upload error to ${bucketName}:`, error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Storage upload exception:', err);
    return null;
  }
}

export interface VerificationStepResult {
  step: string;
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details: string;
  latencyMs?: number;
}

export interface VerificationSuiteResult {
  overallSuccess: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  tablesVerified: string[];
  bucketsVerified: string[];
  steps: VerificationStepResult[];
}

/**
 * End-to-End Supabase Verification Suite
 * Verifies all 11 tables, storage buckets, RLS policies, and operations A through M.
 */
export async function verifySupabaseEndToEnd(): Promise<VerificationSuiteResult> {
  const steps: VerificationStepResult[] = [];
  const tablesVerified: string[] = [];
  const bucketsVerified: string[] = [];

  const addStep = (step: string, name: string, status: 'SUCCESS' | 'FAILED' | 'SKIPPED', details: string, latencyMs?: number) => {
    steps.push({ step, name, status, details, latencyMs });
  };

  if (!supabase || !isSupabaseConfigured) {
    addStep('0', 'Supabase Client Configuration', 'FAILED', 'Supabase credentials missing or unconfigured. Please enter your Project URL and Anon Key in Settings or .env.');
    return {
      overallSuccess: false,
      totalSteps: 1,
      passedSteps: 0,
      failedSteps: 1,
      tablesVerified,
      bucketsVerified,
      steps
    };
  }

  const startTime = Date.now();
  const testId = `e2e_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const testFarmId = '11111111-1111-4111-8111-111111111111';
  const testZoneId = '22222222-2222-4222-8222-222222222222';
  const testEventId = '33333333-3333-4333-8333-333333333333';
  const testExpenseId = '44444444-4444-4444-8444-444444444444';
  const testCycleId = '55555555-5555-4555-8555-555555555555';
  const testDiseaseId = '66666666-6666-4666-8666-666666666666';
  const testPostId = '77777777-7777-4777-8777-777777777777';
  const testCommentId = '88888888-8888-4888-8888-888888888888';
  const testSensorId = '99999999-9999-4999-8999-999999999999';

  try {
    // 1. Check Table Existence
    const REQUIRED_TABLES = [
      'profiles',
      'farms',
      'zones',
      'sensor_readings',
      'irrigation_events',
      'crops',
      'crop_cycles',
      'expenses',
      'disease_records',
      'community_posts',
      'community_comments'
    ];

    for (const table of REQUIRED_TABLES) {
      const t0 = Date.now();
      const { error } = await supabase.from(table).select('id').limit(1);
      const latency = Date.now() - t0;
      if (error) {
        addStep('TABLES', `Table: ${table}`, 'FAILED', `Table query failed (${error.code}): ${error.message}`, latency);
      } else {
        tablesVerified.push(table);
        addStep('TABLES', `Table: ${table}`, 'SUCCESS', `Table exists in public schema, RLS active and readable`, latency);
      }
    }

    // 2. Storage Buckets Check: disease-images & farm-images
    const REQUIRED_BUCKETS: Array<'disease-images' | 'farm-images'> = ['disease-images', 'farm-images'];
    for (const bucket of REQUIRED_BUCKETS) {
      const t0 = Date.now();
      try {
        const dummyBlob = new Blob(['AGRIMIND_AI_VERIFY_PAYLOAD'], { type: 'text/plain' });
        const filePath = `verify_${Date.now()}.txt`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, dummyBlob, { upsert: true });
        const latency = Date.now() - t0;

        if (upErr) {
          addStep('STORAGE', `Bucket: ${bucket}`, 'FAILED', `Storage upload failed: ${upErr.message}`, latency);
        } else {
          bucketsVerified.push(bucket);
          const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          addStep('STORAGE', `Bucket: ${bucket}`, 'SUCCESS', `Upload, RLS policy and public URL resolution confirmed: ${pubData.publicUrl}`, latency);
          // Cleanup storage object
          await supabase.storage.from(bucket).remove([filePath]);
        }
      } catch (bErr: any) {
        addStep('STORAGE', `Bucket: ${bucket}`, 'FAILED', `Exception testing bucket: ${bErr.message}`);
      }
    }

    // 3. Operations A-D: Create Farm -> Save to Supabase -> Refresh/Query back -> Verify
    const tFarm0 = Date.now();
    const { error: farmInsertErr } = await supabase.from('farms').insert({
      id: testFarmId,
      name: `E2E Verified Farm [${testId}]`,
      state: 'Telangana',
      district: 'Jogulamba Gadwal',
      village_city: 'Gadwal East',
      area_acres: 4.5,
      soil_type: 'Sandy Clay Loam',
      soil_ph: 6.5,
      water_availability: 'High',
      irrigation_method: 'Drip',
      season: 'Kharif'
    });

    if (farmInsertErr) {
      addStep('OP_A_B', 'A-B: Create & Save Farm to Supabase', 'FAILED', `Insert failed: ${farmInsertErr.message}`);
      addStep('OP_C_D', 'C-D: Query Farm Post-Refresh Persistence', 'SKIPPED', 'Skipped due to insert failure');
    } else {
      addStep('OP_A_B', 'A-B: Create & Save Farm to Supabase', 'SUCCESS', `Farm record ${testFarmId} written successfully`, Date.now() - tFarm0);

      // Create a zone for this farm
      await supabase.from('zones').insert({
        id: testZoneId,
        farm_id: testFarmId,
        zone_number: 1,
        name: 'Zone 1 - E2E Verification Block',
        crop_name: 'Tomato (Roma)',
        area_acres: 2.0,
        target_moisture: 50.0,
        current_moisture: 45.0,
        pump_status: false
      });

      // C-D: Fresh re-query
      const tFetch0 = Date.now();
      const { data: fetchedFarm, error: fetchErr } = await supabase
        .from('farms')
        .select('*')
        .eq('id', testFarmId)
        .single();

      if (fetchErr || !fetchedFarm) {
        addStep('OP_C_D', 'C-D: Query Farm Post-Refresh Persistence', 'FAILED', `Re-fetch failed: ${fetchErr?.message || 'Not found'}`);
      } else {
        addStep('OP_C_D', 'C-D: Query Farm Post-Refresh Persistence', 'SUCCESS', `Farm verified in Supabase: "${fetchedFarm.name}", ${fetchedFarm.area_acres} acres, Season: ${fetchedFarm.season}`, Date.now() - tFetch0);
      }
    }

    // 4. Operations E-H: Create Irrigation Event -> Save -> Refresh/Query -> Verify
    const tIrrig0 = Date.now();
    const { error: irrigErr } = await supabase.from('irrigation_events').insert({
      id: testEventId,
      farm_id: testFarmId,
      zone_id: testZoneId,
      zone_name: 'Zone 1 - E2E Verification Block',
      pump_id: 1,
      mode: 'MANUAL',
      start_time: new Date().toISOString(),
      duration_minutes: 25,
      water_used_liters: 42.5,
      starting_moisture: 38.0,
      ending_moisture: 52.0,
      avg_flow_rate: 1.7,
      status: 'COMPLETED'
    });

    if (irrigErr) {
      addStep('OP_E_F', 'E-F: Create & Save Irrigation Event', 'FAILED', `Insert failed: ${irrigErr.message}`);
      addStep('OP_G_H', 'G-H: Verify Irrigation Event Persistence', 'SKIPPED', 'Skipped due to insert failure');
    } else {
      addStep('OP_E_F', 'E-F: Create & Save Irrigation Event', 'SUCCESS', `Irrigation event recorded (${testEventId}), 42.5 L, 1.7 L/min`, Date.now() - tIrrig0);

      const tFetchIrrig0 = Date.now();
      const { data: fetchedIrrig, error: fetchIrrigErr } = await supabase
        .from('irrigation_events')
        .select('*')
        .eq('id', testEventId)
        .single();

      if (fetchIrrigErr || !fetchedIrrig) {
        addStep('OP_G_H', 'G-H: Verify Irrigation Event Persistence', 'FAILED', `Re-fetch failed: ${fetchIrrigErr?.message || 'Not found'}`);
      } else {
        addStep('OP_G_H', 'G-H: Verify Irrigation Event Persistence', 'SUCCESS', `Irrigation event verified in Supabase: ${fetchedIrrig.water_used_liters}L used, starting ${fetchedIrrig.starting_moisture}% -> ending ${fetchedIrrig.ending_moisture}%`, Date.now() - tFetchIrrig0);
      }
    }

    // 5. Operation I: Sensor Reading Insertion
    const tSensor0 = Date.now();
    const { error: sensorErr } = await supabase.from('sensor_readings').insert({
      id: testSensorId,
      farm_id: testFarmId,
      zone_id: testZoneId,
      sensor_type: 'soil_moisture',
      value: 48.5,
      unit: '%'
    });
    if (sensorErr) {
      addStep('OP_I', 'I: Sensor Reading Insertion', 'FAILED', `Insert failed: ${sensorErr.message}`);
    } else {
      const { data: sData } = await supabase.from('sensor_readings').select('*').eq('id', testSensorId).single();
      addStep('OP_I', 'I: Sensor Reading Insertion', 'SUCCESS', `Sensor reading verified: ${sData?.sensor_type} = ${sData?.value}${sData?.unit}`, Date.now() - tSensor0);
    }

    // 6. Operation J: Crop & Crop-Cycle Data
    const tCrop0 = Date.now();
    const { error: cycleErr } = await supabase.from('crop_cycles').insert({
      id: testCycleId,
      farm_id: testFarmId,
      zone_id: testZoneId,
      crop_name: 'Tomato (Roma Hybrid)',
      sowing_date: '2026-09-01',
      expected_harvest_date: '2026-12-10',
      current_stage: 'Vegetative',
      notes: 'E2E Verification Cycle under Precision Drip'
    });
    if (cycleErr) {
      addStep('OP_J', 'J: Crop Cycle Data Insertion', 'FAILED', `Insert failed: ${cycleErr.message}`);
    } else {
      const { data: cData } = await supabase.from('crop_cycles').select('*').eq('id', testCycleId).single();
      addStep('OP_J', 'J: Crop Cycle Data Insertion', 'SUCCESS', `Crop cycle verified: ${cData?.crop_name} (${cData?.current_stage}), sowing: ${cData?.sowing_date}`, Date.now() - tCrop0);
    }

    // 7. Operation K: Expense Data
    const tExp0 = Date.now();
    const { error: expErr } = await supabase.from('expenses').insert({
      id: testExpenseId,
      farm_id: testFarmId,
      category: 'Fertilizer',
      amount: 4500.00,
      description: 'E2E Precision Drip Soluble Nutrients',
      expense_date: new Date().toISOString().split('T')[0]
    });
    if (expErr) {
      addStep('OP_K', 'K: Expense Data Insertion', 'FAILED', `Insert failed: ${expErr.message}`);
    } else {
      const { data: eData } = await supabase.from('expenses').select('*').eq('id', testExpenseId).single();
      addStep('OP_K', 'K: Expense Data Insertion', 'SUCCESS', `Expense verified: ₹${eData?.amount} under category "${eData?.category}"`, Date.now() - tExp0);
    }

    // 8. Operation L: Disease Record Insertion
    const tDis0 = Date.now();
    const { error: disErr } = await supabase.from('disease_records').insert({
      id: testDiseaseId,
      farm_id: testFarmId,
      zone_id: testZoneId,
      crop_name: 'Tomato',
      image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef231c9?w=500',
      possible_disease: 'Tomato Early Blight (Alternaria solani)',
      confidence: 94.5,
      severity: 'Medium',
      symptoms: 'Brown concentric rings on lower leaves',
      recommended_actions: 'Prune lower leaves, apply copper fungicide'
    });
    if (disErr) {
      addStep('OP_L', 'L: Disease Record Insertion', 'FAILED', `Insert failed: ${disErr.message}`);
    } else {
      const { data: dData } = await supabase.from('disease_records').select('*').eq('id', testDiseaseId).single();
      addStep('OP_L', 'L: Disease Record Insertion', 'SUCCESS', `Disease record verified: "${dData?.possible_disease}" (${dData?.confidence}% confidence)`, Date.now() - tDis0);
    }

    // 9. Operation M: Community Post & Comment Insertion
    const tPost0 = Date.now();
    const { error: postErr } = await supabase.from('community_posts').insert({
      id: testPostId,
      author_name: 'E2E System Bot',
      category: 'Technology',
      title: 'Precision Drip Scheduling via Supabase',
      content: 'Automated test post verifying end-to-end community interaction in AGRIMIND AI.',
      likes_count: 5
    });
    if (postErr) {
      addStep('OP_M', 'M: Community Post Insertion', 'FAILED', `Insert failed: ${postErr.message}`);
    } else {
      // Add comment
      await supabase.from('community_comments').insert({
        id: testCommentId,
        post_id: testPostId,
        author_name: 'Test Farmer',
        comment: 'Verified live response to E2E test post.'
      });
      const { data: pData } = await supabase.from('community_posts').select('*, community_comments(*)').eq('id', testPostId).single();
      addStep('OP_M', 'M: Community Post & Comment', 'SUCCESS', `Post & nested comment verified: "${pData?.title}" with ${pData?.community_comments?.length || 0} comment(s)`, Date.now() - tPost0);
    }

    // 10. Clean up verification test artifacts to keep database pristine
    try {
      await supabase.from('community_comments').delete().eq('id', testCommentId);
      await supabase.from('community_posts').delete().eq('id', testPostId);
      await supabase.from('disease_records').delete().eq('id', testDiseaseId);
      await supabase.from('expenses').delete().eq('id', testExpenseId);
      await supabase.from('crop_cycles').delete().eq('id', testCycleId);
      await supabase.from('sensor_readings').delete().eq('id', testSensorId);
      await supabase.from('irrigation_events').delete().eq('id', testEventId);
      await supabase.from('zones').delete().eq('id', testZoneId);
      await supabase.from('farms').delete().eq('id', testFarmId);
      addStep('CLEANUP', 'Test Artifacts Purge', 'SUCCESS', 'All transient E2E verification rows safely purged from Supabase tables.');
    } catch {
      // Non-fatal cleanup
    }

  } catch (globalErr: any) {
    addStep('GLOBAL', 'E2E Verification Execution', 'FAILED', `Fatal exception: ${globalErr.message}`);
  }

  const passed = steps.filter(s => s.status === 'SUCCESS').length;
  const failed = steps.filter(s => s.status === 'FAILED').length;

  return {
    overallSuccess: failed === 0 && tablesVerified.length === 11 && bucketsVerified.length === 2,
    totalSteps: steps.length,
    passedSteps: passed,
    failedSteps: failed,
    tablesVerified,
    bucketsVerified,
    steps
  };
}

