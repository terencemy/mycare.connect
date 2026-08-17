import { Resident, CareLog, MorningVitalsRecord, VitalsData } from '../types';

/**
 * Deterministic UUID generator for string IDs (e.g. 'res_1' -> UUID)
 */
export function toValidUuid(id?: string): string {
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
}

/**
 * Resiliently checks if an item (log, vitals, message, or ID string) belongs to a target resident.
 * Matches by exact ID, UUID-mapped ID, normalized full name, or room + bed number combination.
 */
export function isResidentMatch(
  targetResident: Resident | null | undefined,
  item:
    | {
        residentId?: string;
        residentFullName?: string;
        roomNumber?: string;
        bedNumber?: string;
        id?: string;
        fullName?: string;
      }
    | string
    | null
    | undefined
): boolean {
  if (!targetResident) return false;

  if (typeof item === 'string') {
    if (!item) return false;
    if (item === targetResident.id) return true;
    if (toValidUuid(item) === toValidUuid(targetResident.id)) return true;
    return false;
  }

  if (!item) return false;

  const itemId = item.residentId || item.id;
  if (itemId) {
    if (itemId === targetResident.id) return true;
    if (toValidUuid(itemId) === toValidUuid(targetResident.id)) return true;
  }

  const itemFullName = item.residentFullName || item.fullName;
  if (itemFullName && targetResident.fullName) {
    if (itemFullName.trim().toLowerCase() === targetResident.fullName.trim().toLowerCase()) {
      return true;
    }
  }

  if (item.roomNumber && item.bedNumber && targetResident.roomNumber && targetResident.bedNumber) {
    if (
      item.roomNumber.trim().toLowerCase() === targetResident.roomNumber.trim().toLowerCase() &&
      item.bedNumber.trim().toLowerCase() === targetResident.bedNumber.trim().toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}

export interface ConsolidatedVitals {
  bloodPressure?: string;
  pulseRate?: number;
  temperature?: number;
  spo2?: number;
  bloodSugar?: number;
  deviceType?: string;
  photoUrl?: string;
  secondaryPhotoUrl?: string;
  caregiverName: string;
  formattedTime: string;
  formattedDate: string;
  isBefore7am: boolean;
  notes?: string;
  status: 'normal' | 'attention_needed' | 'critical';
  source: 'morning_round' | 'care_log' | 'none';
  timestamp: string;
  isVerified: boolean;
  hasRecord: boolean;
}

/**
 * Resolves the most recent, accurate clinical vital signs for a resident
 * by merging Morning Vitals records and Care Log vitals updates.
 */
export function getLatestVitalsForResident(
  resident: Resident | null | undefined,
  morningVitals: MorningVitalsRecord[] = [],
  careLogs: CareLog[] = []
): ConsolidatedVitals | null {
  if (!resident) return null;

  // 1. Find all matching morning vitals sorted newest first
  const matchingMorning = morningVitals
    .filter((v) => isResidentMatch(resident, v))
    .sort((a, b) => {
      const timeA = new Date(a.recordedAt || 0).getTime();
      const timeB = new Date(b.recordedAt || 0).getTime();
      return timeB - timeA;
    });

  const latestMorning = matchingMorning[0] || null;

  // 2. Find all matching care logs that have vitals telemetry
  const matchingLogsWithVitals = careLogs
    .filter(
      (l) =>
        isResidentMatch(resident, l) &&
        l.vitals &&
        (l.vitals.bloodPressure ||
          l.vitals.pulseRate !== undefined ||
          l.vitals.temperature !== undefined ||
          l.vitals.spo2 !== undefined ||
          l.vitals.bloodSugar !== undefined)
    )
    .sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

  const latestLog = matchingLogsWithVitals[0] || null;

  if (!latestMorning && !latestLog) {
    return null;
  }

  const morningTimestamp = latestMorning ? new Date(latestMorning.recordedAt || 0).getTime() : 0;
  const logTimestamp = latestLog ? new Date(latestLog.timestamp || 0).getTime() : 0;

  // If Morning Round record is newer or equal
  if (latestMorning && morningTimestamp >= logTimestamp) {
    const readings = latestMorning.readings || {};
    return {
      bloodPressure: readings.bloodPressure,
      pulseRate: readings.pulseRate,
      temperature: readings.temperature,
      spo2: readings.spo2,
      bloodSugar: readings.bloodSugar,
      deviceType: latestMorning.deviceType || 'Digital Spot Monitor',
      photoUrl: latestMorning.vitalsPhotoUrl,
      secondaryPhotoUrl: latestMorning.secondaryVitalsPhotoUrl,
      caregiverName: latestMorning.caregiverName || resident.assignedCaregiverName || 'Care Staff',
      formattedTime: latestMorning.formattedTime || new Date(latestMorning.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      formattedDate: latestMorning.formattedDate || new Date(latestMorning.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      isBefore7am: latestMorning.isBefore7am ?? true,
      notes: latestMorning.notes,
      status: latestMorning.status || 'normal',
      source: 'morning_round',
      timestamp: latestMorning.recordedAt,
      isVerified: true,
      hasRecord: true,
    };
  }

  // Otherwise, extract from latest Care Log vitals update
  if (latestLog && latestLog.vitals) {
    const lv = latestLog.vitals;
    const logDate = new Date(latestLog.timestamp);
    return {
      bloodPressure: lv.bloodPressure,
      pulseRate: lv.pulseRate,
      temperature: lv.temperature,
      spo2: lv.spo2,
      bloodSugar: lv.bloodSugar,
      deviceType: lv.deviceType || 'Caregiver Shift Assessment',
      photoUrl: lv.vitalsPhotoUrl || latestLog.mediaUrl,
      secondaryPhotoUrl: lv.secondaryVitalsPhotoUrl,
      caregiverName: latestLog.caregiverName || resident.assignedCaregiverName || 'Care Staff',
      formattedTime: logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      formattedDate: logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isBefore7am: lv.isBefore7am ?? (logDate.getHours() < 7),
      notes: latestLog.caregiverRawNotes || 'Shift vitals recorded in daily care log.',
      status: 'normal',
      source: 'care_log',
      timestamp: latestLog.timestamp,
      isVerified: true,
      hasRecord: true,
    };
  }

  return null;
}
