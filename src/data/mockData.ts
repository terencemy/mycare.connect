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
    name: 'Family Member (Han Family)',
    role: 'family',
    email: 'family@careconnect.com',
    residentId: 'res_han_sien_ting',
    title: 'Family Contact / Next of Kin'
  }
];

export const INITIAL_RESIDENTS: Resident[] = [
  {
    id: 'res_han_sien_ting',
    fullName: 'Han Sien Ting',
    preferredName: 'Mdm Han',
    roomNumber: '102',
    bedNumber: 'Bed 01',
    age: 82,
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2025-11-15',
    medicalNotes: 'Mild hypertension. Uses assisted walking frame for courtyard mobility. Daily morning vitals and hydration tracking.',
    carePlan: [
      'Daily 06:30 Morning Vitals (BP, SpO2, Pulse)',
      'Assisted Courtyard Mobility Walk',
      'Nutritional Balanced Soft Diet',
      'Hydration & Medication Supervision',
    ],
    dietaryRestrictions: 'Low sodium, soft texture, diabetic friendly',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Caregiver Staff',
    familyContactName: 'Han Wei Ming',
    familyContactRelation: 'Son',
    familyContactEmail: 'wei.ming.han@example.com',
    familyContactPhone: '+60 12-345 6789',
  },
  {
    id: 'res_ong_kong_meng',
    fullName: 'Ong Kong Meng',
    preferredName: 'Uncle Ong',
    roomNumber: '105',
    bedNumber: 'Bed 02',
    age: 78,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2026-01-10',
    medicalNotes: 'Routine geriatric wellness check. Enjoys morning gardening and gentle mobility stretching.',
    carePlan: [
      'Daily Morning Vitals Protocol',
      'Morning Mobility & Courtyard Garden Activity',
      'Hydration Schedule (1.2L daily target)',
      'Nutritional Monitoring',
    ],
    dietaryRestrictions: 'Standard balanced diet, low sugar, warm tea preferred',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Caregiver Staff',
    familyContactName: 'Ong Mei Ling',
    familyContactRelation: 'Daughter',
    familyContactEmail: 'mei.ling.ong@example.com',
    familyContactPhone: '+60 16-888 2345',
  },
];

export const INITIAL_CARE_LOGS: CareLog[] = [
  {
    id: 'log_han_1',
    residentId: 'res_han_sien_ting',
    residentFullName: 'Han Sien Ting',
    roomNumber: '102',
    bedNumber: 'Bed 01',
    timestamp: '2026-08-17T08:30:00.000Z',
    mediaUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    aiGeneratedFamilySummary: 'Mdm Han had a bright and cheerful morning enjoying courtyard gardening and mobility stretches.',
    familyWarmUpdate: 'Mdm Han was smiling warmly during courtyard gardening and enjoyed her breakfast and warm morning tea.',
    clinicalStaffLog: 'Resident ambulated with walking frame assistance in courtyard garden. Vitals stable. Good nutritional intake.',
    keyHighlights: ['Courtyard garden walk completed', 'Breakfast intake 100%', 'Vitals BP 118/76 mmHg'],
    meals: {
      breakfast: '100%',
      lunch: 'N/A',
      dinner: 'N/A',
      hydrationMl: 650,
    },
    mood: 'cheerful',
    activities: ['Courtyard Gardening 🌿', 'Morning Mobility Stretch 🧘'],
    vitals: {
      bloodPressure: '118/76',
      pulseRate: 72,
      temperature: 36.6,
      spo2: 98,
      bloodSugar: 5.4,
    },
    caregiverId: 'user_care_1',
    caregiverName: 'Caregiver Staff',
    familyLikesCount: 3,
    familyCommentsCount: 1,
    flaggedForAdminReview: false,
    approvalStatus: 'approved',
  },
  {
    id: 'log_ong_1',
    residentId: 'res_ong_kong_meng',
    residentFullName: 'Ong Kong Meng',
    roomNumber: '105',
    bedNumber: 'Bed 02',
    timestamp: '2026-08-17T09:15:00.000Z',
    mediaUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    aiGeneratedFamilySummary: 'Uncle Ong participated happily in group morning mobility exercises and social tea hour.',
    familyWarmUpdate: 'Uncle Ong was in peaceful spirits and enjoyed gentle stretching and lively conversations with friends.',
    clinicalStaffLog: 'Resident participated in group mobility session with full range of motion. Vitals normal at 124/80 mmHg.',
    keyHighlights: ['Group mobility exercise completed', 'Hydration target 700ml reached', 'SpO2 99%'],
    meals: {
      breakfast: '100%',
      lunch: 'N/A',
      dinner: 'N/A',
      hydrationMl: 700,
    },
    mood: 'peaceful',
    activities: ['Morning Mobility Stretch 🧘', 'Music & Social Hour 🎵'],
    vitals: {
      bloodPressure: '124/80',
      pulseRate: 68,
      temperature: 36.7,
      spo2: 99,
      bloodSugar: 5.8,
    },
    caregiverId: 'user_care_1',
    caregiverName: 'Caregiver Staff',
    familyLikesCount: 2,
    familyCommentsCount: 0,
    flaggedForAdminReview: false,
    approvalStatus: 'approved',
  },
];

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

export const INITIAL_MORNING_VITALS: MorningVitalsRecord[] = [
  {
    id: 'vtl_han_today',
    residentId: 'res_han_sien_ting',
    residentFullName: 'Han Sien Ting',
    roomNumber: '102',
    bedNumber: 'Bed 01',
    recordedAt: '2026-08-17T06:28:00.000Z',
    formattedTime: '06:28 AM',
    formattedDate: 'Aug 17, 2026',
    isBefore7am: true,
    caregiverId: 'user_care_1',
    caregiverName: 'Caregiver Staff',
    vitalsPhotoUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    deviceType: 'Digital Upper-Arm Blood Pressure Monitor',
    readings: {
      bloodPressure: '118/76',
      pulseRate: 72,
      spo2: 98,
      temperature: 36.6,
      bloodSugar: 5.4,
    },
    notes: 'Morning vitals completed on schedule before 7:00 AM. Readings within normal limits.',
    status: 'normal',
    aiExtracted: true,
  },
  {
    id: 'vtl_ong_today',
    residentId: 'res_ong_kong_meng',
    residentFullName: 'Ong Kong Meng',
    roomNumber: '105',
    bedNumber: 'Bed 02',
    recordedAt: '2026-08-17T06:42:00.000Z',
    formattedTime: '06:42 AM',
    formattedDate: 'Aug 17, 2026',
    isBefore7am: true,
    caregiverId: 'user_care_1',
    caregiverName: 'Caregiver Staff',
    vitalsPhotoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    deviceType: 'Hospital Pulse Oximeter Sensor',
    readings: {
      bloodPressure: '124/80',
      pulseRate: 68,
      spo2: 99,
      temperature: 36.7,
      bloodSugar: 5.8,
    },
    notes: 'Morning vitals verified on bedside telemetry before 7:00 AM.',
    status: 'normal',
    aiExtracted: true,
  },
];
