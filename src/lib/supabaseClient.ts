import { createClient } from '@supabase/supabase-js';
import { Resident } from '../types';

// User's Supabase Project Configuration
const RAW_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://jjaduhfcetzhzwmcjuri.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYWR1aGZjZXR6aHp3bWNqdXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTYwMDksImV4cCI6MjEwMjI3MjAwOX0.eUCwj5RC-Tixnte7RrEDyUQ3FbY_WufP3MaVkQVsaek';

// Automatically normalize URL by stripping any appended '/rest/v1' or trailing slashes
const sanitizeSupabaseUrl = (url: string) => {
  if (!url) return 'https://jjaduhfcetzhzwmcjuri.supabase.co';
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

export const SUPABASE_URL = sanitizeSupabaseUrl(RAW_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Deterministic UUID generator for string IDs (e.g. 'res_1' -> UUID)
 */
export const toValidUuid = (id?: string): string => {
  if (!id) return '00000000-0000-4000-8000-000000000001';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 1597334677) ^ Math.imul(h3 ^ (h3 >>> 13), 2654435761);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2654435761) ^ Math.imul(h4 ^ (h4 >>> 13), 1597334677);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 3266489909) ^ Math.imul(h1 ^ (h1 >>> 13), 2246822507);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');
  const fullHex = (hex1 + hex2 + hex3 + hex4).slice(0, 32);

  return [
    fullHex.substring(0, 8),
    fullHex.substring(8, 12),
    '4' + fullHex.substring(13, 16),
    'a' + fullHex.substring(17, 20),
    fullHex.substring(20, 32),
  ].join('-');
};

/**
 * Transforms client Resident object into Supabase PostgreSQL row format
 */
export const residentToSupabaseRow = (resident: Partial<Resident>) => {
  return {
    ...(resident.id ? { id: toValidUuid(resident.id) } : {}),
    full_name: resident.fullName,
    preferred_name: resident.preferredName || resident.fullName?.split(' ')[0],
    room_number: resident.roomNumber,
    bed_number: resident.bedNumber || 'Bed 01',
    age: resident.age || 80,
    avatar_url: resident.photoUrl || '',
    photo_url: resident.photoUrl || '',
    dietary_notes: resident.dietaryRestrictions || 'Standard balanced, soft texture',
    dietary_restrictions: resident.dietaryRestrictions || 'Standard balanced, soft texture',
    primary_contact_name: resident.familyContactName || 'Family Member',
    primary_contact_phone: resident.familyContactPhone || '',
    primary_contact_relationship: resident.familyContactRelation || 'Family Member',
    family_contact_name: resident.familyContactName || 'Family Member',
    family_contact_relation: resident.familyContactRelation || 'Family Member',
    family_contact_email: resident.familyContactEmail || '',
    family_contact_phone: resident.familyContactPhone || '',
    medical_notes: resident.medicalNotes || 'Assisted living general care plan.',
    care_plan: resident.carePlan || ['Routine vitals check', 'Nutritional monitoring', 'Hydration schedule'],
    assigned_caregiver_name: resident.assignedCaregiverName || 'Caregiver Staff',
    admission_date: resident.admissionDate || new Date().toISOString().split('T')[0],
    is_active: true,
  };
};

/**
 * Transforms Supabase row into client Resident interface
 */
export const supabaseRowToResident = (row: any): Resident => {
  return {
    id: String(row.id),
    fullName: row.full_name || row.fullName || 'Resident',
    preferredName: row.preferred_name || row.preferredName || row.full_name?.split(' ')[0] || 'Resident',
    roomNumber: String(row.room_number || row.roomNumber || '101'),
    bedNumber: row.bed_number || row.bedNumber || 'Bed 01',
    age: Number(row.age) || 80,
    photoUrl: row.avatar_url || row.photo_url || row.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    medicalNotes: row.medical_notes || row.medicalNotes || '',
    carePlan: Array.isArray(row.care_plan) ? row.care_plan : (row.carePlan || ['Routine vitals check']),
    dietaryRestrictions: row.dietary_notes || row.dietary_restrictions || row.dietaryRestrictions || 'Standard balanced',
    assignedCaregiverId: row.assigned_caregiver_id || row.assignedCaregiverId || 'user_care_1',
    assignedCaregiverName: row.assigned_caregiver_name || row.assignedCaregiverName || 'Caregiver Staff',
    familyContactName: row.primary_contact_name || row.family_contact_name || row.familyContactName || 'Family Contact',
    familyContactRelation: row.primary_contact_relationship || row.family_contact_relation || row.familyContactRelation || 'Family Member',
    familyContactEmail: row.family_contact_email || row.familyContactEmail || '',
    familyContactPhone: row.primary_contact_phone || row.family_contact_phone || row.familyContactPhone || '',
    admissionDate: row.admission_date || row.admissionDate || new Date().toISOString().split('T')[0],
  };
};

// In-memory cache of columns discovered to be missing from the remote Supabase schema
const cachedMissingColumns = new Set<string>();

/**
 * Extracts missing column name from Supabase / PostgREST / Postgres error strings
 */
const extractMissingColumnFromError = (errorMessage?: string): string | null => {
  if (!errorMessage) return null;
  const match =
    errorMessage.match(/Could not find the '([^']+)' column/i) ||
    errorMessage.match(/Could not find the "([^"]+)" column/i) ||
    errorMessage.match(/column ["']?([^"'\s]+)["']? of relation/i) ||
    errorMessage.match(/column ["']?([^"'\s]+)["']? does not exist/i) ||
    errorMessage.match(/column ["']?([^"'\s]+)["']? not found/i);
  return match ? match[1] : null;
};

