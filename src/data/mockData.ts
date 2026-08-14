import { Resident, CareLog, FamilyMessage, UserProfile, MorningVitalsRecord } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_admin_1',
    name: 'Eleanor Vance, RN',
    role: 'admin',
    email: 'e.vance@careconnect.com',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813753-433e1448b111?w=150&auto=format&fit=crop&q=80',
    title: 'Director of Nursing & Operations'
  },
  {
    id: 'user_care_1',
    name: 'Nurse Sarah Jenkins',
    role: 'caregiver',
    email: 'sarah.j@careconnect.com',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    shift: 'Morning Shift (07:00 - 15:30)',
    title: 'Senior Geriatric Nurse'
  },
  {
    id: 'user_family_1',
    name: 'Jonathan Tan (Son)',
    role: 'family',
    email: 'jonathan.tan@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    residentId: 'res_1',
    title: 'Next of Kin / Primary Contact'
  }
];

export const INITIAL_RESIDENTS: Resident[] = [
  {
    id: 'res_1',
    fullName: 'Tan Ah Kow',
    preferredName: 'Uncle Ah Kow',
    roomNumber: '101',
    bedNumber: 'Bed A',
    age: 78,
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2023-04-12',
    medicalNotes: 'Mild cognitive decline, hypertension well-managed. Enjoys morning walks and traditional herbal tea. Needs mild assistance with mobility during rainy days.',
    carePlan: ['Biphasic BP monitoring at 08:00 & 17:00', 'Assisted range-of-motion physiotherapy', 'Low sodium diet', 'Afternoon reading/social group'],
    dietaryRestrictions: 'Low sodium, Soft texture, likes sliced warm papaya with breakfast.',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Nurse Sarah Jenkins',
    familyContactName: 'Jonathan Tan',
    familyContactRelation: 'Son',
    familyContactEmail: 'jonathan.tan@gmail.com',
    familyContactPhone: '+65 9123 4567'
  },
  {
    id: 'res_2',
    fullName: 'Margaret Chen',
    preferredName: 'Peggy',
    roomNumber: '102',
    bedNumber: 'Bed B',
    age: 82,
    photoUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2022-11-05',
    medicalNotes: 'Type 2 Diabetes (diet-controlled), Osteoarthritis in left knee. Loves watercolor painting and classical piano music.',
    carePlan: ['Capillary blood glucose before breakfast', 'Knee heating pad 20 mins post-lunch', 'Encourage fluid intake >= 1500ml'],
    dietaryRestrictions: 'Diabetic balanced, No added refined sugars, prefers jasmine tea.',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Nurse Sarah Jenkins',
    familyContactName: 'Clara Chen',
    familyContactRelation: 'Daughter',
    familyContactEmail: 'clara.chen@hotmail.com',
    familyContactPhone: '+65 8234 5678'
  },
  {
    id: 'res_3',
    fullName: 'Arthur Pendelton',
    preferredName: 'Artie',
    roomNumber: '104',
    bedNumber: 'Bed A',
    age: 85,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2023-01-20',
    medicalNotes: 'Post-stroke recovery (right-side weakness improving). Speech clear. Passionate about chess and botanical gardening.',
    carePlan: ['Speech & occupational therapy 3x/week', 'Gait training with quad cane', 'Fall precaution tier 2'],
    dietaryRestrictions: 'Regular minced diet, fortified high-protein puddings.',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Nurse Sarah Jenkins',
    familyContactName: 'Emily Pendelton',
    familyContactRelation: 'Granddaughter',
    familyContactEmail: 'emily.p@outlook.com',
    familyContactPhone: '+65 9345 6789'
  },
  {
    id: 'res_4',
    fullName: 'Siti Nurhaliza bte Osman',
    preferredName: 'Mak Siti',
    roomNumber: '105',
    bedNumber: 'Bed B',
    age: 74,
    photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2023-08-14',
    medicalNotes: 'Mild Parkinsonism, baseline tremors controlled with levodopa. Very cheerful and loves singing old folk ballads.',
    carePlan: ['Medication timing strict at 07:30, 13:30, 19:30', 'Hand dexterity craft exercises', 'Hydration reminders'],
    dietaryRestrictions: 'Halal, Soft chopped, warm beverages.',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Nurse Sarah Jenkins',
    familyContactName: 'Farid Osman',
    familyContactRelation: 'Son',
    familyContactEmail: 'farid.osman@yahoo.com',
    familyContactPhone: '+65 9876 5432'
  },
  {
    id: 'res_5',
    fullName: 'David Miller',
    preferredName: 'Dave',
    roomNumber: '106',
    bedNumber: 'Bed A',
    age: 80,
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    admissionDate: '2023-09-01',
    medicalNotes: 'Cardiac pacemaker check up to date. Enjoys courtyard sunbathing and watching classic films.',
    carePlan: ['Daily weight check', 'Light aerobic chair stretching', 'Evening pulse ox check'],
    dietaryRestrictions: 'Heart-healthy low sodium, plenty of fresh berries.',
    assignedCaregiverId: 'user_care_1',
    assignedCaregiverName: 'Nurse Sarah Jenkins',
    familyContactName: 'Samantha Miller',
    familyContactRelation: 'Daughter',
    familyContactEmail: 'sam.miller@gmail.com',
    familyContactPhone: '+65 9234 1122'
  }
];

