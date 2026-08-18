import { Resident, CareLog, FamilyMessage, UserProfile, MorningVitalsRecord, RegisteredAdmin } from '../types';

export const INITIAL_REGISTERED_ADMINS: RegisteredAdmin[] = [
  {
    id: 'radmin_chief',
    name: 'Chief Admin',
    email: 'orangeredtravel@gmail.com',
    title: 'Chief Administrator & Facility Director',
    status: 'active',
    registeredAt: '2026-01-01T08:00:00.000Z',
    lastLoginAt: '2026-08-17T12:00:00.000Z',
  },
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_chief_admin',
    name: 'Chief Admin',
    role: 'admin',
    email: 'orangeredtravel@gmail.com',
    title: 'Chief Administrator & Facility Director'
  },
  {
    id: 'user_care_1',
    name: 'Caregiver',
    role: 'caregiver',
    email: 'caregiver@careconnect.com',
    shift: 'Morning Shift (07:00 - 15:30)',
    title: 'Caregiver / Nurse'
  },
  {
    id: 'user_family_1',
    name: 'Family Member',
    role: 'family',
    email: 'family@careconnect.com',
    residentId: '',
    title: 'Family Contact / Next of Kin'
  }
];

export const INITIAL_RESIDENTS: Resident[] = [];

export const INITIAL_CARE_LOGS: CareLog[] = [];

export const INITIAL_FAMILY_MESSAGES: FamilyMessage[] = [];

export const SAMPLE_VITALS_PRESETS = [
  {
    label: 'Digital BP & Pulse Monitor (Omron M3)',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    deviceType: 'Digital Upper-Arm Blood Pressure Monitor',
    suggestedReadings: {
      bloodPressure: '118/76',
      pulseRate: 72,
      spo2: 98,
      temperature: 36.6,
      bloodSugar: 5.4,
    }
  },
  {
    label: 'Fingertip Pulse Oximeter & Heart Rate',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    deviceType: 'Hospital Pulse Oximeter Sensor',
    suggestedReadings: {
      bloodPressure: '124/80',
      pulseRate: 68,
      spo2: 99,
      temperature: 36.8,
      bloodSugar: 6.1,
    }
  },
  {
    label: 'Bedside Clinical Telemetry Station',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
    deviceType: 'Bedside Multi-Parameter Spot Monitor',
    suggestedReadings: {
      bloodPressure: '126/82',
      pulseRate: 74,
      spo2: 98,
      temperature: 36.7,
      bloodSugar: 5.8,
    }
  },
  {
    label: 'Infrared Digital Tympanic Thermometer',
    imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop&q=80',
    deviceType: 'Braun Digital Ear Thermometer',
    suggestedReadings: {
      bloodPressure: '120/78',
      pulseRate: 70,
      spo2: 98,
      temperature: 36.5,
      bloodSugar: 5.6,
    }
  }
];

export const INITIAL_MORNING_VITALS: MorningVitalsRecord[] = [];
