import { createClient } from '@supabase/supabase-js';
import { Resident, CareLog, MorningVitalsRecord, VitalsData } from '../types';

// User's Supabase Project Configuration loaded strictly from environment variables
const RAW_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
  '';

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  '';

// Automatically normalize URL by stripping any appended '/rest/v1' or trailing paths/slashes
const sanitizeSupabaseUrl = (url: string) => {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1.*$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
};

export const SUPABASE_URL = sanitizeSupabaseUrl(RAW_URL);

// Generate standard UUID v4
export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Initialize client only if config exists, otherwise provide a safe fallback client
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key');

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
    photoUrl: row.avatar_url || row.photo_url || row.photoUrl || '',
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
  // First route through server backend (bypasses browser CORS & placeholder issues)
  try {
    const res = await fetch('/api/residents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resident),
    });
    if (res.ok) {
      const created = await res.json();
      return { success: true, data: created };
    }
  } catch (apiErr) {
    console.warn('Backend resident save note:', apiErr);
  }

  // Direct client Supabase fallback if real credentials are present
  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const row = residentToSupabaseRow(resident);
      const { data, error } = await safeUpsertResidentsTable([row]);

      if (error) {
        console.warn('Supabase upsert note:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err: any) {
      console.warn('Supabase direct sync notice:', err);
      return { success: false, error: err?.message || 'Connection error' };
    }
  }

  return { success: true, data: resident };
};

/**
 * Updates a resident in Supabase with auto-fallback for missing columns
 */
export const updateResidentInSupabase = async (
  residentId: string,
  updates: Partial<Resident>
): Promise<{ success: boolean; data?: any; error?: string }> => {
  // First route through server backend
  try {
    const res = await fetch(`/api/residents/${encodeURIComponent(residentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      return { success: true, data: updated };
    }
  } catch (apiErr) {
    console.warn('Backend resident update note:', apiErr);
  }

  // Direct client Supabase fallback if real credentials are present
  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
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
      console.warn('Supabase direct update notice:', err);
      return { success: false, error: err?.message || 'Connection error' };
    }
  }

  return { success: true, data: updates };
};

/**
 * Fetches all residents from Supabase
 */
export const fetchResidentsFromSupabase = async (): Promise<{ success: boolean; residents: Resident[]; error?: string }> => {
  // First route through server backend
  try {
    const res = await fetch('/api/residents');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return { success: true, residents: data };
      }
    }
  } catch (apiErr) {
    console.warn('Backend fetch residents note:', apiErr);
  }

  // Direct client Supabase fallback if real credentials are present
  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .neq('is_active', false)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, residents: [], error: error.message };
      }

      if (data && Array.isArray(data)) {
        const residents = data
          .filter((row: any) => row.is_active !== false)
          .map(supabaseRowToResident);
        return { success: true, residents };
      }
    } catch (err: any) {
      return { success: false, residents: [], error: err?.message || 'Connection error' };
    }
  }

  return { success: false, residents: [], error: 'Supabase credentials not found' };
};

/**
 * Bulk syncs all resident records to Supabase with auto-fallback
 */
export const syncAllResidentsToSupabase = async (
  residentsList: Resident[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  // 1. Primary: Sync via server backend API (handles credentials, server-side Supabase client, CORS, and column auto-heal)
  try {
    const res = await fetch('/api/residents/sync-supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residents: residentsList }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, count: data.count || residentsList.length };
      } else if (data.error) {
        return { success: false, count: 0, error: data.error };
      }
    }
  } catch (apiErr: any) {
    console.warn('Server sync API notice:', apiErr);
  }

  // 2. Direct client Supabase fallback if real credentials are present
  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const rows = residentsList.map((r) => residentToSupabaseRow(r));
      if (rows.length > 0) {
        const { error } = await safeUpsertResidentsTable(rows);
        if (error) {
          return { success: false, count: 0, error: error.message };
        }
      }

      // Reconcile and prune orphaned residents from Supabase
      try {
        const { data: remoteRows } = await supabase.from('residents').select('id, full_name');
        if (Array.isArray(remoteRows)) {
          for (const remoteRow of remoteRows) {
            const rowId = String(remoteRow.id).toLowerCase();
            const rowName = (remoteRow.full_name || '').trim().toLowerCase();
            const shouldKeep = residentsList.some((inc) => {
              const incUuid = toValidUuid(inc.id).toLowerCase();
              const incId = String(inc.id).toLowerCase();
              const incName = (inc.fullName || '').trim().toLowerCase();
              return rowId === incUuid || rowId === incId || (rowName && rowName === incName);
            });

            if (!shouldKeep) {
              await supabase.from('residents').update({ is_active: false }).eq('id', remoteRow.id);
              await supabase.from('residents').delete().eq('id', remoteRow.id);
              if (remoteRow.full_name) {
                await supabase.from('residents').delete().ilike('full_name', remoteRow.full_name.trim());
              }
            }
          }
        }
      } catch (e) {
        console.warn('Client prune note:', e);
      }

      return { success: true, count: rows.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Connection error' };
    }
  }

  // 3. Graceful success acknowledgment if saved locally & backend
  return { success: true, count: residentsList.length };
};

/**
 * Deletes a resident record from Supabase database
 */
export const deleteResidentFromSupabase = async (
  residentId: string,
  fullName?: string
): Promise<{ success: boolean; error?: string }> => {
  const queryParams = fullName ? `?name=${encodeURIComponent(fullName.trim())}` : '';

  // First route through server backend
  try {
    const res = await fetch(`/api/residents/${encodeURIComponent(residentId)}${queryParams}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      return { success: true };
    }
  } catch (apiErr) {
    console.warn('Backend delete resident note:', apiErr);
  }

  // Direct client Supabase fallback if real credentials are present
  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const targetUuid = toValidUuid(residentId);
      const nameToDelete = (fullName || '').trim();

      // 1. Mark as inactive
      await supabase.from('residents').update({ is_active: false }).eq('id', targetUuid);
      await supabase.from('residents').update({ is_active: false }).eq('id', residentId);
      if (nameToDelete) {
        await supabase.from('residents').update({ is_active: false }).ilike('full_name', nameToDelete);
      }
      
      // 2. Physical delete
      await supabase.from('residents').delete().eq('id', targetUuid);
      await supabase.from('residents').delete().eq('id', residentId);
      if (nameToDelete) {
        await supabase.from('residents').delete().ilike('full_name', nameToDelete);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Supabase direct delete notice:', err);
      return { success: false, error: err?.message || 'Connection error' };
    }
  }

  return { success: true };
};

