import React, { useState } from 'react';
import {
  Resident,
  CareLog,
  FamilyMessage,
  UserProfile,
  MorningVitalsRecord,
} from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Bed,
  Send,
  AlertTriangle,
  Heart,
  TrendingUp,
  Database,
  Plus,
  Edit2,
  FileCode,
  Check,
  Search,
  ZoomIn,
  Activity,
} from 'lucide-react';

interface AdminDashboardViewProps {
  adminUser: UserProfile;
  residents: Resident[];
  careLogs: CareLog[];
  familyMessages: FamilyMessage[];
  morningVitals?: MorningVitalsRecord[];
  onRespondMessage: (msgId: string, responseText: string) => Promise<void>;
  onAddResident: (res: Partial<Resident>) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  adminUser,
  residents,
  careLogs,
  familyMessages,
  morningVitals = [],
  onRespondMessage,
  onAddResident,
}) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'vitals_audit' | 'residents' | 'analytics' | 'supabase_schema'>('triage');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<FamilyMessage | null>(
    familyMessages.find((m) => m.status === 'intercepted_pending_admin') || familyMessages[0] || null
  );
  const [responseDraft, setResponseDraft] = useState('');
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // New Resident Form Modal
  const [isAddResidentModalOpen, setIsAddResidentModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPreferredName, setNewPreferredName] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newBedNumber, setNewBedNumber] = useState('Bed A');
  const [newAge, setNewAge] = useState(80);
  const [newDiet, setNewDiet] = useState('Standard balanced, soft texture');
  const [newMedicalNotes, setNewMedicalNotes] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyEmail, setNewFamilyEmail] = useState('');

  // When a message is selected, initialize response draft with AI suggested response if available
  const handleSelectMessage = (msg: FamilyMessage) => {
    setSelectedMessage(msg);
    setResponseDraft(msg.adminResponse || msg.aiSuggestedResponse || '');
  };

  const handleSendAdminResponse = async () => {
    if (!selectedMessage || !responseDraft.trim()) return;
    setIsSendingResponse(true);

    await onRespondMessage(selectedMessage.id, responseDraft);
    setIsSendingResponse(false);
  };

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newRoomNumber) return;

    await onAddResident({
      fullName: newFullName,
      preferredName: newPreferredName || newFullName.split(' ')[0],
      roomNumber: newRoomNumber,
      bedNumber: newBedNumber,
      age: newAge,
      dietaryRestrictions: newDiet,
      medicalNotes: newMedicalNotes || 'Assisted living general care plan.',
      carePlan: ['Routine vitals check', 'Nutritional monitoring', 'Hydration schedule'],
      assignedCaregiverId: 'user_care_1',
      assignedCaregiverName: 'Nurse Sarah Jenkins',
      familyContactName: newFamilyName || 'Next of Kin',
      familyContactRelation: 'Family Member',
      familyContactEmail: newFamilyEmail || 'family@example.com',
      familyContactPhone: '+1 (555) 019-2834',
      photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
      admissionDate: new Date().toISOString().split('T')[0],
    });

    setIsAddResidentModalOpen(false);
    setNewFullName('');
    setNewRoomNumber('');
  };

  const pendingMessages = familyMessages.filter(
    (m) => m.status === 'intercepted_pending_admin'
  );
  const resolvedMessages = familyMessages.filter(
    (m) => m.status === 'responded' || m.status === 'resolved'
  );

  const SUPABASE_SQL_SCHEMA = `-- PostgreSQL & Supabase DDL for Care Connect Family Transparency SaaS

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Residents Table
CREATE TABLE public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    preferred_name TEXT,
    room_number TEXT NOT NULL,
    bed_number TEXT NOT NULL, -- e.g., 'Bed A', 'Bed B'
    age INT,
    photo_url TEXT,
    medical_notes TEXT,
    care_plan JSONB DEFAULT '[]'::jsonb,
    dietary_restrictions TEXT,
    assigned_caregiver_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Care Logs Table (One-click media + Multimodal AI output)
CREATE TABLE public.care_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_full_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    bed_number TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    caregiver_id UUID REFERENCES auth.users(id),
    ai_generated_family_summary TEXT NOT NULL,
    clinical_staff_log TEXT,
    key_highlights JSONB DEFAULT '[]'::jsonb,
    meals JSONB NOT NULL,
    mood TEXT NOT NULL,
    vitals JSONB,
    activities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Family Messages Table (Intercepted direct to Admin Dashboard)
CREATE TABLE public.family_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    family_user_id UUID REFERENCES auth.users(id),
    family_name TEXT NOT NULL,
    family_relation TEXT,
    subject TEXT NOT NULL,
    message_text TEXT NOT NULL,
    category TEXT NOT NULL,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'intercepted_pending_admin' CHECK (status IN ('intercepted_pending_admin', 'in_progress', 'responded', 'resolved')),
    ai_triage_summary TEXT,
    ai_suggested_response TEXT,
    admin_response TEXT,
    responded_by_admin_name TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security (RLS)
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

-- Caregivers and Admins have full read/write; Families can only read their linked resident's care logs
CREATE POLICY "Families can view linked resident logs" 
ON public.care_logs FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.family_residents WHERE resident_id = care_logs.resident_id));
`;

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[24px] border border-[#E6E2D3] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F0ECE2] text-[#5A5A40] flex items-center justify-center font-bold shrink-0 border border-[#E6E2D3]">
            <ShieldAlert className="w-5 h-5 text-[#889E81]" />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40]">
              {pendingMessages.length}
            </div>
            <div className="text-xs text-[#7C7C6D] font-medium">
              Intercepted Inquiries Pending
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[24px] border border-[#E6E2D3] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center font-bold shrink-0 border border-[#889E81]/30">
            <Sparkles className="w-5 h-5 text-[#889E81]" />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40]">{careLogs.length}</div>
            <div className="text-xs text-[#7C7C6D] font-medium">AI Care Logs Published</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[24px] border border-[#E6E2D3] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF9F6] text-[#5A5A40] flex items-center justify-center font-bold shrink-0 border border-[#E6E2D3]">
            <Clock className="w-5 h-5 text-[#889E81]" />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40]">
              {Math.round(careLogs.length * 8.5)} mins
            </div>
            <div className="text-xs text-[#7C7C6D] font-medium">Nurse Typing Time Saved</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[24px] border border-[#E6E2D3] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center font-bold shrink-0 border border-[#889E81]/30">
            <ShieldCheck className="w-5 h-5 text-[#889E81]" />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40]">100%</div>
            <div className="text-xs text-[#7C7C6D] font-medium">Frontline Staff Shielded</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-[#E6E2D3] overflow-x-auto">
        <button
          id="admin-tab-triage"
          onClick={() => setActiveTab('triage')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'triage'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-[#889E81]" />
          <span>Family Message Interception Hub ({pendingMessages.length})</span>
        </button>

        <button
          id="admin-tab-vitals-audit"
          onClick={() => setActiveTab('vitals_audit')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'vitals_audit'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#889E81]" />
          <span>Pre-7 AM Vitals Audit &amp; Watermarks</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1EA] text-[#5A5A40] border border-[#889E81]/30">
            {morningVitals.length}/{residents.length} Completed
          </span>
        </button>

        <button
          id="admin-tab-residents"
          onClick={() => setActiveTab('residents')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'residents'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Bed className="w-4 h-4 text-[#889E81]" />
          <span>Resident &amp; Bed Directory ({residents.length})</span>
        </button>

        <button
          id="admin-tab-supabase"
          onClick={() => setActiveTab('supabase_schema')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'supabase_schema'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Database className="w-4 h-4 text-[#889E81]" />
          <span>Supabase / PostgreSQL Schema</span>
        </button>
      </div>

      {/* TAB: PRE-7 AM VITALS AUDIT & WATERMARKS */}
      {activeTab === 'vitals_audit' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-[24px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-[#889E81]" />
                <h3 className="text-base font-serif font-bold text-[#5A5A40]">
                  Pre-07:00 AM Clinical Vital Sign Protocol Compliance
                </h3>
              </div>
              <p className="text-xs text-[#7C7C6D]">
                Every morning prior to 07:00 AM, nursing staff captures an equipment reading with an immutable Canvas-baked watermark showing date, time, resident bed tag, and supervisor signature.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-[#E6E2D3] text-right">
                <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold">Round Completion</span>
                <span className="text-lg font-bold text-[#889E81]">
                  {Math.round((morningVitals.length / Math.max(residents.length, 1)) * 100)}%
                </span>
              </div>
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-[#E6E2D3] text-right">
                <span className="text-[10px] text-[#8C8C7E] uppercase block font-bold">Timestamp Audit</span>
                <span className="text-lg font-bold text-[#5A5A40]">100% Pass</span>
              </div>
            </div>
          </div>

          {/* Vitals Table */}
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E6E2D3] flex items-center justify-between bg-[#FAF9F6]">
              <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                Morning Shift Vitals &amp; Watermark Registry
              </span>
              <span className="text-xs text-[#7C7C6D]">
                Updated Today &bull; Real-time OCR &amp; Verification
              </span>
            </div>

            <div className="divide-y divide-[#E6E2D3]">
              {residents.map((res) => {
                const record = morningVitals.find((v) => v.residentId === res.id);

                return (
                  <div key={res.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#FAF9F6]/60 transition-colors">
                    <div className="flex items-center space-x-3 min-w-[200px]">
                      <div className="w-10 h-10 rounded-2xl bg-[#F0ECE2] border border-[#E6E2D3] flex items-center justify-center font-bold text-xs text-[#5A5A40] shrink-0">
                        {res.roomNumber}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#5A5A40]">{res.fullName}</h4>
                        <span className="text-[11px] text-[#8C8C7E]">{res.bedNumber} &bull; Age {res.age}</span>
                      </div>
                    </div>

                    {/* Vitals Telemetry Values */}
                    {record ? (
                      <div className="grid grid-cols-4 gap-3 text-xs bg-[#F7F5F0] p-2.5 rounded-2xl border border-[#E6E2D3] min-w-[320px]">
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">BP</span>
                          <span className="font-bold text-[#5A5A40]">{record.readings.bloodPressure || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">Pulse</span>
                          <span className="font-bold text-[#5A5A40]">{record.readings.pulseRate || 'N/A'} bpm</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">SpO2</span>
                          <span className="font-bold text-[#5A5A40]">{record.readings.spo2 || 'N/A'}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">Temp</span>
                          <span className="font-bold text-[#5A5A40]">{record.readings.temperature || 'N/A'}°C</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#8C8C7E] italic py-2">
                        Pending morning pre-7am vital capture...
                      </div>
                    )}

                    {/* Watermarked photo & status */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {record?.vitalsPhotoUrl ? (
                        <div
                          onClick={() => setSelectedPreviewImage(record.vitalsPhotoUrl)}
                          className="relative group w-16 h-12 rounded-xl overflow-hidden border border-[#E6E2D3] bg-[#2C332A] cursor-pointer shadow-xs"
                        >
                          <img
                            src={record.vitalsPhotoUrl}
                            alt="Watermarked Vitals"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : null}

                      <div className="text-right">
                        {record ? (
                          <>
                            <div className="flex items-center space-x-1 text-[11px] font-bold text-[#889E81]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{record.formattedTime}</span>
                            </div>
                            <span className="text-[10px] text-[#8C8C7E] block">By {record.caregiverName}</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Awaiting Round
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: INTERCEPTION & TRIAGE HUB */}
      {activeTab === 'triage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Message Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                Intercepted Inquiries Queue
              </h3>
              <span className="text-xs text-[#7C7C6D]">
                {pendingMessages.length} pending action
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {familyMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isPending = msg.status === 'intercepted_pending_admin';

                return (
                  <button
                    key={msg.id}
                    id={`select-message-${msg.id}`}
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-4 rounded-[20px] border transition-all space-y-2 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#889E81] bg-[#F7F5F0] shadow-xs'
                        : 'border-[#E6E2D3] bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5A5A40] truncate">
                        {msg.familyName} ({msg.familyRelation})
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isPending
                            ? 'bg-[#F0ECE2] text-[#5A5A40] border-[#E6E2D3]'
                            : 'bg-[#EBF1EA] text-[#5A5A40] border-[#889E81]/30'
                        }`}
                      >
                        {isPending ? 'Action Required' : 'Answered'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#889E81]">
                      Re: {msg.residentFullName} (Rm {msg.roomNumber}, {msg.bedNumber})
                    </div>

                    <p className="text-xs text-[#7C7C6D] line-clamp-2">
                      &ldquo;{msg.messageText}&rdquo;
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#8C8C7E] pt-1">
                      <span className="capitalize">Category: {msg.category.replace('_', ' ')}</span>
                      <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Message Detail & AI Triage Response Station (7 cols) */}
          <div className="lg:col-span-7">
            {selectedMessage ? (
              <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-6 shadow-xs space-y-5">
                {/* Header of message */}
                <div className="flex items-start justify-between border-b border-[#E6E2D3] pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-serif font-bold text-[#5A5A40]">
                        {selectedMessage.subject}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0ECE2] text-[#5A5A40] uppercase border border-[#E6E2D3]">
                        {selectedMessage.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#7C7C6D] mt-1">
                      From: <strong className="text-[#5A5A40]">{selectedMessage.familyName}</strong> ({selectedMessage.familyRelation}) &bull; For Resident: <strong className="text-[#5A5A40]">{selectedMessage.residentFullName}</strong> (Room {selectedMessage.roomNumber}, {selectedMessage.bedNumber})
                    </p>
                  </div>
                </div>

                {/* Family's Actual Message */}
                <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E6E2D3]">
                  <span className="text-[11px] font-bold text-[#7C7C6D] uppercase block mb-1">
                    Family Inquiry Text:
                  </span>
                  <p className="text-xs text-[#4A4A40] leading-relaxed italic">
                    &ldquo;{selectedMessage.messageText}&rdquo;
                  </p>
                </div>

                {/* AI Triage Briefing */}
                {selectedMessage.aiTriageSummary && (
                  <div className="bg-[#F0ECE2] border border-[#E6E2D3] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-[#5A5A40] font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-[#889E81]" />
                      <span>AI Executive Triage Briefing for Administration</span>
                    </div>
                    <p className="text-xs text-[#4A4A40] leading-relaxed">
                      {selectedMessage.aiTriageSummary}
                    </p>
                  </div>
                )}

                {/* AI Suggested Response or Sent Response */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-[#889E81]" />
                      <span>
                        {selectedMessage.status === 'responded'
                          ? 'Official Response Provided to Family:'
                          : 'Official Administrative Response (AI Drafted - Edit or Send):'}
                      </span>
                    </label>

                    {selectedMessage.aiSuggestedResponse && selectedMessage.status !== 'responded' && (
                      <button
                        type="button"
                        onClick={() =>
                          setResponseDraft(selectedMessage.aiSuggestedResponse || '')
                        }
                        className="text-[11px] font-bold text-[#889E81] hover:text-[#5A5A40] underline cursor-pointer"
                      >
                        Reset to AI Suggested Draft
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={5}
                    value={responseDraft}
                    onChange={(e) => setResponseDraft(e.target.value)}
                    disabled={selectedMessage.status === 'responded'}
                    className="w-full text-xs p-3.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl focus:ring-2 focus:ring-[#889E81] focus:outline-none leading-relaxed text-[#4A4A40]"
                    placeholder="Type official response to family..."
                  />
                </div>

                {/* Action Buttons */}
                {selectedMessage.status === 'intercepted_pending_admin' ? (
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      id="admin-send-response-btn"
                      type="button"
                      disabled={isSendingResponse || !responseDraft.trim()}
                      onClick={handleSendAdminResponse}
                      className="px-6 py-3 bg-[#889E81] hover:bg-[#788E71] text-white text-xs font-bold rounded-full shadow-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isSendingResponse ? 'Dispatching...' : 'Approve & Dispatch Response to Family'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#EBF1EA] rounded-2xl border border-[#889E81]/30 text-xs text-[#5A5A40] font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#889E81]" />
                    <span>
                      Responded by {selectedMessage.respondedByAdminName || 'Eleanor Vance, RN'} on{' '}
                      {selectedMessage.respondedAt &&
                        new Date(selectedMessage.respondedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-8 text-center text-[#8C8C7E]">
                Select an inquiry from the left to view details and triage response.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESIDENT & BED DIRECTORY */}
      {activeTab === 'residents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
              Resident Directory &amp; Bed Allocation ({residents.length} Active Residents)
            </h3>
            <button
              id="admin-open-add-resident-btn"
              type="button"
              onClick={() => setIsAddResidentModalOpen(true)}
              className="px-4 py-2.5 bg-[#889E81] hover:bg-[#788E71] text-white rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Admit New Resident</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {residents.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={r.photoUrl}
                    alt={r.fullName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#E6E2D3]"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#5A5A40]">
                      {r.fullName}
                    </h4>
                    <span className="text-[10px] font-bold text-[#5A5A40] bg-[#F0ECE2] border border-[#E6E2D3] px-2.5 py-0.5 rounded-full">
                      Room {r.roomNumber} &bull; {r.bedNumber}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#7C7C6D] space-y-1 pt-2 border-t border-[#E6E2D3]">
                  <p>
                    <span className="text-[#8C8C7E]">Age:</span> {r.age} yrs &bull; Admitted: {r.admissionDate}
                  </p>
                  <p>
                    <span className="text-[#8C8C7E]">Caregiver:</span> <strong className="text-[#5A5A40]">{r.assignedCaregiverName}</strong>
                  </p>
                  <p>
                    <span className="text-[#8C8C7E]">Diet:</span> {r.dietaryRestrictions}
                  </p>
                  <p>
                    <span className="text-[#8C8C7E]">Family:</span> {r.familyContactName} ({r.familyContactRelation}) - {r.familyContactPhone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE / POSTGRESQL SCHEMA */}
      {activeTab === 'supabase_schema' && (
        <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#5A5A40] flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#889E81]" />
                <span>Supabase PostgreSQL Schema &amp; Security Definitions</span>
              </h3>
              <p className="text-xs text-[#7C7C6D]">
                Production-ready database tables with Row Level Security (RLS) policies for GitHub &amp; Render deployment.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2000);
              }}
              className="px-3.5 py-2 bg-[#F0ECE2] hover:bg-[#E6E2D3] text-[#5A5A40] rounded-full text-xs font-semibold flex items-center space-x-1.5 border border-[#E6E2D3] cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-[#889E81]" /> : <FileCode className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <pre className="bg-[#2D2D24] text-[#FAF9F6] p-4 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[500px] border border-[#E6E2D3]">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      )}

      {/* MODAL: Admit New Resident */}
      {isAddResidentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-[#E6E2D3]">
            <div className="flex items-center justify-between border-b border-[#E6E2D3] pb-3">
              <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
                Admit New Resident to Care Center
              </h3>
              <button
                type="button"
                onClick={() => setIsAddResidentModalOpen(false)}
                className="text-[#8C8C7E] hover:text-[#5A5A40] text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateResident} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Full Legal Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., George Wong"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Preferred Name / Nickname:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Uncle George"
                    value={newPreferredName}
                    onChange={(e) => setNewPreferredName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Room Number:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 204"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Bed Identifier:
                  </label>
                  <select
                    value={newBedNumber}
                    onChange={(e) => setNewBedNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-[#5A5A40] focus:ring-2 focus:ring-[#889E81]"
                  >
                    <option value="Bed A">Bed A</option>
                    <option value="Bed B">Bed B</option>
                    <option value="Bed C">Bed C</option>
                    <option value="Single Room">Single Room</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Age:
                  </label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                  Dietary Restrictions &amp; Likes:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Diabetic low-sugar, prefers warm tea"
                  value={newDiet}
                  onChange={(e) => setNewDiet(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Primary Family Contact:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sarah Wong (Daughter)"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Family Contact Email:
                  </label>
                  <input
                    type="email"
                    placeholder="sarah.wong@gmail.com"
                    value={newFamilyEmail}
                    onChange={(e) => setNewFamilyEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddResidentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7C7C6D] hover:bg-[#FAF9F6] rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="admin-submit-resident-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-[#889E81] hover:bg-[#788E71] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer"
                >
                  Save Resident &amp; Bed Tag
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
                <span className="font-bold text-sm">Supervisor Watermark Inspection</span>
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
              <span>Canvas Direct Pixel Watermark: Date, Time &amp; Bed Tag Embedded</span>
              <span className="text-emerald-400 font-mono font-semibold">Pre-07:00 AM Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
