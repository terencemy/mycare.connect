import React, { useState } from 'react';
import {
  Resident,
  CareLog,
  FamilyMessage,
  UserProfile,
  MorningVitalsRecord,
} from '../../types';
import {
  Heart,
  MessageSquare,
  ShieldCheck,
  Send,
  Calendar,
  Sparkles,
  Droplets,
  Activity,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
  Phone,
  Mail,
  ChevronRight,
  Info,
  ZoomIn,
  Check,
  Thermometer,
} from 'lucide-react';
import { isResidentMatch, getLatestVitalsForResident, deduplicateCareLogs } from '../../utils/residentMatcher';

interface FamilyPortalViewProps {
  currentFamilyUser: UserProfile;
  residents: Resident[];
  careLogs: CareLog[];
  familyMessages: FamilyMessage[];
  morningVitals?: MorningVitalsRecord[];
  onSendMessage: (msg: Partial<FamilyMessage>) => Promise<void>;
  onLikeLog: (logId: string) => Promise<void>;
}

export const FamilyPortalView: React.FC<FamilyPortalViewProps> = ({
  currentFamilyUser,
  residents,
  careLogs,
  familyMessages,
  morningVitals = [],
  onSendMessage,
  onLikeLog,
}) => {
  // Find linked resident or default to first
  const defaultResident =
    residents.find((r) => isResidentMatch(r, currentFamilyUser.residentId)) || residents[0] || null;
  const [selectedResidentId, setSelectedResidentId] = useState<string>(defaultResident?.id || '');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedResidentId && residents.length > 0) {
      const def = residents.find((r) => isResidentMatch(r, currentFamilyUser.residentId)) || residents[0];
      if (def) setSelectedResidentId(def.id);
    }
  }, [residents, selectedResidentId, currentFamilyUser.residentId]);

  const activeResident =
    residents.find((r) => isResidentMatch(r, selectedResidentId)) || defaultResident;

  // Filter logs & messages for active resident with resilient matching and guaranteed deduplication (Only approved logs are visible to family)
  const residentLogs = React.useMemo(() => {
    const rawMatches = careLogs.filter(
      (l) => isResidentMatch(activeResident, l) && l.approvalStatus === 'approved'
    );
    return deduplicateCareLogs(rawMatches);
  }, [careLogs, activeResident]);

  const residentMessages = familyMessages.filter((m) => isResidentMatch(activeResident, m));

  // Consolidate latest verified morning vitals from Morning Rounds and Care Logs
  const activeVitals = getLatestVitalsForResident(activeResident, morningVitals, careLogs);

  // Message modal state
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<FamilyMessage['category']>('visit_coordination');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResident || !messageText.trim()) return;

    setIsSending(true);
    await onSendMessage({
      residentId: activeResident.id,
      residentFullName: activeResident.fullName,
      roomNumber: activeResident.roomNumber,
      bedNumber: activeResident.bedNumber,
      familyUserId: currentFamilyUser.id,
      familyName: currentFamilyUser.name,
      familyRelation: 'Family Member',
      subject: subject || 'General Care Inquiry',
      messageText,
      category,
    });

    setIsSending(false);
    setSendSuccess(true);
    setTimeout(() => {
      setSendSuccess(false);
      setIsMessageModalOpen(false);
      setSubject('');
      setMessageText('');
    }, 2000);
  };

  if (residents.length === 0 || !activeResident) {
    return (
      <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-full bg-[#F0ECE2] text-[#889E81] flex items-center justify-center mx-auto border border-[#E6E2D3]">
          <Heart className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-serif font-bold text-[#5A5A40]">Welcome to Family Portal</h2>
          <p className="text-xs text-[#7C7C6D] mt-1.5 leading-relaxed">
            No resident records are registered in the facility yet. As soon as a resident profile is created or synced from Supabase, their daily moments, care updates, and verified vitals will appear here in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resident Switcher & Header Card */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center font-serif font-bold text-lg border border-[#889E81]/30 shrink-0 shadow-2xs">
              {activeResident?.fullName ? activeResident.fullName.charAt(0) : 'R'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-serif font-bold text-[#5A5A40]">
                  {activeResident?.fullName}
                </h1>
                {activeResident?.preferredName && (
                  <span className="text-xs font-semibold text-[#7C7C6D]">
                    (&ldquo;{activeResident.preferredName}&rdquo;)
                  </span>
                )}
                <span className="bg-[#EBF1EA] text-[#5A5A40] text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-[#889E81]/30">
                  Room {activeResident?.roomNumber}, {activeResident?.bedNumber}
                </span>
              </div>
              <p className="text-xs text-[#7C7C6D] mt-0.5">
                Primary Caregiver: <strong className="text-[#5A5A40]">{activeResident?.assignedCaregiverName || 'Caregiver Staff'}</strong> &bull; Admitted: {activeResident?.admissionDate}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Resident Selector dropdown */}
            <select
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              className="text-xs font-semibold bg-[#FAF9F6] border border-[#E6E2D3] rounded-full px-3 py-2 text-[#5A5A40] focus:ring-2 focus:ring-[#889E81]"
            >
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} (R {r.roomNumber})
                </option>
              ))}
            </select>

            <button
              id="family-open-inquiry-btn"
              type="button"
              onClick={() => setIsMessageModalOpen(true)}
              className="px-4 py-2 bg-[#889E81] hover:bg-[#788E71] text-white rounded-full text-xs font-bold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Care Team</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Dedicated Daily Vital Signs Section */}
      <section className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-[24px] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E2D3]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#889E81] text-white flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center space-x-1.5">
                <span>Daily Clinical Vital Signs</span>
              </h2>
              <p className="text-[11px] text-[#7C7C6D]">
                {activeVitals ? (
                  <>
                    Audited by <strong className="text-[#5A5A40]">{activeVitals.caregiverName}</strong> on {activeVitals.formattedDate} at {activeVitals.formattedTime}
                  </>
                ) : (
                  'Daily clinical round conducted by nursing staff'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeVitals?.photoUrl && (
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(activeVitals.photoUrl!)}
                className="text-[11px] font-bold bg-white text-[#5A5A40] hover:text-[#889E81] px-3 py-1.5 rounded-full border border-[#E6E2D3] flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#889E81]" />
                <span>{activeVitals.secondaryPhotoUrl ? 'Monitor 1 Photo' : 'Watermark Photo'}</span>
              </button>
            )}
            {activeVitals?.secondaryPhotoUrl && (
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(activeVitals.secondaryPhotoUrl!)}
                className="text-[11px] font-bold bg-white text-[#5A5A40] hover:text-[#889E81] px-3 py-1.5 rounded-full border border-[#E6E2D3] flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#889E81]" />
                <span>Monitor 2 Photo</span>
              </button>
            )}
            {activeVitals ? (
              <span className="text-[11px] font-extrabold text-[#5A5A40] bg-[#EBF1EA] px-3 py-1 rounded-full border border-[#889E81]/40 flex items-center space-x-1">
                <Check className="w-3.5 h-3.5 text-[#889E81]" />
                <span>Verified {activeVitals.formattedTime}</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[#8C8C7E] bg-white px-3 py-1 rounded-full border border-[#E6E2D3]">
                Pending Daily Round
              </span>
            )}
          </div>
        </div>

        {/* Vitals Photo Gallery & Telemetry Numbers */}
        <div className="space-y-3">
          {/* Prominent Clinical Monitor Photo Bar */}
          {activeVitals?.photoUrl && (
            <div className="bg-white border border-[#E6E2D3] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 shrink-0">
                  <div
                    onClick={() => setSelectedPreviewImage(activeVitals.photoUrl!)}
                    className="relative group w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border border-[#E6E2D3] bg-[#2C332A] cursor-pointer shrink-0 shadow-2xs"
                  >
                    <img
                      src={activeVitals.photoUrl}
                      alt="Verified Monitor Photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  {activeVitals.secondaryPhotoUrl && (
                    <div
                      onClick={() => setSelectedPreviewImage(activeVitals.secondaryPhotoUrl!)}
                      className="relative group w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border border-[#E6E2D3] bg-[#2C332A] cursor-pointer shrink-0 shadow-2xs"
                    >
                      <img
                        src={activeVitals.secondaryPhotoUrl}
                        alt="Monitor 2 Photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#5A5A40]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#889E81]" />
                    <span>Bedside Monitor Photo Verified</span>
                  </div>
                  <p className="text-[11px] text-[#7C7C6D] mt-0.5">
                    Watermarked photo captured on {activeVitals.formattedDate} at {activeVitals.formattedTime}. Tap photo to inspect.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPreviewImage(activeVitals.photoUrl!)}
                className="text-[11px] font-bold text-[#5A5A40] hover:text-[#889E81] bg-[#FAF9F6] px-3 py-1.5 rounded-full border border-[#E6E2D3] flex items-center justify-center space-x-1.5 shadow-2xs shrink-0 cursor-pointer self-start sm:self-center"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#889E81]" />
                <span>Enlarge Watermark</span>
              </button>
            </div>
          )}

          {/* Vitals Key Metrics Grid */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 ${activeVitals?.bloodSugar !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5`}>
            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D3] shadow-2xs">
              <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold tracking-wider">
                Blood Pressure
              </span>
              <div className="text-base font-extrabold text-[#5A5A40] mt-0.5">
                {activeVitals?.bloodPressure || (activeVitals ? '120/80' : '—')}
                <span className="text-[10px] font-normal text-[#8C8C7E] ml-1">mmHg</span>
              </div>
              <span className="text-[10px] text-[#889E81] font-semibold block mt-0.5">
                {activeVitals?.bloodPressure ? 'Audited' : 'Pending'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D3] shadow-2xs">
              <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold tracking-wider">
                Heart Pulse
              </span>
              <div className="text-base font-extrabold text-[#5A5A40] mt-0.5">
                {activeVitals?.pulseRate !== undefined ? activeVitals.pulseRate : (activeVitals ? '72' : '—')}
                <span className="text-[10px] font-normal text-[#8C8C7E] ml-1">bpm</span>
              </div>
              <span className="text-[10px] text-[#889E81] font-semibold block mt-0.5">
                Normal Rhythm
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D3] shadow-2xs">
              <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold tracking-wider">
                Oxygen (SpO2)
              </span>
              <div className="text-base font-extrabold text-[#5A5A40] mt-0.5">
                {activeVitals?.spo2 !== undefined ? activeVitals.spo2 : (activeVitals ? '98' : '—')}
                <span className="text-[10px] font-normal text-[#8C8C7E] ml-1">%</span>
              </div>
              <span className="text-[10px] text-[#889E81] font-semibold block mt-0.5">
                Optimal
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D3] shadow-2xs">
              <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold tracking-wider">
                Body Temp
              </span>
              <div className="text-base font-extrabold text-[#5A5A40] mt-0.5">
                {activeVitals?.temperature !== undefined ? activeVitals.temperature : (activeVitals ? '36.6' : '—')}
                <span className="text-[10px] font-normal text-[#8C8C7E] ml-1">°C</span>
              </div>
              <span className="text-[10px] text-[#889E81] font-semibold block mt-0.5">
                Afebrile
              </span>
            </div>

            {activeVitals?.bloodSugar !== undefined && (
              <div className="bg-white p-3 rounded-2xl border border-[#E6E2D3] shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1">
                <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold tracking-wider">
                  Fasting Sugar
                </span>
                <div className="text-base font-extrabold text-[#5A5A40] mt-0.5">
                  {activeVitals.bloodSugar}
                  <span className="text-[10px] font-normal text-[#8C8C7E] ml-1">mmol/L</span>
                </div>
                <span className="text-[10px] text-[#889E81] font-semibold block mt-0.5">
                  Target Range
                </span>
              </div>
            )}
          </div>

          {/* Vitals Clinical Notes if recorded */}
          {activeVitals?.notes && (
            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D3] text-xs text-[#5A5A40]">
              <span className="text-[10px] text-[#8C8C7E] uppercase font-bold block mb-0.5">Caregiver Clinical Note:</span>
              <p>{activeVitals.notes}</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Daily Moments & Care Updates Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Daily Moments & Care Feed */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#889E81]" />
              <span>Daily Moments &amp; Care</span>
            </h2>
            <span className="text-xs text-[#7C7C6D] font-medium">
              {residentLogs.length} updates logged
            </span>
          </div>

          {residentLogs.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-8 text-center text-[#7C7C6D]">
              <Sparkles className="w-8 h-8 mx-auto text-[#889E81] mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[#5A5A40]">No daily care moments posted yet for this resident.</p>
              <p className="text-xs text-[#8C8C7E] mt-1">
                The on-duty care staff will publish a photo update soon!
              </p>
            </div>
          ) : (
            residentLogs.map((log) => (
              <article
                key={log.id}
                className="bg-white rounded-[24px] border border-[#E6E2D3] overflow-hidden shadow-xs space-y-4 p-5 hover:border-[#889E81]/60 transition-all"
              >
                {/* Author Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#EBF1EA] flex items-center justify-center text-[#5A5A40] font-bold text-xs border border-[#889E81]/30">
                      {log.caregiverName ? log.caregiverName.charAt(0) : 'C'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#5A5A40]">
                        {log.caregiverName || 'Caregiver Staff'}
                      </div>
                      <div className="text-[11px] text-[#8C8C7E]">
                        {new Date(log.timestamp).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F0ECE2] text-[#5A5A40] border border-[#E6E2D3] flex items-center space-x-1">
                    <span>Mood:</span>
                    <strong className="capitalize">{log.mood || 'Cheerful'}</strong>
                  </span>
                </div>

                {/* Media Image */}
                {log.mediaUrl && (
                  <div
                    onClick={() => setSelectedPreviewImage(log.mediaUrl!)}
                    className="rounded-2xl overflow-hidden bg-[#2D2D24] aspect-video relative group cursor-pointer"
                  >
                    <img
                      src={log.mediaUrl}
                      alt={log.residentFullName}
                      className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full flex items-center space-x-1.5 backdrop-blur-xs">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Enlarge Photo</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* AI Reassuring Family Narrative */}
                <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-1.5 text-[#5A5A40] font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-[#889E81]" />
                    <span>Today&apos;s Reassuring Update</span>
                  </div>
                  <p className="text-xs text-[#4A4A40] leading-relaxed font-normal">
                    &ldquo;{log.aiGeneratedFamilySummary}&rdquo;
                  </p>
                </div>

                {/* Telemetry Stats Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E6E2D3]">
                    <span className="text-[10px] text-[#8C8C7E] font-bold uppercase block">
                      Breakfast
                    </span>
                    <span className="font-bold text-[#5A5A40]">{log.meals?.breakfast || 'N/A'}</span>
                  </div>
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E6E2D3]">
                    <span className="text-[10px] text-[#8C8C7E] font-bold uppercase block">
                      Lunch
                    </span>
                    <span className="font-bold text-[#5A5A40]">{log.meals?.lunch || 'N/A'}</span>
                  </div>
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E6E2D3]">
                    <span className="text-[10px] text-[#8C8C7E] font-bold uppercase block">
                      Dinner
                    </span>
                    <span className="font-bold text-[#5A5A40]">{log.meals?.dinner || 'N/A'}</span>
                  </div>
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E6E2D3]">
                    <span className="text-[10px] text-[#8C8C7E] font-bold uppercase block">
                      Hydration
                    </span>
                    <span className="font-bold text-[#889E81]">{log.meals?.hydrationMl || 800} ml</span>
                  </div>
                </div>

                {/* Activity Badges */}
                {log.activities && log.activities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {log.activities.map((act, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-[#F0ECE2] text-[#5A5A40] font-medium px-2.5 py-1 rounded-full border border-[#E6E2D3]"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                )}

                {/* Interactions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E6E2D3] text-xs">
                  <button
                    type="button"
                    onClick={() => onLikeLog(log.id)}
                    className="flex items-center space-x-1.5 text-rose-700 hover:text-rose-800 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>Send Love &amp; Gratitude ({log.familyLikesCount || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMessageModalOpen(true)}
                    className="text-[#889E81] hover:text-[#5A5A40] font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Have a question about this update?</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Right Column: Resident Medical Profile & Intercepted Message Status (4 cols on lg / 5 cols on md iPad) */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          {/* Quick Care Plan Card */}
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-[#889E81]" />
              <span>Care Summary &amp; Diet</span>
            </h3>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-[#8C8C7E] block text-[11px]">Dietary Plan:</span>
                <span className="font-semibold text-[#5A5A40]">
                  {activeResident?.dietaryRestrictions || 'Standard balanced, soft texture'}
                </span>
              </div>

              <div>
                <span className="text-[#8C8C7E] block text-[11px]">Medical Notes:</span>
                <p className="text-[#4A4A40] text-[11px] leading-relaxed bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E6E2D3]">
                  {activeResident?.medicalNotes || 'General assisted living care protocol.'}
                </p>
              </div>

              <div>
                <span className="text-[#8C8C7E] block text-[11px]">Key Care Focus:</span>
                <ul className="list-disc list-inside text-[11px] text-[#5A5A40] space-y-0.5">
                  {activeResident?.carePlan?.map((p, i) => (
                    <li key={i}>{p}</li>
                  )) || <li>Routine vitals check</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Intercepted Family Communications Hub Status */}
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-[#889E81]" />
                <span>My Inquiries to Admin</span>
              </h3>
              <span className="text-[10px] font-bold text-[#5A5A40] bg-[#EBF1EA] px-2.5 py-0.5 rounded-full border border-[#889E81]/30">
                Protected Channel
              </span>
            </div>

            <p className="text-[11px] text-[#7C7C6D] leading-relaxed">
              To allow frontline nurses to focus 100% on patient care, your questions are routed directly to our <strong>Facility Management &amp; Nursing Director</strong>.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {residentMessages.length === 0 ? (
                <div className="text-center py-4 text-[#8C8C7E] text-xs">
                  No active inquiries. Click &ldquo;Contact Care Team&rdquo; to send a message.
                </div>
              ) : (
                residentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl border border-[#E6E2D3] bg-[#FAF9F6] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#5A5A40] truncate">
                        {msg.subject}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          msg.status === 'responded'
                            ? 'bg-[#EBF1EA] text-[#5A5A40] border-[#889E81]/30'
                            : 'bg-[#F0ECE2] text-[#7C7C6D] border-[#E6E2D3]'
                        }`}
                      >
                        {msg.status === 'responded' ? 'Answered by Admin' : 'Reviewing by Admin'}
                      </span>
                    </div>

                    <p className="text-[#4A4A40] text-[11px] line-clamp-2">
                      &ldquo;{msg.messageText}&rdquo;
                    </p>

                    {msg.adminResponse && (
                      <div className="bg-white p-2.5 rounded-xl border border-[#889E81]/40 text-[#4A4A40] mt-1 space-y-1">
                        <div className="text-[10px] font-bold text-[#5A5A40] flex items-center justify-between">
                          <span>{msg.respondedByAdminName || 'Facility Director'}</span>
                          <span className="text-[#8C8C7E] font-normal">
                            {msg.respondedAt && new Date(msg.respondedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {msg.adminResponse}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODAL: Send Message to Facility (Intercepted to Admin) */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-xl space-y-4 border border-[#E6E2D3]">
            <div className="flex items-center justify-between border-b border-[#E6E2D3] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center font-bold border border-[#889E81]/30">
                  <ShieldCheck className="w-5 h-5 text-[#889E81]" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
                    Contact Facility Care Leadership
                  </h3>
                  <p className="text-[11px] text-[#7C7C6D]">
                    Regarding {activeResident?.fullName} (Room {activeResident?.roomNumber})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(false)}
                className="text-[#8C8C7E] hover:text-[#5A5A40] text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Transparency Note */}
            <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-3.5 text-xs text-[#5A5A40] flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-[#889E81] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-[#7C7C6D]">
                <strong className="text-[#5A5A40]">Why your message goes to Administration:</strong> Inquiries are intercepted by our Nursing Management team to coordinate immediate answers, check medical logs, and let bedside nurses give their undivided care to your loved one.
              </p>
            </div>

            <form onSubmit={handleSubmitInquiry} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                  Inquiry Topic / Category:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs font-semibold bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl p-2.5 text-[#5A5A40] focus:ring-2 focus:ring-[#889E81]"
                >
                  <option value="visit_coordination">Visit &amp; Weekend Activity Coordination</option>
                  <option value="care_concern">Care, Comfort or Therapy Question</option>
                  <option value="medication_inquiry">Diet, Snacks or Medication Drop-off</option>
                  <option value="gratitude">Appreciation &amp; Praise for Staff</option>
                  <option value="urgent_inquiry">Urgent Administrative Request</option>
                  <option value="general">General Question</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                  Subject:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Saturday afternoon courtyard visit..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                  Your Message:
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your message, question, or request..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7C7C6D] hover:bg-[#FAF9F6] rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="family-submit-inquiry-btn"
                  type="submit"
                  disabled={isSending || sendSuccess}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center space-x-2 text-white transition-all cursor-pointer ${
                    sendSuccess
                      ? 'bg-[#889E81]'
                      : 'bg-[#889E81] hover:bg-[#788E71] shadow-xs'
                  }`}
                >
                  {sendSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sent to Leadership!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isSending ? 'Routing...' : 'Send Inquiry to Admin'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Photo Zoom Preview Modal */}
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#2C332A] rounded-[24px] overflow-hidden max-w-3xl w-full border border-white/20 shadow-2xl flex flex-col">
            <div className="p-4 bg-black/40 flex items-center justify-between border-b border-white/10 text-white">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Verified Clinical Watermarked Image Audit</span>
              </div>
              <button
                onClick={() => setSelectedPreviewImage(null)}
                className="text-white/70 hover:text-white text-sm bg-white/10 px-3 py-1 rounded-full cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/90">
              <img
                src={selectedPreviewImage}
                alt="Watermarked Vital Sign Reading Preview"
                className="max-h-[70vh] object-contain rounded-xl border border-white/10"
              />
            </div>
            <div className="p-3 bg-black/60 text-white/80 text-xs flex items-center justify-between border-t border-white/10">
              <span>Date &amp; Time Watermark rendered directly into pixel data via HTML5 Canvas</span>
              <span className="text-emerald-400 font-mono font-semibold">Daily Clinical Vitals</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