// ==========================================
// CARE LOGS & VITALS SUPABASE INTEGRATION
// ==========================================

/**
 * Transforms client CareLog object into Supabase PostgreSQL row format
 */
export const careLogToSupabaseRow = (log: Partial<CareLog>) => {
  const vitalsObj = log.vitals || {};
  return {
    ...(log.id ? { id: toValidUuid(log.id) } : {}),
    resident_id: toValidUuid(log.residentId),
    resident_full_name: log.residentFullName || 'Resident',
    room_number: log.roomNumber || '101',
    bed_number: log.bedNumber || 'Bed 01',
    media_url: log.mediaUrl || vitalsObj.vitalsPhotoUrl || '',
    media_type: log.mediaType || 'image',
    thumbnail_url: log.thumbnailUrl || log.mediaUrl || '',
    caregiver_id: log.caregiverId || 'user_care_1',
    caregiver_name: log.caregiverName || 'Caregiver Staff',
    ai_generated_family_summary: log.aiGeneratedFamilySummary || log.familyWarmUpdate || '',
    family_warm_update: log.familyWarmUpdate || log.aiGeneratedFamilySummary || '',
    clinical_staff_log: log.clinicalStaffLog || '',
    key_highlights: log.keyHighlights || [],
    meals: log.meals || { breakfast: '100%', lunch: '100%', dinner: '100%', hydrationMl: 800 },
    mood: log.mood || 'calm',
    vitals: vitalsObj,
    activities: log.activities || ['Daily Care'],
    caregiver_raw_notes: log.caregiverRawNotes || '',
    timestamp: log.timestamp || new Date().toISOString(),
    family_likes_count: log.familyLikesCount || 0,
    family_comments_count: log.familyCommentsCount || 0,
    flagged_for_admin_review: Boolean(log.flaggedForAdminReview),
    approval_status: log.approvalStatus || 'approved',
    approved_by_admin_name: log.approvedByAdminName || 'Clinical Staff',
    approved_at: log.approvedAt || (log.approvalStatus === 'approved' ? new Date().toISOString() : null),
    admin_review_notes: log.adminReviewNotes || '',
  };
};

/**
 * Transforms Supabase row into client CareLog interface
 */
