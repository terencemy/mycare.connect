import React, { useState, useRef, useEffect } from 'react';
import {
  Resident,
  CareLog,
  ResidentMood,
  MealCheck,
  VitalsData,
  GenerateCareLogResponse,
  UserProfile,
  MorningVitalsRecord,
} from '../../types';
import { MorningVitalsModule } from './MorningVitalsModule';
import { getVitalsAuditMetrics } from '../../utils/residentMatcher';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Smile,
  Heart,
  Activity,
  Coffee,
  Check,
  Search,
  Bed,
  ShieldCheck,
  Send,
  AlertCircle,
  FileText,
  Clock,
  RefreshCw,
  Sparkle,
  Calendar,
  Users,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface CaregiverViewProps {
  residents: Resident[];
  caregiver: UserProfile;
  onPublishLog: (newLog: Partial<CareLog>) => Promise<void>;
  existingLogs: CareLog[];
  morningVitals: MorningVitalsRecord[];
  onSaveMorningVitals: (record: Partial<MorningVitalsRecord>) => Promise<void>;
}

const AVAILABLE_ACTIVITIES = [
  'Courtyard Gardening 🌿',
  'Morning Mobility Stretch 🧘',
  'Watercolor & Art Therapy 🎨',
  'Music & Folk Singing 🎵',
  'Chess & Cognitive Games ♟️',
  'Afternoon High Tea 🍵',
  'Physical Therapy (Gait) 🚶‍♂️',
  'Lounge Reminiscence Group 📖',
];

