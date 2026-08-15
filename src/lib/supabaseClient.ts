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
 * Transforms client Resident object into Supabase PostgreSQL row format
 */
export const residentToSupabaseRow = (resident: Partial<Resident>) => {
  return {
    ...(resident.id ? { id: resident.id } : {}),
    full_name: resident.fullName,
    preferred_name: resident.preferredName || resident.fullName?.split(' ')[0],
    room_number: resident.roomNumber,
    bed_number: resident.bedNumber || 'Bed 01',
    age: resident.age || 80,
    photo_url: resident.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    medical_notes: resident.medicalNotes || 'Assisted living general care plan.',
    care_plan: resident.carePlan || ['Routine vitals check', 'Nutritional monitoring', 'Hydration schedule'],
    dietary_restrictions: resident.dietaryRestrictions || 'Standard balanced, soft texture',
    assigned_caregiver_name: resident.assignedCaregiverName || 'Caregiver Staff',
    family_contact_name: resident.familyContactName || 'Family Member',
    family_contact_relation: resident.familyContactRelation || 'Family Member',
    family_contact_email: resident.familyContactEmail || '',
    family_contact_phone: resident.familyContactPhone || '',
    admission_date: resident.admissionDate || new Date().toISOString().split('T')[0],
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
    photoUrl: row.photo_url || row.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    medicalNotes: row.medical_notes || row.medicalNotes || '',
    carePlan: Array.isArray(row.care_plan) ? row.care_plan : (row.carePlan || ['Routine vitals check']),
    dietaryRestrictions: row.dietary_restrictions || row.dietaryRestrictions || 'Standard balanced',
    assignedCaregiverId: row.assigned_caregiver_id || row.assignedCaregiverId || 'user_care_1',
    assignedCaregiverName: row.assigned_caregiver_name || row.assignedCaregiverName || 'Caregiver Staff',
    familyContactName: row.family_contact_name || row.familyContactName || 'Family Contact',
    familyContactRelation: row.family_contact_relation || row.familyContactRelation || 'Family Member',
    familyContactEmail: row.family_contact_email || row.familyContactEmail || '',
    familyContactPhone: row.family_contact_phone || row.familyContactPhone || '',
    admissionDate: row.admission_date || row.admissionDate || new Date().toISOString().split('T')[0],
  };
};

/**
 * Upserts a single resident directly to Supabase
 */
export const syncResidentToSupabase = async (resident: Resident): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const row = residentToSupabaseRow(resident);
    const { data, error } = await supabase
      .from('residents')
      .upsert([row], { onConflict: 'id' })
      .select();

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
 * Updates a resident in Supabase
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
    if (updates.dietaryRestrictions !== undefined) rowUpdates.dietary_restrictions = updates.dietaryRestrictions;
    if (updates.medicalNotes !== undefined) rowUpdates.medical_notes = updates.medicalNotes;
    if (updates.assignedCaregiverName !== undefined) rowUpdates.assigned_caregiver_name = updates.assignedCaregiverName;
    if (updates.familyContactName !== undefined) rowUpdates.family_contact_name = updates.familyContactName;
    if (updates.familyContactRelation !== undefined) rowUpdates.family_contact_relation = updates.familyContactRelation;
    if (updates.familyContactEmail !== undefined) rowUpdates.family_contact_email = updates.familyContactEmail;
    if (updates.familyContactPhone !== undefined) rowUpdates.family_contact_phone = updates.familyContactPhone;
    if (updates.photoUrl !== undefined) rowUpdates.photo_url = updates.photoUrl;

    const { data, error } = await supabase
      .from('residents')
      .update(rowUpdates)
      .eq('id', residentId)
      .select();

    if (error) {
      console.warn('Supabase update note:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
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
 * Bulk syncs all resident records to Supabase
 */
export const syncAllResidentsToSupabase = async (
  residentsList: Resident[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const rows = residentsList.map((r) => residentToSupabaseRow(r));
    const { data, error } = await supabase
      .from('residents')
      .upsert(rows, { onConflict: 'id' })
      .select();

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: data?.length || rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Network error' };
  }
};