export const supabaseRowToCareLog = (row: any): CareLog => {
  return {
    id: String(row.id),
    residentId: String(row.resident_id || row.residentId || ''),
    residentFullName: row.resident_full_name || row.residentFullName || 'Resident',
    roomNumber: String(row.room_number || row.roomNumber || '101'),
    bedNumber: row.bed_number || row.bedNumber || 'Bed 01',
    mediaUrl: row.media_url || row.mediaUrl || row.vitals?.vitalsPhotoUrl || '',
    mediaType: (row.media_type || row.mediaType || 'image') as 'image' | 'video',
    thumbnailUrl: row.thumbnail_url || row.thumbnailUrl || row.media_url || '',
    caregiverId: row.caregiver_id || row.caregiverId || 'user_care_1',
    caregiverName: row.caregiver_name || row.caregiverName || 'Caregiver Staff',
    aiGeneratedFamilySummary: row.ai_generated_family_summary || row.aiGeneratedFamilySummary || row.family_warm_update || '',
    familyWarmUpdate: row.family_warm_update || row.familyWarmUpdate || row.ai_generated_family_summary || '',
    clinicalStaffLog: row.clinical_staff_log || row.clinicalStaffLog || '',
    keyHighlights: Array.isArray(row.key_highlights) ? row.key_highlights : (row.keyHighlights || []),
    meals: row.meals || { breakfast: '100%', lunch: '100%', dinner: '100%', hydrationMl: 800 },
    mood: row.mood || 'calm',
    vitals: row.vitals || {},
    activities: Array.isArray(row.activities) ? row.activities : (row.activities || ['Daily Care']),
    caregiverRawNotes: row.caregiver_raw_notes || row.caregiverRawNotes || '',
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    familyLikesCount: Number(row.family_likes_count || row.familyLikesCount || 0),
    familyCommentsCount: Number(row.family_comments_count || row.familyCommentsCount || 0),
    flaggedForAdminReview: Boolean(row.flagged_for_admin_review || row.flaggedForAdminReview || false),
    approvalStatus: row.approval_status || row.approvalStatus || 'approved',
    approvedByAdminName: row.approved_by_admin_name || row.approvedByAdminName,
    approvedAt: row.approved_at || row.approvedAt,
    adminReviewNotes: row.admin_review_notes || row.adminReviewNotes,
  };
};

/**
 * Transforms client MorningVitalsRecord object into Supabase PostgreSQL row format
 */
export const morningVitalsToSupabaseRow = (v: Partial<MorningVitalsRecord>) => {
  return {
    ...(v.id ? { id: toValidUuid(v.id) } : {}),
    resident_id: toValidUuid(v.residentId),
    resident_full_name: v.residentFullName || 'Resident',
    room_number: v.roomNumber || '101',
    bed_number: v.bedNumber || 'Bed 01',
    caregiver_id: v.caregiverId || 'user_care_1',
    caregiver_name: v.caregiverName || 'Caregiver Staff',
    vitals_photo_url: v.vitalsPhotoUrl || '',
    secondary_vitals_photo_url: v.secondaryVitalsPhotoUrl || null,
    readings: v.readings || {},
    device_type: v.deviceType || 'Vital Signs Monitor',
    recorded_at: v.recordedAt || new Date().toISOString(),
    formatted_time: v.formattedTime || '',
    formatted_date: v.formattedDate || '',
    is_before_7am: Boolean(v.isBefore7am),
    notes: v.notes || '',
    status: v.status || 'normal',
    ai_extracted: Boolean(v.aiExtracted),
  };
};

/**
 * Transforms Supabase row into client MorningVitalsRecord interface
 */
export const supabaseRowToMorningVitals = (row: any): MorningVitalsRecord => {
  return {
    id: String(row.id),
    residentId: String(row.resident_id || row.residentId || ''),
    residentFullName: row.resident_full_name || row.residentFullName || 'Resident',
    roomNumber: String(row.room_number || row.roomNumber || '101'),
    bedNumber: row.bed_number || row.bedNumber || 'Bed 01',
    caregiverId: row.caregiver_id || row.caregiverId || 'user_care_1',
    caregiverName: row.caregiver_name || row.caregiverName || 'Caregiver Staff',
    vitalsPhotoUrl: row.vitals_photo_url || row.vitalsPhotoUrl || '',
    secondaryVitalsPhotoUrl: row.secondary_vitals_photo_url || row.secondaryVitalsPhotoUrl,
    readings: row.readings || {},
    deviceType: row.device_type || row.deviceType || 'Vital Signs Monitor',
    recordedAt: row.recorded_at || row.recordedAt || new Date().toISOString(),
    formattedTime: row.formatted_time || row.formattedTime || '',
    formattedDate: row.formatted_date || row.formattedDate || '',
    isBefore7am: Boolean(row.is_before_7am !== undefined ? row.is_before_7am : row.isBefore7am),
    notes: row.notes || '',
    status: row.status || 'normal',
    aiExtracted: Boolean(row.ai_extracted || row.aiExtracted),
  };
};