export const INITIAL_CARE_LOGS: CareLog[] = [
  {
    id: 'log_1',
    residentId: 'res_1',
    residentFullName: 'Tan Ah Kow',
    roomNumber: '101',
    bedNumber: 'Bed A',
    mediaUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caregiverId: 'user_care_1',
    caregiverName: 'Nurse Sarah Jenkins',
    aiGeneratedFamilySummary: 'Uncle Ah Kow had a radiant and energetic morning! He joined the courtyard gardening session with a big smile, showing everyone his favorite potted orchids. He finished 100% of his breakfast including his favorite warm papaya, drank plenty of water, and was humming pleasantly with fellow residents.',
    clinicalStaffLog: 'Vitals stable. BP 122/78 mmHg, PR 72 bpm, SpO2 99%. 100% meal intake with oral fluids ~450ml this morning. Ambulating independently with light supervision. Positive affect and highly cooperative with morning routine.',
    keyHighlights: ['Courtyard orchid gardening', 'Finished full breakfast & warm papaya', 'Stable morning vitals', 'Cheerful social engagement'],
    meals: {
      breakfast: '100%',
      lunch: '100%',
      dinner: '75%',
      hydrationMl: 1450
    },
    mood: 'cheerful',
    vitals: {
      bloodPressure: '122/78',
      pulseRate: 72,
      temperature: 36.6,
      spo2: 99
    },
    activities: ['Gardening & Sunlight', 'Morning Chair Exercises', 'Social Tea Hour'],
    caregiverRawNotes: 'Ah Kow was very chatty this morning. Showed me the orchids in the garden. Ate all his papaya and eggs.',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    familyLikesCount: 4,
    familyCommentsCount: 2,
    flaggedForAdminReview: false
  },
  {
    id: 'log_2',
    residentId: 'res_2',
    residentFullName: 'Margaret Chen',
    roomNumber: '102',
    bedNumber: 'Bed B',
    mediaUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caregiverId: 'user_care_1',
    caregiverName: 'Nurse Sarah Jenkins',
    aiGeneratedFamilySummary: 'Peggy spent a peaceful and creative afternoon in the art therapy corner. She painted a lovely watercolor of cherry blossoms while listening to Mozart. Her knee comfort was very good today after her warm therapy wrap, and she enjoyed afternoon tea with strawberry slices.',
    clinicalStaffLog: 'Pre-lunch capillary glucose 6.1 mmol/L. Left knee 20-min thermal therapy applied at 13:30 with reported comfort improvement. Hydration total 1200ml by 15:00. Mood calm and relaxed.',
    keyHighlights: ['Watercolor painting activity', 'Knee therapy well-tolerated', 'Blood glucose in optimal range (6.1)', 'Relaxing afternoon tea'],
    meals: {
      breakfast: '75%',
      lunch: '100%',
      dinner: '100%',
      hydrationMl: 1350
    },
    mood: 'peaceful',
    vitals: {
      bloodPressure: '118/74',
      pulseRate: 68,
      temperature: 36.5,
      spo2: 98,
      bloodSugar: 6.1
    },
    activities: ['Art & Watercolor Therapy', 'Classical Music Listening', 'Knee Physical Therapy'],
    caregiverRawNotes: 'Peggy painted cherry blossoms. Knee felt better after heat pack. Drank all her tea.',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    familyLikesCount: 6,
    familyCommentsCount: 1,
    flaggedForAdminReview: false
  },
  {
    id: 'log_3',
    residentId: 'res_3',
    residentFullName: 'Arthur Pendelton',
    roomNumber: '104',
    bedNumber: 'Bed A',
    mediaUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caregiverId: 'user_care_1',
    caregiverName: 'Nurse Sarah Jenkins',
    aiGeneratedFamilySummary: 'Artie had a wonderful chess match today with his neighbor in the lounge and played a formidable opening! His occupational therapist noted steady improvements in right-hand grip strength, and he was in great spirits discussing his favorite historical books.',
    clinicalStaffLog: 'Gait training 25 mins completed with quad cane under PT supervision. Right grip strength test showed +15% improvement from baseline. 100% lunch consumed with high-protein dessert. No dizziness reported.',
    keyHighlights: ['Chess match victory', 'Grip strength +15% improvement', 'Full lunch & protein intake', 'Active conversationalist'],
    meals: {
      breakfast: '100%',
      lunch: '100%',
      dinner: '75%',
      hydrationMl: 1500
    },
    mood: 'active',
    vitals: {
      bloodPressure: '128/82',
      pulseRate: 76,
      temperature: 36.7,
      spo2: 98
    },
    activities: ['Chess & Brain Games', 'Physical & Grip Therapy', 'Lounge Social Hour'],
    caregiverRawNotes: 'Artie won a chess game today. OT session went super well, grip getting noticeably firmer.',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    familyLikesCount: 8,
    familyCommentsCount: 3,
    flaggedForAdminReview: false
  }
];