const MOODS: { id: ResidentMood; label: string; emoji: string; color: string }[] = [
  { id: 'cheerful', label: 'Cheerful & Smiling', emoji: '😊', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'peaceful', label: 'Peaceful & Content', emoji: '🕊️', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'active', label: 'Active & Engaged', emoji: '🏃‍♂️', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  { id: 'calm', label: 'Calm & Relaxed', emoji: '☕', color: 'bg-teal-100 text-teal-900 border-teal-300' },
  { id: 'resting', label: 'Resting & Nap', emoji: '😴', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  { id: 'reflective', label: 'Quiet & Reflective', emoji: '📖', color: 'bg-purple-100 text-purple-900 border-purple-300' },
];

export const CaregiverView: React.FC<CaregiverViewProps> = ({
  residents,
  caregiver,
  onPublishLog,
  existingLogs,
  morningVitals = [],
  onSaveMorningVitals,
}) => {
  // 1. Mandatory Resident Tagging State (derives live from residents prop for immediate sync with Admin edits)
  const [selectedResidentId, setSelectedResidentId] = useState<string>(residents[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedResidentId && residents.length > 0) {
      setSelectedResidentId(residents[0].id);
    }
  }, [residents, selectedResidentId]);

  const selectedResident =
    residents.find((r) => r.id === selectedResidentId) || residents[0] || null;

  // 2. Media Upload State
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaBase64, setMediaBase64] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. Fast Telemetry & Checkbox State
  const [meals, setMeals] = useState<MealCheck>({
    breakfast: 'N/A',
    lunch: 'N/A',
    dinner: 'N/A',
    hydrationMl: 800,
  });
  const [selectedMood, setSelectedMood] = useState<ResidentMood>('cheerful');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([
    'Courtyard Gardening 🌿',
    'Morning Mobility Stretch 🧘',
  ]);
  const [vitals, setVitals] = useState<VitalsData>({
    bloodPressure: '120/78',
    pulseRate: 72,
    temperature: 36.6,
    spo2: 99,
  });
  const [quickNote, setQuickNote] = useState('');

  // 4. AI Generation State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<GenerateCareLogResponse | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'morning_vitals' | 'create' | 'history'>('morning_vitals');

  // Filter residents for tagging
  const filteredResidents = residents.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNumber.includes(searchQuery) ||
      r.bedNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setMediaBase64(result);
      setMediaUrl(result);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleActivity = (act: string) => {
    setSelectedActivities((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  // Generate AI Care Log with 1 click
  const handleGenerateAI = async () => {
    if (!selectedResident) return;
    setIsGeneratingAI(true);
    setAiResult(null);

    try {
      const response = await fetch('/api/care-logs/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentFullName: selectedResident.fullName,
          roomNumber: selectedResident.roomNumber,
          bedNumber: selectedResident.bedNumber,
          mediaBase64: mediaBase64 || undefined,
          mediaMimeType: mediaBase64 ? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg') : undefined,
          mediaDescription: `Photo of ${selectedResident.preferredName} participating in ${selectedActivities.join(', ')}`,
          rawCaregiverNotes: quickNote,
          meals,
          mood: selectedMood,
          vitals,
          activities: selectedActivities,
          caregiverName: caregiver.name,
        }),
      });

      const data: GenerateCareLogResponse = await response.json();
      setAiResult(data);
    } catch (err) {
      console.error('Failed to generate care log:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Publish Log to Family Timeline (Requires Admin Approval)
  const handlePublish = async () => {
    if (!selectedResident || !aiResult) return;

    await onPublishLog({
      residentId: selectedResident.id,
      residentFullName: selectedResident.fullName,
      roomNumber: selectedResident.roomNumber,
      bedNumber: selectedResident.bedNumber,
      mediaUrl,
      mediaType,
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      aiGeneratedFamilySummary: aiResult.familyWarmUpdate,
      clinicalStaffLog: aiResult.clinicalStaffLog,
      keyHighlights: aiResult.keyHighlights,
      meals,
      mood: selectedMood,
      vitals,
      activities: selectedActivities,
      caregiverRawNotes: quickNote,
      approvalStatus: 'pending_approval',
    });

    setPublishSuccess(true);
    setTimeout(() => {
      setPublishSuccess(false);
      setAiResult(null);
      setQuickNote('');
    }, 2500);
  };

  const vitalsMetrics = getVitalsAuditMetrics(residents, morningVitals, existingLogs);

  return (
    <div className="space-y-6">
      {/* Top Banner: Nurse Focus Shield Notification */}
      <div className="bg-[#F0ECE2] border border-[#E6E2D3] rounded-[24px] p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#889E81] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#5A5A40] flex items-center space-x-2">
              <span>Caregiver Focus Shield: Active</span>
              <span className="bg-[#EBF1EA] text-[#5A5A40] text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-[#889E81]/30">
                Zero Interruptions
              </span>
            </h2>
            <p className="text-xs text-[#7C7C6D]">
              All direct family messages and inquiries are automatically diverted to the Admin Triage Dashboard. Your typing is minimized so you can focus on resident care.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#E6E2D3] overflow-x-auto">
        <button
          id="caregiver-tab-morning-vitals"
          onClick={() => setActiveTab('morning_vitals')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'morning_vitals'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#889E81]" />
          <span>Daily Vitals Round</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1EA] text-[#5A5A40] border border-[#889E81]/30">
            {vitalsMetrics.completedBeds}/{vitalsMetrics.totalBeds} Beds
          </span>
        </button>
        <button
          id="caregiver-tab-create"
          onClick={() => setActiveTab('create')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'create'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Camera className="w-4 h-4 text-[#889E81]" />
          <span>Care Log</span>
        </button>
        <button
          id="caregiver-tab-history"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'history'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#889E81]" />
          <span>My Shift Log History ({existingLogs.length})</span>
        </button>
      </div>

      {activeTab === 'morning_vitals' && (
        <MorningVitalsModule
          residents={residents}
          caregiver={caregiver}
          morningVitals={morningVitals}
          onSaveMorningVitals={onSaveMorningVitals}
          onSelectForCareLog={(record) => {
            setSelectedResidentId(record.residentId);
            if (record.vitalsPhotoUrl) setMediaUrl(record.vitalsPhotoUrl);
            if (record.readings) {
              setVitals({
                bloodPressure: record.readings.bloodPressure || vitals.bloodPressure,
                pulseRate: record.readings.pulseRate || vitals.pulseRate,
                temperature: record.readings.temperature || vitals.temperature,
                spo2: record.readings.spo2 || vitals.spo2,
                bloodSugar: record.readings.bloodSugar || vitals.bloodSugar,
                vitalsPhotoUrl: record.vitalsPhotoUrl,
                secondaryVitalsPhotoUrl: record.secondaryVitalsPhotoUrl,
                vitalsRecordedAt: record.recordedAt,
                isBefore7am: record.isBefore7am,
              });
            }
            setActiveTab('create');
          }}
        />
      )}

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Resident Tagging & Media Selection (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. REQUIRED RESIDENT TAGGING SECTION */}
            <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center space-x-1.5">
                  <Bed className="w-4 h-4 text-[#889E81]" />
                  <span>1. Tag Resident (Mandatory)</span>
                </label>
                <span className="text-[11px] text-[#5A5A40] font-semibold bg-[#F0ECE2] px-2 py-0.5 rounded-full border border-[#E6E2D3]">
                  Room &amp; Bed Required
                </span>
              </div>

              {/* Search Bar for Touch/Desktop */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-[#8C8C7E] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search resident name, room (e.g. 101), bed..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-full border border-[#E6E2D3] focus:outline-none focus:ring-2 focus:ring-[#889E81] bg-[#FAF9F6] text-[#4A4A40]"
                />
              </div>

              {/* Fast Touch-Friendly Resident Cards Grid */}
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredResidents.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E6E2D3]">
                    <Users className="w-8 h-8 text-[#8C8C7E] mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-semibold text-[#5A5A40]">No residents registered</p>
                    <p className="text-[11px] text-[#7C7C6D] mt-0.5">Add residents in the Admin tab or sync from Supabase.</p>
                  </div>
                ) : (
                  filteredResidents.map((res) => {
                    const isSelected = selectedResident?.id === res.id;
                    return (
                      <button
                        key={res.id}
                        id={`tag-resident-${res.id}`}
                        type="button"
                        onClick={() => setSelectedResidentId(res.id)}
                        className={`text-left p-3 rounded-[20px] border transition-all flex items-center space-x-3 cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#889E81] bg-[#F7F5F0] shadow-xs'
                            : 'border-[#E6E2D3] bg-white hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#EBF1EA] text-[#5A5A40] font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-[#E6E2D3]">
                          {res.fullName
                            ? res.fullName
                                .split(' ')
                                .filter(Boolean)
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()
                            : 'R'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#5A5A40] truncate">
                              {res.fullName}
                            </span>
                            <span className="text-[10px] font-bold text-[#5A5A40] bg-[#F0ECE2] px-2 py-0.5 rounded-full border border-[#E6E2D3]">
                              R {res.roomNumber} &bull; {res.bedNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7C7C6D] truncate">
                            Known as: &ldquo;{res.preferredName}&rdquo; &bull; {res.dietaryRestrictions}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#889E81] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Tagging Confirmation Banner */}
              {selectedResident && (
                <div className="mt-3 p-2.5 bg-[#F0ECE2] rounded-2xl border border-[#E6E2D3] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[#7C7C6D]">Currently Selected: </span>
                    <strong className="text-[#5A5A40] font-bold">
                      {selectedResident.fullName} (Room {selectedResident.roomNumber}, {selectedResident.bedNumber})
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* 2. ONE-CLICK MEDIA UPLOAD & CAMERA CAPTURE */}
            <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-[#889E81]" />
                  <span>2. One-Click Photo / Video</span>
                </span>
                <span className="text-[11px] text-[#7C7C6D]">Optional</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*"
                className="hidden"
              />

              {mediaUrl || mediaBase64 ? (
                /* Uploaded Attachment Card */
                <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#889E81]/40 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    {mediaType === 'image' ? (
                      <img
                        src={mediaUrl || mediaBase64}
                        alt="Attached media"
                        className="w-12 h-12 rounded-xl object-cover border border-[#E6E2D3] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center shrink-0 border border-[#889E81]/30 font-bold text-xs">
                        VIDEO
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#5A5A40] truncate">
                        Media Attached
                      </div>
                      <div className="text-[11px] text-[#7C7C6D]">
                        Ready for AI multi-modal vision
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-lg hover:bg-[#F0ECE2] transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrl('');
                        setMediaBase64('');
                      }}
                      className="p-1 text-[#7C7C6D] hover:text-[#C27D60] rounded-lg hover:bg-white transition-colors cursor-pointer"
                      title="Remove media"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty Upload Dropzone / Button */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-[#E6E2D3] hover:border-[#889E81] bg-[#FAF9F6] hover:bg-[#F0ECE2]/40 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EBF1EA] text-[#889E81] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#5A5A40]">
                      {isUploading ? 'Processing File...' : 'Upload Photo or Video (Optional)'}
                    </div>
                    <div className="text-[11px] text-[#7C7C6D] mt-0.5">
                      Click to choose an activity photo/video or drag &amp; drop
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Telemetry Checkboxes & AI Synthesis (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#F0ECE2] rounded-[32px] border border-[#E6E2D3] p-6 shadow-inner space-y-5">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#889E81] mb-1">
                  Currently Tagged
                </span>
                <h3 className="text-2xl font-serif font-semibold text-[#5A5A40]">
                  {selectedResident?.fullName || 'Select Resident'}
                </h3>
                <p className="text-xs text-[#7C7C6D]">
                  Room {selectedResident?.roomNumber}, {selectedResident?.bedNumber} &bull; {selectedResident?.dietaryRestrictions}
                </p>
              </div>

              {/* Mood Selector */}
              <div>
                <label className="text-xs font-semibold text-[#5A5A40] block mb-2">
                  Resident Mood &amp; Affect Today:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                  {MOODS.map((m) => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        className={`p-2.5 rounded-2xl text-xs font-semibold border flex items-center space-x-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#889E81] text-white border-[#889E81] shadow-xs'
                            : 'border-white bg-white/70 text-[#5A5A40] hover:bg-white'
                        }`}
                      >
                        <span className="text-base">{m.emoji}</span>
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meals & Hydration */}
              <div className="space-y-3 pt-2 border-t border-[#E6E2D3]">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#E6E2D3]"></div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#7C7C6D]">Quick Telemetry</span>
                  <div className="flex-1 h-px bg-[#E6E2D3]"></div>
                </div>

                <label className="text-xs font-semibold text-[#5A5A40] block">
                  Meals Consumed:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => (
                    <div key={mealKey} className="bg-white/70 p-3 rounded-2xl border border-white">
                      <div className="text-[10px] font-bold uppercase text-[#7C7C6D] mb-1.5 capitalize">
                        {mealKey}
                      </div>
                      <select
                        value={meals[mealKey]}
                        onChange={(e) =>
                          setMeals((prev) => ({
                            ...prev,
                            [mealKey]: e.target.value as any,
                          }))
                        }
                        className="w-full text-xs font-semibold bg-white border border-[#E6E2D3] rounded-xl p-1.5 text-[#5A5A40] focus:ring-1 focus:ring-[#889E81]"
                      >
                        <option value="N/A">N/A (Not Served / Pending)</option>
                        <option value="100%">100% (Finished)</option>
                        <option value="75%">75% (Good)</option>
                        <option value="50%">50% (Half)</option>
                        <option value="25%">25% (Few bites)</option>
                        <option value="Refused">Refused</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#5A5A40] font-medium">
                    Total Fluids &amp; Hydration: <strong className="text-[#889E81] font-bold">{meals.hydrationMl} ml</strong>
                  </span>
                  <input
                    type="range"
                    min="500"
                    max="2200"
                    step="50"
                    value={meals.hydrationMl}
                    onChange={(e) =>
                      setMeals((prev) => ({
                        ...prev,
                        hydrationMl: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-44 accent-[#889E81] cursor-pointer"
                  />
                </div>
              </div>

              {/* Activities Participated */}
              <div className="pt-2 border-t border-[#E6E2D3]">
                <label className="text-xs font-semibold text-[#5A5A40] block mb-2">
                  Activities &amp; Engagement (Tap all that apply):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ACTIVITIES.map((act) => {
                    const active = selectedActivities.includes(act);
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => toggleActivity(act)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-[#889E81] text-white border-[#889E81] shadow-xs'
                            : 'bg-white/70 text-[#5A5A40] border-white hover:bg-white'
                        }`}
                      >
                        {act}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Quick Nurse Voice/Text Scratchpad */}
              <div className="pt-2 border-t border-[#E6E2D3]">
                <label className="text-xs font-semibold text-[#5A5A40] block mb-1">
                  Quick Nurse Notes (Optional micro-keywords):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Loved the papaya, smiled with neighbor, gait steady..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-[#E6E2D3] rounded-2xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                />
              </div>

              {/* AI GENERATE BUTTON */}
              <div className="pt-2">
                <button
                  id="caregiver-generate-ai-btn"
                  type="button"
                  disabled={isGeneratingAI || !selectedResident}
                  onClick={handleGenerateAI}
                  className="w-full py-3.5 px-4 bg-[#889E81] hover:bg-[#788E71] text-white font-bold rounded-2xl text-sm shadow-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingAI ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Analyzing Media &amp; Synthesizing AI Care Log...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-200" />
                      <span>One-Click AI Generate (Family Story + Clinical Log)</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI SYNTHESIS RESULT CARD */}
              {aiResult && (
                <div className="mt-4 bg-white/80 border border-[#E6E2D3] rounded-[24px] p-5 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-[#E6E2D3] pb-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#889E81]" />
                      <h4 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wide">
                        AI Generated Care Log Preview
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-[#5A5A40] bg-[#EBF1EA] px-2.5 py-0.5 rounded-full border border-[#889E81]/30">
                      Reassurance Index: {aiResult.reassuranceScore}%
                    </span>
                  </div>

                  {/* Family Narrative */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#5A5A40] uppercase">
                      Warm Family Update (Sent to Family Portal):
                    </span>
                    <p className="text-xs text-[#4A4A40] leading-relaxed bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#E6E2D3]">
                      &ldquo;{aiResult.familyWarmUpdate}&rdquo;
                    </p>
                  </div>

                  {/* Clinical EHR Staff Log */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#7C7C6D] uppercase">
                      Clinical Shift Summary (For Facility EHR &amp; Handover):
                    </span>
                    <p className="text-xs text-[#5A5A40] font-mono bg-[#FAF9F6] p-3 rounded-2xl border border-[#E6E2D3]">
                      {aiResult.clinicalStaffLog}
                    </p>
                  </div>

                  {/* Attached Selections & Telemetry to Report */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-[#7C7C6D] uppercase">
                      Attached Daily Telemetry &amp; Selections in Report:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E6E2D3]">
                        <span className="text-[9px] text-[#8C8C7E] font-bold uppercase block">Breakfast</span>
                        <strong className="text-[#5A5A40]">{meals.breakfast}</strong>
                      </div>
                      <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E6E2D3]">
                        <span className="text-[9px] text-[#8C8C7E] font-bold uppercase block">Lunch</span>
                        <strong className="text-[#5A5A40]">{meals.lunch}</strong>
                      </div>
                      <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E6E2D3]">
                        <span className="text-[9px] text-[#8C8C7E] font-bold uppercase block">Dinner</span>
                        <strong className="text-[#5A5A40]">{meals.dinner}</strong>
                      </div>
                      <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E6E2D3]">
                        <span className="text-[9px] text-[#8C8C7E] font-bold uppercase block">Hydration</span>
                        <strong className="text-[#889E81]">{meals.hydrationMl} ml</strong>
                      </div>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div>
                    <span className="text-[11px] font-bold text-[#7C7C6D] uppercase block mb-1">
                      Key Highlights:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.keyHighlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-white border border-[#E6E2D3] text-[#5A5A40] px-2.5 py-0.5 rounded-full"
                        >
                          &bull; {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Publish Button */}
                  <div className="pt-2">
                    <button
                      id="caregiver-publish-log-btn"
                      type="button"
                      onClick={handlePublish}
                      disabled={publishSuccess}
                      className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        publishSuccess
                          ? 'bg-[#889E81] text-white'
                          : 'bg-[#5A5A40] hover:bg-[#4A4A30] text-white shadow-xs'
                      }`}
                    >
                      {publishSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Submitted for Admin Review &amp; Approval!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Update for Admin Approval</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-[#7C7C6D] mt-2">
                      Updates are reviewed by the Operations Admin before publishing to the Family Portal.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
              Recent Care Logs Posted ({existingLogs.length})
            </h3>
            <span className="text-xs text-[#7C7C6D]">Live Synchronized Timeline</span>
          </div>

          <div className="space-y-4">
            {existingLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-[20px] border border-[#E6E2D3] bg-[#FAF9F6] flex flex-col md:flex-row gap-4 items-start"
              >
                {log.mediaUrl ? (
                  <img
                    src={log.mediaUrl}
                    alt={log.residentFullName}
                    className="w-full md:w-36 h-28 object-cover rounded-2xl shrink-0 border border-[#E6E2D3]"
                  />
                ) : (
                  <div className="w-full md:w-36 h-28 bg-[#EBF1EA] text-[#5A5A40] rounded-2xl flex flex-col items-center justify-center shrink-0 border border-[#889E81]/30">
                    <Activity className="w-6 h-6 text-[#889E81] mb-1" />
                    <span className="text-[10px] font-bold text-[#7C7C6D]">Care Routine</span>
                  </div>
                )}
                <div className="flex-1 space-y-1.5 w-full">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-[#5A5A40]">
                        {log.residentFullName}
                      </span>
                      <span className="text-[10px] font-bold text-[#5A5A40] bg-[#F0ECE2] px-2.5 py-0.5 rounded-full border border-[#E6E2D3]">
                        R {log.roomNumber} &bull; {log.bedNumber}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Approval Status Badge */}
                      {log.approvalStatus === 'approved' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Approved &amp; Live for Family</span>
                        </span>
                      ) : log.approvalStatus === 'rejected' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Revision Requested</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>Pending Admin Approval</span>
                        </span>
                      )}

                      <span className="text-[11px] text-[#8C8C7E]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A4A40] line-clamp-2">
                    {log.aiGeneratedFamilySummary}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] text-[#7C7C6D] pt-1">
                    <span>Mood: <strong className="text-[#5A5A40] capitalize">{log.mood}</strong></span>
                    <span>&bull;</span>
                    <span>Meals: <strong className="text-[#5A5A40]">B: {log.meals.breakfast} • L: {log.meals.lunch} • D: {log.meals.dinner}</strong></span>
                    <span>&bull;</span>
                    <span>Hydration: <strong className="text-[#5A5A40]">{log.meals.hydrationMl}ml</strong></span>
                    <span>&bull;</span>
                    <span className="text-[#889E81] font-semibold">By: {log.caregiverName}</span>
                  </div>

                  {log.adminReviewNotes && (
                    <div className="mt-2 p-2 bg-[#F0ECE2] rounded-xl text-[11px] text-[#5A5A40] border border-[#E6E2D3]">
                      <strong>Admin Note:</strong> {log.adminReviewNotes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