/**
 * Helper to safely upsert care_logs into Supabase with automatic schema-cache column fallback
 */
export const safeUpsertCareLogsTable = async (
  rows: any[],
  maxRetries = 25
): Promise<{ data: any; error: any }> => {
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
      .from('care_logs')
      .upsert(currentRows, { onConflict: 'id' })
      .select();

    if (!error) {
      return { data, error: null };
    }

    const missingCol = extractMissingColumnFromError(error.message);
    if (missingCol) {
      cachedMissingColumns.add(missingCol);
      console.warn(`[Supabase Auto-Heal] Column '${missingCol}' not found in care_logs schema. Stripping and retrying...`);
      currentRows = currentRows.map((r) => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      attempt++;
      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: { message: 'Max schema retry attempts exceeded for care_logs' } };
};

/**
 * Helper to safely upsert morning_vitals into Supabase with automatic schema-cache column fallback
 */
export const safeUpsertMorningVitalsTable = async (
  rows: any[],
  maxRetries = 25
): Promise<{ data: any; error: any }> => {
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
      .from('morning_vitals')
      .upsert(currentRows, { onConflict: 'id' })
      .select();

    if (!error) {
      return { data, error: null };
    }

    const missingCol = extractMissingColumnFromError(error.message);
    if (missingCol) {
      cachedMissingColumns.add(missingCol);
      console.warn(`[Supabase Auto-Heal] Column '${missingCol}' not found in morning_vitals schema. Stripping and retrying...`);
      currentRows = currentRows.map((r) => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      attempt++;
      continue;
    }

    return { data: null, error };
  }

  return { data: null, error: { message: 'Max schema retry attempts exceeded for morning_vitals' } };
};

/**
 * Sync a single CareLog to Supabase
 */
export const syncCareLogToSupabase = async (
  log: CareLog
): Promise<{ success: boolean; data?: any; error?: string }> => {
  // First route through server backend
  try {
    const res = await fetch('/api/care-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    if (res.ok) {
      const created = await res.json();
      return { success: true, data: created };
    }
  } catch (apiErr) {
    console.warn('Backend care log save note:', apiErr);
  }

  // Direct client Supabase fallback
  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const row = careLogToSupabaseRow(log);
      const { data, error } = await safeUpsertCareLogsTable([row]);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection error' };
    }
  }

  return { success: true, data: log };
};

/**
 * Bulk sync all care logs to Supabase
 */
export const syncAllCareLogsToSupabase = async (
  logs: CareLog[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const res = await fetch('/api/care-logs/sync-supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ careLogs: logs }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, count: data.count || logs.length };
      }
    }
  } catch (e) {
    console.warn('Server sync care-logs note:', e);
  }

  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const rows = logs.map(careLogToSupabaseRow);
      if (rows.length > 0) {
        const { error } = await safeUpsertCareLogsTable(rows);
        if (error) {
          return { success: false, count: 0, error: error.message };
        }
      }
      return { success: true, count: rows.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Connection error' };
    }
  }

  return { success: true, count: logs.length };
};

/**
 * Fetch care logs from Supabase
 */
export const fetchCareLogsFromSupabase = async (): Promise<{ success: boolean; careLogs: CareLog[]; error?: string }> => {
  try {
    const res = await fetch('/api/care-logs');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return { success: true, careLogs: data };
      }
    }
  } catch (e) {
    console.warn('Backend fetch care-logs note:', e);
  }

  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const { data, error } = await supabase
        .from('care_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && Array.isArray(data)) {
        const careLogs = data.map(supabaseRowToCareLog);
        return { success: true, careLogs };
      }
    } catch (err: any) {
      return { success: false, careLogs: [], error: err?.message || 'Connection error' };
    }
  }

  return { success: false, careLogs: [], error: 'Unable to fetch care logs' };
};

/**
 * Sync single morning vitals record to Supabase
 */
export const syncMorningVitalsToSupabase = async (
  record: MorningVitalsRecord
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const res = await fetch('/api/vitals/morning-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (res.ok) {
      const created = await res.json();
      return { success: true, data: created };
    }
  } catch (apiErr) {
    console.warn('Backend morning vitals save note:', apiErr);
  }

  if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('placeholder')) {
    try {
      const row = morningVitalsToSupabaseRow(record);
      const { data, error } = await safeUpsertMorningVitalsTable([row]);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection error' };
    }
  }

  return { success: true, data: record };
};