/**
 * Helper to safely upsert rows into Supabase with automatic schema-cache column fallback.
 * If columns like 'admission_date' or 'photo_url' are missing in the user's PostgreSQL schema,
 * it automatically strips missing fields and retries until the upsert matches the live database columns.
 */
const safeUpsertResidentsTable = async (
  rows: any[],
  maxRetries = 25
): Promise<{ data: any; error: any }> => {
  // Pre-strip any columns already known to be missing
  let currentRows = rows.map((r) => {
    const clean: any = { ...r };
    cachedMissingColumns.forEach((col) => {
      delete clean[col];
    });
    return clean;
  });

  let attempt = 0;

  while (attempt <= maxRetries) {
    const { data, error } = await supabase
      .from('residents')
      .upsert(currentRows, { onConflict: 'id' })
      .select();

    if (!error) {
      return { data, error: null };
    }

    // Check if the error is due to a missing column in Supabase's schema cache
    const missingCol = extractMissingColumnFromError(error.message);
    if (missingCol) {
      cachedMissingColumns.add(missingCol);
      console.warn(`[Supabase Auto-Heal] Column '${missingCol}' not found in Supabase schema. Stripping and retrying upsert...`);
      currentRows = currentRows.map((r) => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      attempt++;
      continue;
    }

    // Non-column error or retries exhausted
    return { data: null, error };
  }

  return { data: null, error: { message: 'Max schema retry attempts exceeded' } };
};

/**
 * Upserts a single resident directly to Supabase with auto-fallback
 */
export const syncResidentToSupabase = async (resident: Resident): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const row = residentToSupabaseRow(resident);
    const { data, error } = await safeUpsertResidentsTable([row]);

    if (error) {
      console.warn('Supabase upsert note:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.warn('Supabase sync network error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
};

/**
 * Updates a resident in Supabase with auto-fallback for missing columns
 */
export const updateResidentInSupabase = async (
  residentId: string,
  updates: Partial<Resident>
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const rowUpdates: any = {};
    if (updates.fullName !== undefined) rowUpdates.full_name = updates.fullName;
    if (updates.preferredName !== undefined) rowUpdates.preferred_name = updates.preferredName;
    if (updates.roomNumber !== undefined) rowUpdates.room_number = updates.roomNumber;
    if (updates.bedNumber !== undefined) rowUpdates.bed_number = updates.bedNumber;
    if (updates.age !== undefined) rowUpdates.age = updates.age;
    if (updates.dietaryRestrictions !== undefined) {
      rowUpdates.dietary_notes = updates.dietaryRestrictions;
      rowUpdates.dietary_restrictions = updates.dietaryRestrictions;
    }
    if (updates.medicalNotes !== undefined) rowUpdates.medical_notes = updates.medicalNotes;
    if (updates.carePlan !== undefined) rowUpdates.care_plan = updates.carePlan;
    if (updates.assignedCaregiverName !== undefined) rowUpdates.assigned_caregiver_name = updates.assignedCaregiverName;
    if (updates.familyContactName !== undefined) {
      rowUpdates.primary_contact_name = updates.familyContactName;
      rowUpdates.family_contact_name = updates.familyContactName;
    }
    if (updates.familyContactRelation !== undefined) {
      rowUpdates.primary_contact_relationship = updates.familyContactRelation;
      rowUpdates.family_contact_relation = updates.familyContactRelation;
    }
    if (updates.familyContactEmail !== undefined) rowUpdates.family_contact_email = updates.familyContactEmail;
    if (updates.familyContactPhone !== undefined) {
      rowUpdates.primary_contact_phone = updates.familyContactPhone;
      rowUpdates.family_contact_phone = updates.familyContactPhone;
    }
    if (updates.photoUrl !== undefined) {
      rowUpdates.avatar_url = updates.photoUrl;
      rowUpdates.photo_url = updates.photoUrl;
    }
    if (updates.admissionDate !== undefined) rowUpdates.admission_date = updates.admissionDate;

    // Pre-strip cached missing columns
    let currentUpdates: any = { ...rowUpdates };
    cachedMissingColumns.forEach((col) => {
      delete currentUpdates[col];
    });

    const targetUuid = toValidUuid(residentId);
    let attempt = 0;

    while (attempt <= 25) {
      const { data, error } = await supabase
        .from('residents')
        .update(currentUpdates)
        .eq('id', targetUuid)
        .select();

      if (!error) {
        return { success: true, data };
      }

      const missingCol = extractMissingColumnFromError(error.message);
      if (missingCol) {
        cachedMissingColumns.add(missingCol);
        delete currentUpdates[missingCol];
        attempt++;
        continue;
      }

      console.warn('Supabase update note:', error.message);
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Update failed after schema retries' };
  } catch (err: any) {
    console.warn('Supabase update network error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
};

/**
 * Fetches all residents from Supabase
 */
export const fetchResidentsFromSupabase = async (): Promise<{ success: boolean; residents: Resident[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, residents: [], error: error.message };
    }

    if (data && data.length > 0) {
      const residents = data.map(supabaseRowToResident);
      return { success: true, residents };
    }

    return { success: true, residents: [] };
  } catch (err: any) {
    return { success: false, residents: [], error: err?.message || 'Network error' };
  }
};

/**
 * Bulk syncs all resident records to Supabase with auto-fallback
 */
export const syncAllResidentsToSupabase = async (
  residentsList: Resident[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const rows = residentsList.map((r) => residentToSupabaseRow(r));
    const { data, error } = await safeUpsertResidentsTable(rows);

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: data?.length || rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Network error' };
  }
};