export const INITIAL_FAMILY_MESSAGES: FamilyMessage[] = [
  {
    id: 'msg_1',
    residentId: 'res_1',
    residentFullName: 'Tan Ah Kow',
    roomNumber: '101',
    bedNumber: 'Bed A',
    familyUserId: 'user_family_1',
    familyName: 'Jonathan Tan',
    familyRelation: 'Son',
    subject: 'Upcoming Weekend Birthday Visit & Favorite Custard Bun',
    messageText: 'Hi team, this Saturday is Dad\'s 79th birthday! We would love to bring his favorite low-sugar steamed custard buns around 2:30 PM for a small family tea in the courtyard. Could you confirm if that timing works and if any dietary precautions are needed?',
    category: 'visit_coordination',
    urgency: 'normal',
    status: 'intercepted_pending_admin',
    aiTriageSummary: 'Family requesting 2:30 PM Saturday birthday courtyard visit with low-sugar custard buns. Uncle Ah Kow is on a low sodium/soft texture diet with no sugar restriction conflicts.',
    aiSuggestedResponse: 'Dear Jonathan, what a wonderful milestone! Yes, 2:30 PM this Saturday is a perfect time for tea in our sunlit courtyard. Low-sugar soft custard buns are completely fine with Uncle Ah Kow\'s current dietary plan. We have reserved the courtyard table for your family and our team will prepare warm tea service.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'msg_2',
    residentId: 'res_2',
    residentFullName: 'Margaret Chen',
    roomNumber: '102',
    bedNumber: 'Bed B',
    familyUserId: 'user_fam_2',
    familyName: 'Clara Chen',
    familyRelation: 'Daughter',
    subject: 'Question on Knee Therapy and New Wool Socks',
    messageText: 'Thank you so much for the lovely painting update! Mom looked so peaceful. I dropped off two pairs of non-slip merino wool socks at the front desk this morning. Did she receive them? Also, how is her left knee responding to the evening cold weather?',
    category: 'care_concern',
    urgency: 'normal',
    status: 'responded',
    aiTriageSummary: 'Inquiry regarding receipt of non-slip socks dropped at reception and status of left knee comfort during colder evenings.',
    aiSuggestedResponse: 'Dear Clara, thank you for checking in! Yes, the non-slip merino wool socks were received by our reception team and placed neatly in Peggy\'s wardrobe. Her left knee has been responding very well to the 13:30 thermal wraps, and our evening nurse ensures she has a warm blanket before bedtime.',
    adminResponse: 'Dear Clara, thank you for checking in! Yes, the non-slip merino wool socks were received by our reception team and placed neatly in Peggy\'s wardrobe. Her left knee has been responding very well to the 13:30 thermal wraps, and our evening nurse ensures she has a warm blanket before bedtime.',
    respondedByAdminName: 'Eleanor Vance, RN (Director)',
    respondedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    id: 'msg_3',
    residentId: 'res_4',
    residentFullName: 'Siti Nurhaliza bte Osman',
    roomNumber: '105',
    bedNumber: 'Bed B',
    familyUserId: 'user_fam_3',
    familyName: 'Farid Osman',
    familyRelation: 'Son',
    subject: 'Heartfelt thank you for the singing session video!',
    messageText: 'I just watched the clip of Mak Siti singing her favorite Malay folk song with Nurse Sarah. It brought tears to our eyes—she looks so happy and well cared for. Please pass our deepest gratitude to the entire nursing team!',
    category: 'gratitude',
    urgency: 'low',
    status: 'intercepted_pending_admin',
    aiTriageSummary: 'Heartfelt gratitude message praising Nurse Sarah and team for Mak Siti\'s singing activity.',
    aiSuggestedResponse: 'Dear Farid, thank you so much for your kind words! Seeing Mak Siti\'s radiant smile and hearing her joyful singing brightens everyone\'s day in the ward. We will be sure to share your appreciation with Nurse Sarah during today\'s team huddle.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

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
    id: 'vtl_1',
    residentId: 'res_1',
    residentFullName: 'Tan Ah Kow',
    roomNumber: '101',
    bedNumber: 'Bed A',
    caregiverId: 'user_care_1',
    caregiverName: 'Nurse Sarah Jenkins',
    vitalsPhotoUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    readings: {
      bloodPressure: '118/76',
      pulseRate: 72,
      spo2: 98,
      temperature: 36.6,
      bloodSugar: 5.4,
    },
    deviceType: 'Digital Upper-Arm Blood Pressure Monitor',
    recordedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    formattedTime: '06:35 AM',
    formattedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isBefore7am: true,
    notes: 'Morning round completed. Uncle Ah Kow was awake, in great spirits, and greeted nursing staff before breakfast.',
    status: 'normal',
    aiExtracted: true
  },
  {
    id: 'vtl_2',
    residentId: 'res_2',
    residentFullName: 'Margaret Chen',
    roomNumber: '102',
    bedNumber: 'Bed B',
    caregiverId: 'user_care_1',
    caregiverName: 'Nurse Sarah Jenkins',
    vitalsPhotoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    readings: {
      bloodPressure: '124/80',
      pulseRate: 68,
      spo2: 99,
      temperature: 36.8,
      bloodSugar: 6.1,
    },
    deviceType: 'Fingertip Pulse Oximeter & Glucometer',
    recordedAt: new Date(Date.now() - 3600000 * 3.2).toISOString(),
    formattedTime: '06:48 AM',
    formattedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isBefore7am: true,
    notes: 'Fasting capillary glucose 6.1 mmol/L within optimal target range. Left knee rested comfortably.',
    status: 'normal',
    aiExtracted: true
  },
  {
    id: 'vtl_3',
    residentId: 'res_3',
    residentFullName: 'Arthur Pendelton',
    roomNumber: '104',
    bedNumber: 'Bed A',
    caregiverId: 'user_care_1',
    caregiverName: 'Nurse Sarah Jenkins',
    vitalsPhotoUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
    readings: {
      bloodPressure: '126/82',
      pulseRate: 74,
      spo2: 98,
      temperature: 36.7,
      bloodSugar: 5.8,
    },
    deviceType: 'Bedside Multi-Parameter Spot Monitor',
    recordedAt: new Date(Date.now() - 3600000 * 3.1).toISOString(),
    formattedTime: '06:54 AM',
    formattedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isBefore7am: true,
    notes: 'Pre-7AM vitals check completed on time. Slept soundly, baseline vitals completely stable.',
    status: 'normal',
    aiExtracted: true
  }
];

