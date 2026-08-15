export type UserRole = 'admin' | 'caregiver' | 'family';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatarUrl?: string;
  residentId?: string; // If family, linked resident
  shift?: string; // If caregiver
  title?: string;
}

export const BED_IDENTIFIER_OPTIONS = [
  'Bed 01',
  'Bed 02',
  'Bed 03',
  'Bed 04',
  'Bed 05',
  'Single Room',
] as const;

export type BedIdentifier = (typeof BED_IDENTIFIER_OPTIONS)[number] | string;

export interface Resident {
  id: string;
  fullName: string;
  preferredName: string;
  roomNumber: string;
  bedNumber: string; // e.g., 'Bed 01', 'Bed 02', 'Bed 03', 'Bed 04', 'Bed 05', 'Single Room'
  age: number;
  photoUrl: string;
  admissionDate: string;
  medicalNotes: string;
  carePlan: string[];
  dietaryRestrictions: string;
  assignedCaregiverId: string;
  assignedCaregiverName: string;
  familyContactName: string;
  familyContactRelation: string;
  familyContactEmail: string;
  familyContactPhone: string;
}

export interface MealCheck {
  breakfast: '100%' | '75%' | '50%' | '25%' | 'Refused' | 'N/A';
  lunch: '100%' | '75%' | '50%' | '25%' | 'Refused' | 'N/A';
  dinner: '100%' | '75%' | '50%' | '25%' | 'Refused' | 'N/A';
  hydrationMl: number;
}

export type ResidentMood = 'cheerful' | 'peaceful' | 'active' | 'calm' | 'resting' | 'reflective' | 'low_energy';

export interface VitalsData {
  bloodPressure?: string; // e.g. "120/80"
  pulseRate?: number; // e.g. 72 bpm
  temperature?: number; // e.g. 36.6 °C
  spo2?: number; // e.g. 98%
  bloodSugar?: number; // e.g. 5.8 mmol/L
  vitalsPhotoUrl?: string; // Watermarked photo of monitor/device
  vitalsRecordedAt?: string;
  isBefore7am?: boolean;
  watermarkSummary?: string;
  deviceType?: string;
}

export interface MorningVitalsRecord {
  id: string;
  residentId: string;
  residentFullName: string;
  roomNumber: string;
  bedNumber: string;
  caregiverId: string;
  caregiverName: string;
  vitalsPhotoUrl: string; // Watermarked photo
  readings: {
    bloodPressure?: string;
    pulseRate?: number;
    spo2?: number;
    temperature?: number;
    bloodSugar?: number;
  };
  deviceType?: string; // e.g., 'Digital Blood Pressure Monitor', 'Pulse Oximeter & BP Station'
  recordedAt: string; // ISO string
  formattedTime: string; // e.g. "06:38 AM"
  formattedDate: string; // e.g. "Aug 14, 2026"
  isBefore7am: boolean;
  notes?: string;
  status: 'normal' | 'attention_needed' | 'critical';
  aiExtracted?: boolean;
}

export interface CareLog {
  id: string;
  residentId: string;
  residentFullName: string;
  roomNumber: string;
  bedNumber: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caregiverId: string;
  caregiverName: string;
  aiGeneratedFamilySummary: string;
  clinicalStaffLog: string;
  keyHighlights: string[];
  meals: MealCheck;
  mood: ResidentMood;
  vitals?: VitalsData;
  activities: string[];
  caregiverRawNotes?: string;
  timestamp: string;
  familyLikesCount: number;
  familyCommentsCount: number;
  flaggedForAdminReview: boolean;
}

export interface FamilyMessage {
  id: string;
  residentId: string;
  residentFullName: string;
  roomNumber: string;
  bedNumber: string;
  familyUserId: string;
  familyName: string;
  familyRelation: string;
  subject: string;
  messageText: string;
  category: 'general' | 'care_concern' | 'medication_inquiry' | 'visit_coordination' | 'gratitude' | 'urgent_inquiry';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'intercepted_pending_admin' | 'in_progress' | 'responded' | 'resolved';
  aiTriageSummary?: string;
  aiSuggestedResponse?: string;
  adminResponse?: string;
  respondedByAdminName?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface CaregiverStats {
  todayLogsCreated: number;
  averageTimeSavedMinutes: number;
  activeResidentsCount: number;
  pendingReviews: number;
}

export interface GenerateCareLogRequest {
  residentFullName: string;
  roomNumber: string;
  bedNumber: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaDescription?: string;
  rawCaregiverNotes?: string;
  meals: MealCheck;
  mood: ResidentMood;
  vitals?: VitalsData;
  activities: string[];
  caregiverName: string;
}

export interface GenerateCareLogResponse {
  familyWarmUpdate: string;
  clinicalStaffLog: string;
  keyHighlights: string[];
  suggestedActivitiesMentioned: string[];
  reassuranceScore: number; // 1-100
}
