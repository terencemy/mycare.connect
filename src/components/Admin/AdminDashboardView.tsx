import React, { useState } from 'react';
import { supabase, SUPABASE_URL, syncAllResidentsToSupabase } from '../../lib/supabaseClient';
import { isResidentMatch, getLatestVitalsForResident } from '../../utils/residentMatcher';
import {
  Resident,
  CareLog,
  FamilyMessage,
  UserProfile,
  MorningVitalsRecord,
  BED_IDENTIFIER_OPTIONS,
  RegisteredAdmin,
  AdminAuthSession,
} from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
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
  Trash2,
  FileCode,
  Check,
  Search,
  ZoomIn,
  Activity,
  Globe,
  Key,
  RefreshCw,
  Mail,
  Phone,
  CloudCheck,
  UploadCloud,
  X,
  Lock,
  UserPlus,
  UserCheck,
  Shield,
  KeyRound,
  LogOut,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

interface AdminDashboardViewProps {
  adminUser: UserProfile;
  residents: Resident[];
  careLogs: CareLog[];
  familyMessages: FamilyMessage[];
  morningVitals?: MorningVitalsRecord[];
  adminAuthSession?: AdminAuthSession;
  onLockAdminSession?: () => void;
  onRespondMessage: (msgId: string, responseText: string) => Promise<void>;
  onApproveCareLog?: (logId: string, status: 'approved' | 'rejected', reviewNotes?: string) => Promise<void>;
  onBulkApproveCareLogs?: () => Promise<void>;
  onAddResident: (res: Partial<Resident>) => Promise<void>;
  onUpdateResident?: (residentId: string, updatedFields: Partial<Resident>) => Promise<void>;
  onDeleteResident?: (residentId: string) => Promise<void>;
  onRefreshResidents?: () => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  adminUser,
  residents,
  careLogs,
  familyMessages,
  morningVitals = [],
  adminAuthSession,
  onLockAdminSession,
  onRespondMessage,
  onApproveCareLog,
  onBulkApproveCareLogs,
  onAddResident,
  onUpdateResident,
  onDeleteResident,
  onRefreshResidents,
}) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'care_logs' | 'vitals_audit' | 'residents' | 'analytics' | 'supabase_schema' | 'admin_security'>('triage');
  const [careLogSearch, setCareLogSearch] = useState('');
  const [careLogStatusFilter, setCareLogStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isApprovingLogId, setIsApprovingLogId] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; log: CareLog | null; reason: string }>({
    isOpen: false,
    log: null,
    reason: '',
  });
  const [approvalToast, setApprovalToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Registered Admin Management States
  const [registeredAdmins, setRegisteredAdmins] = useState<RegisteredAdmin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [showAdminEmail, setShowAdminEmail] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', title: '' });
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminSecurityMsg, setAdminSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load registered admins
  const loadRegisteredAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const res = await fetch('/api/auth/admin/registered-directory');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRegisteredAdmins(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load registered admins:', e);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  React.useEffect(() => {
    loadRegisteredAdmins();
  }, []);

  const handleRegisterNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name.trim() || !newAdminForm.email.trim()) {
      setAdminSecurityMsg({ type: 'error', text: 'Admin name and registered email are required.' });
      return;
    }

    setIsSubmittingAdmin(true);
    setAdminSecurityMsg(null);

    try {
      const res = await fetch('/api/auth/admin/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdminForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAdminSecurityMsg({ type: 'error', text: data.message || 'Failed to register admin' });
      } else {
        setAdminSecurityMsg({ type: 'success', text: `✓ Administrator ${newAdminForm.name} (${newAdminForm.email}) is now registered and authorized to verify.` });
        setNewAdminForm({ name: '', email: '', title: '' });
        await loadRegisteredAdmins();
      }
    } catch (err: any) {
      setAdminSecurityMsg({ type: 'error', text: 'Network error registering admin.' });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (adminId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/auth/admin/registered/${adminId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setRegisteredAdmins((prev) =>
          prev.map((a) => (a.id === adminId ? { ...a, status: newStatus as any } : a))
        );
        setAdminSecurityMsg({
          type: 'success',
          text: `Admin status changed to ${newStatus.toUpperCase()}`,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<FamilyMessage | null>(
    familyMessages.find((m) => m.status === 'intercepted_pending_admin') || familyMessages[0] || null
  );
  const [responseDraft, setResponseDraft] = useState('');
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supabaseTestMsg, setSupabaseTestMsg] = useState<string>('');

  // Bulk Supabase Sync State & Feedback
  const [isSyncingAllSupabase, setIsSyncingAllSupabase] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Approval Handlers
  const handleApprove = async (log: CareLog) => {
    setIsApprovingLogId(log.id);
    try {
      if (onApproveCareLog) {
        await onApproveCareLog(log.id, 'approved');
      }
      setApprovalToast({
        type: 'success',
        message: `✓ Care update for ${log.residentFullName} has been approved and published to the Family Portal!`,
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsApprovingLogId(null);
    }
  };

  const handleOpenRejectModal = (log: CareLog) => {
    setRejectionModal({
      isOpen: true,
      log,
      reason: log.adminReviewNotes || '',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectionModal.log) return;
    const targetLog = rejectionModal.log;
    setIsApprovingLogId(targetLog.id);
    try {
      if (onApproveCareLog) {
        await onApproveCareLog(targetLog.id, 'rejected', rejectionModal.reason || 'Revisions requested by Administrator.');
      }
      setApprovalToast({
        type: 'info',
        message: `Caregiver update for ${targetLog.residentFullName} marked as revision requested. It remains hidden from family feed.`,
      });
      setTimeout(() => setApprovalToast(null), 4000);
      setRejectionModal({ isOpen: false, log: null, reason: '' });
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setIsApprovingLogId(null);
    }
  };

  const handleRevokeApproval = async (log: CareLog) => {
    setIsApprovingLogId(log.id);
    try {
      if (onApproveCareLog) {
        await onApproveCareLog(log.id, 'pending_approval', 'Approval revoked for administrative review.');
      }
      setApprovalToast({
        type: 'info',
        message: `Care update for ${log.residentFullName} returned to pending approval status.`,
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err) {
      console.error('Revoke failed:', err);
    } finally {
      setIsApprovingLogId(null);
    }
  };

  const handleBulkApprove = async () => {
    setIsBulkApproving(true);
    try {
      if (onBulkApproveCareLogs) {
        await onBulkApproveCareLogs();
      }
      setApprovalToast({
        type: 'success',
        message: `✓ All pending caregiver updates have been approved and published to family feeds!`,
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err) {
      console.error('Bulk approval failed:', err);
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleSyncAllResidents = async () => {
    setIsSyncingAllSupabase(true);
    try {
      const result = await syncAllResidentsToSupabase(residents);
      if (result.success) {
        setSyncToast({
          type: 'success',
          message: `Successfully synchronized ${result.count || residents.length} residents to your Supabase PostgreSQL table!`,
        });
        if (onRefreshResidents) {
          await onRefreshResidents();
        }
      } else {
        setSyncToast({
          type: 'error',
          message: `Supabase sync notice: ${result.error}`,
        });
      }
    } catch (err: any) {
      setSyncToast({
        type: 'error',
        message: `Sync failed: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsSyncingAllSupabase(false);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  // Inline Editing in Interception & Triage Pane
  const [isEditingInterceptionTarget, setIsEditingInterceptionTarget] = useState(false);
  const [editInterceptionResidentName, setEditInterceptionResidentName] = useState('');
  const [editInterceptionRoom, setEditInterceptionRoom] = useState('');
  const [editInterceptionBed, setEditInterceptionBed] = useState('Bed 01');
  const [isSavingInterceptionEdit, setIsSavingInterceptionEdit] = useState(false);

  // Edit Resident Modal in Directory
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPreferredName, setEditPreferredName] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editBedNumber, setEditBedNumber] = useState('Bed 01');
  const [editAge, setEditAge] = useState(80);
  const [editDiet, setEditDiet] = useState('');
  const [editCaregiverName, setEditCaregiverName] = useState('');
  const [editFamilyName, setEditFamilyName] = useState('');
  const [editFamilyRelation, setEditFamilyRelation] = useState('Family Member');
  const [editFamilyEmail, setEditFamilyEmail] = useState('');
  const [editFamilyPhone, setEditFamilyPhone] = useState('');

  // Delete Resident State & Modal
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null);
  const [isDeletingResident, setIsDeletingResident] = useState(false);
  const [deleteToast, setDeleteToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Directory Search & Bed Filtering State
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryBedFilter, setDirectoryBedFilter] = useState('All');

  const [supabaseDetails, setSupabaseDetails] = useState<{
    configured: boolean;
    url: string;
    keyConfigured: boolean;
    tableStatus: string;
    rowCount: number;
    latencyMs?: number;
  }>({
    configured: false,
    url: '',
    keyConfigured: false,
    tableStatus: 'idle',
    rowCount: 0,
  });

  const [inputSupabaseUrl, setInputSupabaseUrl] = useState('');
  const [inputSupabaseKey, setInputSupabaseKey] = useState('');
  const [isConfiguringSupabase, setIsConfiguringSupabase] = useState(false);
  const [configureSupabaseMsg, setConfigureSupabaseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTestSupabase = async () => {
    try {
      setSupabaseTestStatus('testing');
      setSupabaseTestMsg('Verifying backend API & Supabase database connection...');

      const res = await fetch('/api/supabase-status');
      const data = await res.json();

      setSupabaseDetails({
        configured: data.configured,
        url: data.url,
        keyConfigured: data.keyConfigured,
        tableStatus: data.tableStatus,
        rowCount: data.rowCount || 0,
        latencyMs: data.latencyMs,
      });

      if (data.configured && data.tableStatus === 'ready') {
        setSupabaseTestStatus('success');
        setSupabaseTestMsg(data.message || `Live Supabase connection verified! Found ${data.rowCount} resident records in public.residents.`);
      } else if (data.configured && data.tableStatus === 'table_missing') {
        setSupabaseTestStatus('error');
        setSupabaseTestMsg('Connected to Supabase endpoint, but the "residents" table does not exist yet. Please run the SQL schema below in your Supabase SQL Editor.');
      } else if (!data.configured) {
        setSupabaseTestStatus('error');
        setSupabaseTestMsg('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured. Add them to your environment settings.');
      } else {
        setSupabaseTestStatus('error');
        setSupabaseTestMsg(data.message || data.error || 'Failed to verify Supabase connection.');
      }
    } catch (err: any) {
      setSupabaseTestStatus('error');
      setSupabaseTestMsg(`Connection notice: ${err?.message || 'Network error connecting to API.'}`);
    }
  };

  const handleConfigureSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSupabaseUrl.trim() || !inputSupabaseKey.trim()) {
      setConfigureSupabaseMsg({ type: 'error', text: 'Both Supabase URL and Anon/Service Key are required.' });
      return;
    }
    setIsConfiguringSupabase(true);
    setConfigureSupabaseMsg(null);
    try {
      const res = await fetch('/api/admin/configure-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputSupabaseUrl, key: inputSupabaseKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigureSupabaseMsg({
          type: 'success',
          text: `✓ Live Supabase successfully connected! Loaded ${data.count ?? 0} resident records.`,
        });
        await handleTestSupabase();
        if (onRefreshResidents) {
          await onRefreshResidents();
        }
      } else {
        setConfigureSupabaseMsg({
          type: 'error',
          text: data.error || 'Failed to connect with provided Supabase parameters.',
        });
      }
    } catch (err: any) {
      setConfigureSupabaseMsg({
        type: 'error',
        text: `Network error: ${err?.message || 'Failed to reach backend'}`,
      });
    } finally {
      setIsConfiguringSupabase(false);
    }
  };

  // New Resident Form Modal
  const [isAddResidentModalOpen, setIsAddResidentModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPreferredName, setNewPreferredName] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newBedNumber, setNewBedNumber] = useState('Bed 01');
  const [newAge, setNewAge] = useState(80);
  const [newDiet, setNewDiet] = useState('Standard balanced, soft texture');
  const [newMedicalNotes, setNewMedicalNotes] = useState('');
  const [newCaregiverName, setNewCaregiverName] = useState('Caregiver Staff');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyRelation, setNewFamilyRelation] = useState('Family Member');
  const [newFamilyEmail, setNewFamilyEmail] = useState('');
  const [newFamilyPhone, setNewFamilyPhone] = useState('');

  // When a message is selected, initialize response draft with AI suggested response if available
  const handleSelectMessage = (msg: FamilyMessage) => {
    setSelectedMessage(msg);
    setResponseDraft(msg.adminResponse || msg.aiSuggestedResponse || '');
    setIsEditingInterceptionTarget(false);
  };

  const handleStartInterceptionEdit = () => {
    if (!selectedMessage) return;
    setEditInterceptionResidentName(selectedMessage.residentFullName);
    setEditInterceptionRoom(selectedMessage.roomNumber);
    setEditInterceptionBed(selectedMessage.bedNumber || 'Bed 01');
    setIsEditingInterceptionTarget(true);
  };

  const handleSaveInterceptionResidentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !editInterceptionResidentName.trim()) return;
    setIsSavingInterceptionEdit(true);

    try {
      if (onUpdateResident && selectedMessage.residentId) {
        await onUpdateResident(selectedMessage.residentId, {
          fullName: editInterceptionResidentName.trim(),
          roomNumber: editInterceptionRoom.trim() || selectedMessage.roomNumber,
          bedNumber: editInterceptionBed.trim() || selectedMessage.bedNumber,
        });
      }

      // Also update local selectedMessage in place
      setSelectedMessage((prev) =>
        prev
          ? {
              ...prev,
              residentFullName: editInterceptionResidentName.trim(),
              roomNumber: editInterceptionRoom.trim() || prev.roomNumber,
              bedNumber: editInterceptionBed.trim() || prev.bedNumber,
            }
          : prev
      );
      setIsEditingInterceptionTarget(false);
    } catch (err) {
      console.error('Failed to update resident in interception:', err);
    } finally {
      setIsSavingInterceptionEdit(false);
    }
  };

  const handleOpenEditResidentModal = (r: Resident) => {
    setEditingResident(r);
    setEditFullName(r.fullName);
    setEditPreferredName(r.preferredName || '');
    setEditRoomNumber(r.roomNumber);
    setEditBedNumber(r.bedNumber || 'Bed 01');
    setEditAge(r.age || 80);
    setEditDiet(r.dietaryRestrictions || '');
    setEditCaregiverName(r.assignedCaregiverName || '');
    setEditFamilyName(r.familyContactName || '');
    setEditFamilyRelation(r.familyContactRelation || 'Family Member');
    setEditFamilyEmail(r.familyContactEmail || '');
    setEditFamilyPhone(r.familyContactPhone || '');
  };

  const handleSaveResidentModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResident || !editFullName.trim() || !editRoomNumber.trim()) return;

    if (onUpdateResident) {
      await onUpdateResident(editingResident.id, {
        fullName: editFullName.trim(),
        preferredName: editPreferredName.trim() || editFullName.trim().split(' ')[0],
        roomNumber: editRoomNumber.trim(),
        bedNumber: editBedNumber.trim(),
        age: editAge,
        dietaryRestrictions: editDiet.trim(),
        assignedCaregiverName: editCaregiverName.trim() || 'Caregiver Staff',
        familyContactName: editFamilyName.trim() || 'Family Member',
        familyContactRelation: editFamilyRelation.trim() || 'Family Member',
        familyContactEmail: editFamilyEmail.trim(),
        familyContactPhone: editFamilyPhone.trim(),
      });
    }
    setEditingResident(null);
  };

  const handleRequestDeleteResident = (r: Resident) => {
    setResidentToDelete(r);
  };

  const handleConfirmDeleteResident = async () => {
    if (!residentToDelete) return;
    setIsDeletingResident(true);
    try {
      if (onDeleteResident) {
        await onDeleteResident(residentToDelete.id);
      }
      setDeleteToast({
        type: 'success',
        message: `Resident "${residentToDelete.fullName}" successfully removed and Bed (${residentToDelete.roomNumber} - ${residentToDelete.bedNumber}) freed.`,
      });
      if (editingResident?.id === residentToDelete.id) {
        setEditingResident(null);
      }
      setResidentToDelete(null);
    } catch (err: any) {
      setDeleteToast({
        type: 'error',
        message: `Failed to delete resident: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setIsDeletingResident(false);
      setTimeout(() => setDeleteToast(null), 5000);
    }
  };

  const handleSendAdminResponse = async () => {
    if (!selectedMessage || !responseDraft.trim()) return;
    setIsSendingResponse(true);

    await onRespondMessage(selectedMessage.id, responseDraft);
    setIsSendingResponse(false);
  };

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newRoomNumber.trim()) return;

    await onAddResident({
      fullName: newFullName.trim(),
      preferredName: newPreferredName.trim() || newFullName.trim().split(' ')[0],
      roomNumber: newRoomNumber.trim(),
      bedNumber: newBedNumber.trim(),
      age: newAge,
      dietaryRestrictions: newDiet.trim() || 'Standard balanced, soft texture',
      medicalNotes: newMedicalNotes.trim() || 'Assisted living general care plan.',
      carePlan: ['Routine vitals check', 'Nutritional monitoring', 'Hydration schedule'],
      assignedCaregiverId: 'user_care_1',
      assignedCaregiverName: newCaregiverName.trim() || 'Caregiver Staff',
      familyContactName: newFamilyName.trim() || 'Primary Family Contact',
      familyContactRelation: newFamilyRelation.trim() || 'Family Member',
      familyContactEmail: newFamilyEmail.trim(),
      familyContactPhone: newFamilyPhone.trim(),
      photoUrl: '',
      admissionDate: new Date().toISOString().split('T')[0],
    });

    setIsAddResidentModalOpen(false);
    setNewFullName('');
    setNewPreferredName('');
    setNewRoomNumber('');
    setNewBedNumber('Bed 01');
    setNewAge(80);
    setNewDiet('Standard balanced, soft texture');
    setNewMedicalNotes('');
    setNewCaregiverName('Caregiver Staff');
    setNewFamilyName('');
    setNewFamilyRelation('Family Member');
    setNewFamilyEmail('');
    setNewFamilyPhone('');
  };

  const pendingMessages = familyMessages.filter(
    (m) => m.status === 'intercepted_pending_admin'
  );
  const resolvedMessages = familyMessages.filter(
    (m) => m.status === 'responded' || m.status === 'resolved'
  );

  const SUPABASE_MIGRATION_SQL = `-- Quick Schema Fix / Migration & Full Delete Alignment
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS admission_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS care_plan JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT DEFAULT 'Standard balanced diet';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS assigned_caregiver_name TEXT DEFAULT 'Caregiver Staff';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS family_contact_name TEXT DEFAULT 'Primary Contact';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS family_contact_relation TEXT DEFAULT 'Family Member';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS family_contact_email TEXT;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS family_contact_phone TEXT;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 1. Grant Full Delete & Write Permissions across RLS
GRANT ALL ON public.residents TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Allow public delete on residents" ON public.residents;
CREATE POLICY "Allow public delete on residents" ON public.residents FOR DELETE USING (true);
DROP POLICY IF EXISTS "Allow public update on residents" ON public.residents;
CREATE POLICY "Allow public update on residents" ON public.residents FOR UPDATE USING (true);

-- 2. Immediately purge any deactivated / deleted residents (e.g. Jack Ong) from the table
DELETE FROM public.residents WHERE is_active = false;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';`;

  const [copiedMigrationSql, setCopiedMigrationSql] = useState(false);
  const [copiedDeleteSql, setCopiedDeleteSql] = useState(false);

  const SUPABASE_DELETE_POLICY_SQL = `-- Run this in Supabase SQL Editor to allow physical deletions from the portal:
GRANT ALL ON public.residents TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Allow public delete on residents" ON public.residents;
CREATE POLICY "Allow public delete on residents" ON public.residents FOR DELETE USING (true);

-- Instantly delete any removed residents (such as Jack Ong)
DELETE FROM public.residents WHERE is_active = false;`;

  const SUPABASE_SQL_SCHEMA = `-- PostgreSQL & Supabase DDL for Care Connect Family Transparency SaaS

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Residents Table (Linked to Admin Interception & Directory)
CREATE TABLE public.residents (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    preferred_name TEXT,
    room_number TEXT NOT NULL,
    bed_number TEXT NOT NULL DEFAULT 'Bed 01', -- e.g., 'Bed 01', 'Bed 02', 'Bed 03', 'Bed 04', 'Bed 05', 'Single Room'
    age INT DEFAULT 80,
    photo_url TEXT,
    medical_notes TEXT,
    care_plan JSONB DEFAULT '[]'::jsonb,
    dietary_restrictions TEXT DEFAULT 'Standard balanced diet',
    assigned_caregiver_name TEXT DEFAULT 'Caregiver Staff',
    assigned_caregiver_id TEXT,
    family_contact_name TEXT DEFAULT 'Primary Contact',
    family_contact_relation TEXT DEFAULT 'Family Member',
    family_contact_email TEXT,
    family_contact_phone TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Care Logs Table (One-click media + Multimodal AI output)
CREATE TABLE public.care_logs (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_full_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    bed_number TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    caregiver_id TEXT,
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
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    family_user_id TEXT,
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

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

-- 6. Grant table permissions to anon & authenticated roles
GRANT ALL ON public.residents TO anon, authenticated, service_role;
GRANT ALL ON public.care_logs TO anon, authenticated, service_role;
GRANT ALL ON public.family_messages TO anon, authenticated, service_role;

-- 7. Grant read/write/delete policies for anon key / authenticated clients
DROP POLICY IF EXISTS "Allow public read on residents" ON public.residents;
CREATE POLICY "Allow public read on residents" ON public.residents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on residents" ON public.residents;
CREATE POLICY "Allow public insert on residents" ON public.residents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on residents" ON public.residents;
CREATE POLICY "Allow public update on residents" ON public.residents FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on residents" ON public.residents;
CREATE POLICY "Allow public delete on residents" ON public.residents FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read on care_logs" ON public.care_logs;
CREATE POLICY "Allow public read on care_logs" ON public.care_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on care_logs" ON public.care_logs;
CREATE POLICY "Allow public insert on care_logs" ON public.care_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on family_messages" ON public.family_messages;
CREATE POLICY "Allow public read on family_messages" ON public.family_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on family_messages" ON public.family_messages;
CREATE POLICY "Allow public insert on family_messages" ON public.family_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on family_messages" ON public.family_messages;
CREATE POLICY "Allow public update on family_messages" ON public.family_messages FOR UPDATE USING (true);
`;

  const pendingCareLogs = careLogs.filter(
    (l) => l.approvalStatus === 'pending_approval' || !l.approvalStatus
  );
  const approvedCareLogs = careLogs.filter((l) => l.approvalStatus === 'approved');
  const rejectedCareLogs = careLogs.filter((l) => l.approvalStatus === 'rejected');

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {approvalToast && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all animate-in fade-in ${
            approvalToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-[#F0ECE2] border-[#E6E2D3] text-[#5A5A40]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {approvalToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#889E81] shrink-0" />
            )}
            <span className="text-xs font-bold">{approvalToast.message}</span>
          </div>
          <button
            onClick={() => setApprovalToast(null)}
            className="text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className={`bg-white p-4 rounded-[24px] border shadow-xs flex items-center space-x-3 transition-all ${
          pendingCareLogs.length > 0 ? 'border-amber-400/80 bg-amber-50/20' : 'border-[#E6E2D3]'
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 border ${
            pendingCareLogs.length > 0
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-[#EBF1EA] text-[#5A5A40] border-[#889E81]/30'
          }`}>
            <Clock className={`w-5 h-5 ${pendingCareLogs.length > 0 ? 'text-amber-700 animate-pulse' : 'text-[#889E81]'}`} />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40] flex items-center space-x-2">
              <span>{pendingCareLogs.length}</span>
              {pendingCareLogs.length > 0 && (
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  Action Req.
                </span>
              )}
            </div>
            <div className="text-xs text-[#7C7C6D] font-medium">Caregiver Updates Awaiting Approval</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[24px] border border-[#E6E2D3] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40]">{approvedCareLogs.length}</div>
            <div className="text-xs text-[#7C7C6D] font-medium">Approved &amp; Live for Family</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[24px] border border-[#E6E2D3] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF9F6] text-[#5A5A40] flex items-center justify-center font-bold shrink-0 border border-[#E6E2D3]">
            <Bed className="w-5 h-5 text-[#889E81]" />
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-[#5A5A40]">{residents.length}</div>
            <div className="text-xs text-[#7C7C6D] font-medium">Active Residents Registered</div>
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
          id="admin-tab-care-logs"
          onClick={() => setActiveTab('care_logs')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'care_logs'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#889E81]" />
          <span>Caregiver Approvals &amp; Media Feed ({careLogs.length})</span>
          {pendingCareLogs.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
              {pendingCareLogs.length} Pending
            </span>
          )}
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
          <span>Daily Vitals Audit &amp; Watermarks</span>
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

        <button
          id="admin-tab-security"
          onClick={() => setActiveTab('admin_security')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'admin_security'
              ? 'border-[#889E81] text-[#5A5A40]'
              : 'border-transparent text-[#7C7C6D] hover:text-[#4A4A40]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#889E81]" />
          <span>Admin Security &amp; Registry ({registeredAdmins.length})</span>
        </button>
      </div>

      {/* TAB: CAREGIVER UPDATES & APPROVALS FEED */}
      {activeTab === 'care_logs' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-[24px] p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="w-5 h-5 text-[#889E81]" />
                <h3 className="text-base font-serif font-bold text-[#5A5A40]">
                  Caregiver Shift Updates &amp; Admin Approval Desk
                </h3>
              </div>
              <p className="text-xs text-[#7C7C6D] max-w-2xl leading-relaxed">
                <strong>Mandatory Approval Policy:</strong> Every caregiver shift update must be verified and approved by the administrator before it is published to the Family Portal. Audit attached media, dual vitals watermarks, meal telemetry, and narratives below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {pendingCareLogs.length > 0 && (
                <button
                  id="admin-bulk-approve-care-logs-btn"
                  type="button"
                  onClick={handleBulkApprove}
                  disabled={isBulkApproving}
                  className="px-4 py-2 bg-[#889E81] hover:bg-[#788E71] text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isBulkApproving ? 'Approving All...' : `Approve All (${pendingCareLogs.length}) Pending`}</span>
                </button>
              )}

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-[#8C8C7E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search resident, room, staff..."
                  value={careLogSearch}
                  onChange={(e) => setCareLogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#E6E2D3] rounded-xl text-xs text-[#5A5A40] placeholder-[#8C8C7E] focus:outline-hidden focus:border-[#889E81]"
                />
              </div>
            </div>
          </div>

          {/* Sub-Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCareLogStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                careLogStatusFilter === 'all'
                  ? 'bg-[#5A5A40] text-white'
                  : 'bg-white border border-[#E6E2D3] text-[#7C7C6D] hover:text-[#5A5A40]'
              }`}
            >
              All Updates ({careLogs.length})
            </button>

            <button
              onClick={() => setCareLogStatusFilter('pending')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                careLogStatusFilter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Admin Approval ({pendingCareLogs.length})</span>
            </button>

            <button
              onClick={() => setCareLogStatusFilter('approved')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                careLogStatusFilter === 'approved'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approved &amp; Live for Family ({approvedCareLogs.length})</span>
            </button>

            <button
              onClick={() => setCareLogStatusFilter('rejected')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                careLogStatusFilter === 'rejected'
                  ? 'bg-rose-700 text-white'
                  : 'bg-white border border-rose-300 text-rose-800 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Revision Requested ({rejectedCareLogs.length})</span>
            </button>
          </div>

          {careLogs.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-12 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-[#8C8C7E] mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-[#5A5A40]">No Caregiver Updates Logged Yet</h4>
              <p className="text-xs text-[#7C7C6D] max-w-md mx-auto">
                When care staff record shift updates in the Caregiver module, all media photos, meal logs, and vitals will appear here for admin review and approval.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {careLogs
                .filter((log) => {
                  // Filter by status
                  const isPending = log.approvalStatus === 'pending_approval' || !log.approvalStatus;
                  const isApproved = log.approvalStatus === 'approved';
                  const isRejected = log.approvalStatus === 'rejected';

                  if (careLogStatusFilter === 'pending' && !isPending) return false;
                  if (careLogStatusFilter === 'approved' && !isApproved) return false;
                  if (careLogStatusFilter === 'rejected' && !isRejected) return false;

                  // Search query
                  if (!careLogSearch) return true;
                  const q = careLogSearch.toLowerCase();
                  return (
                    (log.residentFullName && log.residentFullName.toLowerCase().includes(q)) ||
                    (log.roomNumber && log.roomNumber.toLowerCase().includes(q)) ||
                    (log.bedNumber && log.bedNumber.toLowerCase().includes(q)) ||
                    (log.caregiverName && log.caregiverName.toLowerCase().includes(q))
                  );
                })
                .map((log) => {
                  const hasActivityPhoto = !!log.mediaUrl;
                  const hasVitalsPhoto1 = !!log.vitals?.vitalsPhotoUrl;
                  const hasVitalsPhoto2 = !!log.vitals?.secondaryVitalsPhotoUrl;
                  const totalPhotos = [hasActivityPhoto, hasVitalsPhoto1, hasVitalsPhoto2].filter(Boolean).length;
                  const isPending = log.approvalStatus === 'pending_approval' || !log.approvalStatus;
                  const isApproved = log.approvalStatus === 'approved';
                  const isRejected = log.approvalStatus === 'rejected';

                  return (
                    <div
                      key={log.id}
                      className={`bg-white rounded-[24px] border p-5 shadow-xs space-y-4 transition-all ${
                        isPending
                          ? 'border-amber-300 ring-1 ring-amber-200'
                          : isApproved
                          ? 'border-[#E6E2D3] hover:border-[#889E81]/60'
                          : 'border-rose-300 bg-rose-50/10'
                      }`}
                    >
                      {/* Approval Status Alert Banner */}
                      <div
                        className={`p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          isPending
                            ? 'bg-amber-50 border border-amber-200 text-amber-900'
                            : isApproved
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isPending ? (
                            <Clock className="w-4 h-4 text-amber-700 animate-pulse shrink-0" />
                          ) : isApproved ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                          )}
                          <span className="font-bold">
                            {isPending
                              ? 'Awaiting Admin Verification & Approval (Hidden from Family Portal)'
                              : isApproved
                              ? `Approved & Live on Family Portal (Approved by ${log.approvedByAdminName || 'Admin'}${
                                  log.approvedAt
                                    ? ` at ${new Date(log.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : ''
                                })`
                              : `Revision Requested by ${log.approvedByAdminName || 'Admin'} (Hidden from Family Feed)`}
                          </span>
                        </div>

                        {/* Direct Header Actions */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(log)}
                                disabled={isApprovingLogId === log.id}
                                className="px-3.5 py-1.5 bg-[#889E81] hover:bg-[#788E71] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isApprovingLogId === log.id ? 'Approving...' : 'Approve & Publish'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(log)}
                                disabled={isApprovingLogId === log.id}
                                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                              >
                                <span>Reject / Revise</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleRevokeApproval(log)}
                              disabled={isApprovingLogId === log.id}
                              className="px-3 py-1 bg-white border border-[#E6E2D3] text-[#7C7C6D] hover:text-[#5A5A40] text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            >
                              Revoke Approval
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleApprove(log)}
                              disabled={isApprovingLogId === log.id}
                              className="px-3.5 py-1.5 bg-[#889E81] hover:bg-[#788E71] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Re-Approve &amp; Publish</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Header: Resident & Caregiver Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E2D3] pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#EBF1EA] text-[#5A5A40] font-bold text-xs flex items-center justify-center ring-1 ring-[#889E81]/30">
                            {log.roomNumber || 'RM'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-[#5A5A40]">{log.residentFullName}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0ECE2] text-[#5A5A40] border border-[#E6E2D3]">
                                Bed {log.bedNumber}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#7C7C6D]">
                              Submitted by Caregiver <strong className="text-[#5A5A40]">{log.caregiverName}</strong> &bull;{' '}
                              {new Date(log.timestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-[#8C8C7E]">
                            ID: <span className="font-mono">{log.id.slice(-6)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Photo Updates Gallery */}
                      <div>
                        <div className="text-[10px] font-bold text-[#8C8C7E] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                          <span>Attached Photos &amp; Watermarks</span>
                          <span className="text-[#889E81] font-semibold">
                            ({totalPhotos} photo{totalPhotos !== 1 ? 's' : ''})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Activity / Care Photo */}
                          {hasActivityPhoto ? (
                            <div
                              onClick={() => setSelectedPreviewImage(log.mediaUrl!)}
                              className="relative group rounded-2xl overflow-hidden border border-[#E6E2D3] bg-[#2C332A] cursor-pointer shadow-xs aspect-video sm:aspect-4/3"
                            >
                              <img
                                src={log.mediaUrl}
                                alt="Activity Media"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="w-5 h-5 text-white" />
                              </div>
                              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                Activity / Care Photo
                              </div>
                            </div>
                          ) : null}

                          {/* Monitor 1 Vitals Photo */}
                          {hasVitalsPhoto1 ? (
                            <div
                              onClick={() => setSelectedPreviewImage(log.vitals!.vitalsPhotoUrl!)}
                              className="relative group rounded-2xl overflow-hidden border border-[#E6E2D3] bg-[#2C332A] cursor-pointer shadow-xs aspect-video sm:aspect-4/3"
                            >
                              <img
                                src={log.vitals!.vitalsPhotoUrl}
                                alt="Monitor 1 Vitals Watermark"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="w-5 h-5 text-white" />
                              </div>
                              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                Monitor 1 Watermark
                              </div>
                            </div>
                          ) : null}

                          {/* Monitor 2 Vitals Photo */}
                          {hasVitalsPhoto2 ? (
                            <div
                              onClick={() => setSelectedPreviewImage(log.vitals!.secondaryVitalsPhotoUrl!)}
                              className="relative group rounded-2xl overflow-hidden border border-[#889E81]/50 bg-[#2C332A] cursor-pointer shadow-xs aspect-video sm:aspect-4/3"
                            >
                              <img
                                src={log.vitals!.secondaryVitalsPhotoUrl}
                                alt="Monitor 2 Vitals Watermark"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="w-5 h-5 text-white" />
                              </div>
                              <div className="absolute top-2 left-2 bg-emerald-950/85 backdrop-blur-xs text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                                Monitor 2 Watermark
                              </div>
                            </div>
                          ) : null}

                          {!hasActivityPhoto && !hasVitalsPhoto1 && !hasVitalsPhoto2 && (
                            <div className="col-span-full py-4 text-center text-xs text-[#8C8C7E] bg-[#FAF9F6] rounded-xl border border-[#E6E2D3] italic">
                              No photos attached to this update
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Telemetry Grid: Meals & Vitals */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] text-xs">
                          <span className="text-[9px] uppercase font-bold text-[#8C8C7E] block mb-1">Meals &amp; Nutrition</span>
                          <div className="space-y-0.5 font-medium text-[#5A5A40]">
                            <div>Breakfast: <strong>{log.meals?.breakfast || 'N/A'}</strong></div>
                            <div>Lunch: <strong>{log.meals?.lunch || 'N/A'}</strong></div>
                            <div>Dinner: <strong>{log.meals?.dinner || 'N/A'}</strong></div>
                          </div>
                        </div>

                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] text-xs">
                          <span className="text-[9px] uppercase font-bold text-[#8C8C7E] block mb-1">Hydration Level</span>
                          <div className="text-sm font-bold text-[#5A5A40]">
                            {log.meals?.hydrationMl || 800} ml
                          </div>
                          <span className="text-[10px] text-[#7C7C6D]">Daily target intake tracked</span>
                        </div>

                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] text-xs">
                          <span className="text-[9px] uppercase font-bold text-[#8C8C7E] block mb-1">Vitals Reading</span>
                          <div className="grid grid-cols-2 gap-1 font-bold text-[#5A5A40] text-[11px]">
                            <div>BP: {log.vitals?.bloodPressure || 'N/A'}</div>
                            <div>Pulse: {log.vitals?.pulseRate ? `${log.vitals.pulseRate} bpm` : 'N/A'}</div>
                            <div>SpO2: {log.vitals?.spo2 ? `${log.vitals.spo2}%` : 'N/A'}</div>
                            <div>Temp: {log.vitals?.temperature ? `${log.vitals.temperature}°C` : 'N/A'}</div>
                          </div>
                        </div>

                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] text-xs">
                          <span className="text-[9px] uppercase font-bold text-[#8C8C7E] block mb-1">Mood &amp; Activities</span>
                          <div className="font-bold text-[#5A5A40] capitalize mb-1">{log.mood || 'Content'}</div>
                          <div className="flex flex-wrap gap-1">
                            {log.activities && log.activities.length > 0 ? (
                              log.activities.map((act, idx) => (
                                <span key={idx} className="text-[9px] bg-white border border-[#E6E2D3] px-1.5 py-0.5 rounded-md text-[#5A5A40]">
                                  {act}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[#8C8C7E]">Routine resting</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Reports: Family Narrative & Clinical EHR Note */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#E6E2D3]">
                        <div className="bg-[#F7F5F0] p-3.5 rounded-2xl border border-[#E6E2D3] space-y-1">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-[#5A5A40]">
                            <Sparkles className="w-3.5 h-3.5 text-[#889E81]" />
                            <span>Family Warm Narrative (AI Generated)</span>
                          </div>
                          <p className="text-xs text-[#5A5A40] leading-relaxed">
                            {log.familyWarmUpdate || 'Routine care provided with positive mood and comfort.'}
                          </p>
                        </div>

                        <div className="bg-[#F0ECE2]/60 p-3.5 rounded-2xl border border-[#E6E2D3] space-y-1">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-[#5A5A40]">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#889E81]" />
                            <span>Internal Clinical Staff EHR Log</span>
                          </div>
                          <p className="text-xs font-mono text-[#5A5A40] leading-relaxed">
                            {log.clinicalStaffLog || 'Shift vitals recorded and verified.'}
                          </p>
                        </div>
                      </div>

                      {/* Revision Notes if present */}
                      {log.adminReviewNotes && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                          <div className="font-bold flex items-center space-x-1.5 mb-0.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>Supervisor Feedback / Revision Note:</span>
                          </div>
                          <p className="italic pl-5">{log.adminReviewNotes}</p>
                        </div>
                      )}

                      {/* Bottom Large Action Bar for Pending updates */}
                      {isPending && (
                        <div className="pt-2 border-t border-[#E6E2D3] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF9F6] -mx-5 -mb-5 p-4 rounded-b-[24px]">
                          <div className="text-xs text-[#7C7C6D]">
                            Ready for family viewing? Click approve to instantly push to the Family Portal feed.
                          </div>
                          <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(log)}
                              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                              Request Revision
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(log)}
                              disabled={isApprovingLogId === log.id}
                              className="w-full sm:w-auto px-5 py-2.5 bg-[#889E81] hover:bg-[#788E71] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              <span>{isApprovingLogId === log.id ? 'Approving...' : 'Approve & Publish to Family Portal'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB: DAILY VITALS AUDIT & WATERMARKS */}
      {activeTab === 'vitals_audit' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-[24px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-[#889E81]" />
                <h3 className="text-base font-serif font-bold text-[#5A5A40]">
                  Daily Clinical Vital Signs Protocol Compliance
                </h3>
              </div>
              <p className="text-xs text-[#7C7C6D]">
                During daily rounds, nursing staff captures equipment readings with an immutable Canvas-baked watermark showing date, time, resident bed tag, and staff signature.
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
                Daily Vitals &amp; Watermark Registry
              </span>
              <span className="text-xs text-[#7C7C6D]">
                Updated Today &bull; Real-time OCR &amp; Verification (Dual Photo Supported)
              </span>
            </div>

            <div className="divide-y divide-[#E6E2D3]">
              {residents.map((res) => {
                const morningRecord = morningVitals.find((v) => isResidentMatch(res, v));
                const latestVitals = getLatestVitalsForResident(res, morningVitals, careLogs);

                const bp = morningRecord?.readings.bloodPressure || latestVitals?.bloodPressure;
                const pulse = morningRecord?.readings.pulseRate || latestVitals?.pulseRate;
                const spo2 = morningRecord?.readings.spo2 || latestVitals?.spo2;
                const temp = morningRecord?.readings.temperature || latestVitals?.temperature;
                const hasVitals = !!(bp || pulse || spo2 || temp);

                const primaryPhoto = morningRecord?.vitalsPhotoUrl || latestVitals?.photoUrl;
                const secondaryPhoto = morningRecord?.secondaryVitalsPhotoUrl || latestVitals?.secondaryPhotoUrl;
                const formattedTime = morningRecord?.formattedTime || latestVitals?.formattedTime || 'Today';
                const caregiverName = morningRecord?.caregiverName || latestVitals?.caregiverName || 'Care Staff';

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
                    {hasVitals ? (
                      <div className="grid grid-cols-4 gap-3 text-xs bg-[#F7F5F0] p-2.5 rounded-2xl border border-[#E6E2D3] min-w-[320px]">
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">BP</span>
                          <span className="font-bold text-[#5A5A40]">{bp || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">Pulse</span>
                          <span className="font-bold text-[#5A5A40]">{pulse ? `${pulse} bpm` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">SpO2</span>
                          <span className="font-bold text-[#5A5A40]">{spo2 ? `${spo2}%` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8C8C7E] block uppercase font-bold">Temp</span>
                          <span className="font-bold text-[#5A5A40]">{temp ? `${temp}°C` : 'N/A'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#8C8C7E] italic py-2">
                        Pending daily vital sign capture...
                      </div>
                    )}

                    {/* Watermarked photos (Dual & Single Photo Support) & status */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="flex items-center space-x-2">
                        {primaryPhoto ? (
                          <div
                            onClick={() => setSelectedPreviewImage(primaryPhoto)}
                            className="relative group w-14 h-12 rounded-xl overflow-hidden border border-[#E6E2D3] bg-[#2C332A] cursor-pointer shadow-2xs hover:ring-2 hover:ring-[#889E81] transition-all"
                            title="Monitor 1 / Primary Vitals Reading"
                          >
                            <img
                              src={primaryPhoto}
                              alt="Monitor 1 Vitals Reading"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                            {secondaryPhoto ? (
                              <div className="absolute top-0.5 left-0.5 bg-black/80 backdrop-blur-xs text-white text-[8px] font-bold px-1 py-0.2 rounded-xs border border-white/20">
                                Mon 1
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {secondaryPhoto ? (
                          <div
                            onClick={() => setSelectedPreviewImage(secondaryPhoto)}
                            className="relative group w-14 h-12 rounded-xl overflow-hidden border border-[#889E81]/40 bg-[#2C332A] cursor-pointer shadow-2xs hover:ring-2 hover:ring-[#889E81] transition-all"
                            title="Monitor 2 / Secondary Vitals Reading"
                          >
                            <img
                              src={secondaryPhoto}
                              alt="Monitor 2 Vitals Reading"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                            <div className="absolute top-0.5 left-0.5 bg-emerald-950/85 backdrop-blur-xs text-emerald-300 text-[8px] font-bold px-1 py-0.2 rounded-xs border border-emerald-400/30">
                              Mon 2
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="text-right">
                        {hasVitals ? (
                          <>
                            <div className="flex items-center justify-end space-x-1 text-[11px] font-bold text-[#889E81]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{secondaryPhoto ? '✓ 2 Photos' : '✓ 1 Photo'}</span>
                            </div>
                            <span className="text-[10px] text-[#8C8C7E] block">{formattedTime} &bull; {caregiverName}</span>
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
                      Re: {msg.residentFullName} (R {msg.roomNumber}, {msg.bedNumber})
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
                {/* Header of message with Editable Resident & Bed Register in Interception */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#E6E2D3] pb-4 gap-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-serif font-bold text-[#5A5A40]">
                        {selectedMessage.subject}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0ECE2] text-[#5A5A40] uppercase border border-[#E6E2D3]">
                        {selectedMessage.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#7C7C6D] mt-1">
                      From: <strong className="text-[#5A5A40]">{selectedMessage.familyName}</strong> ({selectedMessage.familyRelation})
                    </p>

                    {/* Resident & Bed Register Tag - Editable */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {isEditingInterceptionTarget ? (
                        <form
                          onSubmit={handleSaveInterceptionResidentEdit}
                          className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#FAF9F6] rounded-xl border border-[#889E81] w-full"
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#7C7C6D]">Resident Name:</span>
                            <input
                              type="text"
                              value={editInterceptionResidentName}
                              onChange={(e) => setEditInterceptionResidentName(e.target.value)}
                              placeholder="Resident Name"
                              className="px-2 py-1 text-xs font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-lg outline-none w-36"
                              autoFocus
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#7C7C6D]">Room:</span>
                            <input
                              type="text"
                              value={editInterceptionRoom}
                              onChange={(e) => setEditInterceptionRoom(e.target.value)}
                              placeholder="Room #"
                              className="px-2 py-1 text-xs font-medium text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-lg outline-none w-16"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#7C7C6D]">Bed Register:</span>
                            <select
                              value={editInterceptionBed}
                              onChange={(e) => setEditInterceptionBed(e.target.value)}
                              className="px-2 py-1 text-xs font-medium text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-lg outline-none"
                            >
                              {BED_IDENTIFIER_OPTIONS.map((bedOpt) => (
                                <option key={bedOpt} value={bedOpt}>
                                  {bedOpt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end space-x-1 pt-3.5">
                            <button
                              type="submit"
                              disabled={isSavingInterceptionEdit}
                              title="Save Changes to App & Supabase"
                              className="px-2.5 py-1 bg-[#889E81] text-white rounded-lg text-xs font-bold hover:bg-[#788E71] flex items-center space-x-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isSavingInterceptionEdit ? 'Saving...' : 'Save & Sync'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingInterceptionTarget(false)}
                              title="Cancel"
                              className="p-1 bg-[#F0ECE2] text-[#7C7C6D] rounded-lg hover:bg-[#E6E2D3] cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 hidden" />
                              <span className="text-xs px-1">✕</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center space-x-2 bg-[#FAF9F6] border border-[#E6E2D3] px-3 py-1.5 rounded-xl">
                            <div className="flex items-center space-x-1.5 text-xs">
                              <span className="text-[#8C8C7E]">Resident:</span>
                              <strong className="text-[#5A5A40] font-bold">{selectedMessage.residentFullName}</strong>
                              <span className="text-[#8C8C7E]">&bull;</span>
                              <span className="text-[11px] font-bold text-[#5A5A40] bg-[#F0ECE2] px-2 py-0.5 rounded-md border border-[#E6E2D3]">
                                Room {selectedMessage.roomNumber} &bull; {selectedMessage.bedNumber || 'Bed 01'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleStartInterceptionEdit}
                              title="Edit Resident Name & Bed Register"
                              className="p-1 text-[#889E81] hover:text-[#5A5A40] hover:bg-[#E6E2D3]/60 rounded-md transition-colors cursor-pointer flex items-center space-x-1 text-[11px] font-bold"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Target</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-[#889E81] bg-[#889E81]/10 px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1">
                            <Database className="w-3 h-3" />
                            <span>Supabase Linked</span>
                          </span>
                        </div>
                      )}
                    </div>
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
                      Responded by {selectedMessage.respondedByAdminName || adminUser.name || 'Facility Administrator'} on{' '}
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
          {/* Supabase Realtime Sync Status Banner */}
          <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#889E81]/15 flex items-center justify-center text-[#889E81] shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-[#5A5A40]">Supabase Database Linked</h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#889E81]/20 text-[#5A5A40]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#889E81] mr-1.5 animate-pulse"></span>
                    Live Sync Ready
                  </span>
                </div>
                <p className="text-[11px] text-[#7C7C6D]">
                  Resident info &amp; bed register details keyed into this Admin Interception station automatically persist to your Supabase PostgreSQL tables.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                id="admin-sync-all-supabase-btn"
                onClick={handleSyncAllResidents}
                disabled={isSyncingAllSupabase}
                className="px-3.5 py-2 bg-white hover:bg-[#F0ECE2] border border-[#E6E2D3] text-[#5A5A40] rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#889E81] ${isSyncingAllSupabase ? 'animate-spin' : ''}`} />
                <span>{isSyncingAllSupabase ? 'Syncing...' : 'Sync All to Supabase'}</span>
              </button>
            </div>
          </div>

          {/* Sync Toast Feedback */}
          {syncToast && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
                syncToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {syncToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{syncToast.message}</span>
            </div>
          )}

          {/* Delete Feedback Toast */}
          {deleteToast && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                deleteToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {deleteToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{deleteToast.message}</span>
            </div>
          )}

          {/* Directory Toolbar: Search, Filter by Bed, and Add Resident */}
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#5A5A40] flex items-center space-x-2">
                  <span>Resident Directory &amp; Bed Registry</span>
                  <span className="text-[11px] font-sans font-bold bg-[#F0ECE2] text-[#5A5A40] px-2.5 py-0.5 rounded-full border border-[#E6E2D3]">
                    {residents.length} Allocated
                  </span>
                </h3>
                <p className="text-[11px] text-[#7C7C6D]">
                  Manage resident profiles, bed assignments, caregiver rosters, and directory records.
                </p>
              </div>

              <button
                id="admin-open-add-resident-btn"
                type="button"
                onClick={() => setIsAddResidentModalOpen(true)}
                className="px-4 py-2.5 bg-[#889E81] hover:bg-[#788E71] text-white rounded-full text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Admit New Resident</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-2 border-t border-[#E6E2D3]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8C8C7E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search resident name, room #, family contact, caregiver..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-xs text-[#4A4A40] placeholder-[#8C8C7E] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                />
                {directorySearch && (
                  <button
                    type="button"
                    onClick={() => setDirectorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8C7E] hover:text-[#5A5A40] text-xs p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-[11px] font-bold text-[#7C7C6D]">Filter Bed:</span>
                <select
                  value={directoryBedFilter}
                  onChange={(e) => setDirectoryBedFilter(e.target.value)}
                  className="px-3 py-2 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-xs font-semibold text-[#5A5A40] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                >
                  <option value="All">All Beds ({residents.length})</option>
                  {BED_IDENTIFIER_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {residents.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-dashed border-[#E6E2D3] p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-[#8C8C7E] mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-[#5A5A40]">No Residents Admitted Yet</h4>
              <p className="text-xs text-[#7C7C6D] max-w-md mx-auto">
                Admit a resident using the button above or connect your Supabase database to synchronize live resident profiles.
              </p>
              <button
                type="button"
                onClick={() => setIsAddResidentModalOpen(true)}
                className="mt-2 px-4 py-2 bg-[#889E81] hover:bg-[#788E71] text-white rounded-full text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Admit First Resident</span>
              </button>
            </div>
          ) : (
            <>
              {(() => {
                const filteredResidents = residents.filter((r) => {
                  const query = directorySearch.trim().toLowerCase();
                  const matchesQuery =
                    !query ||
                    r.fullName?.toLowerCase().includes(query) ||
                    r.preferredName?.toLowerCase().includes(query) ||
                    r.roomNumber?.toLowerCase().includes(query) ||
                    r.bedNumber?.toLowerCase().includes(query) ||
                    r.familyContactName?.toLowerCase().includes(query) ||
                    r.assignedCaregiverName?.toLowerCase().includes(query);

                  const matchesBed =
                    directoryBedFilter === 'All' || r.bedNumber === directoryBedFilter;

                  return matchesQuery && matchesBed;
                });

                if (filteredResidents.length === 0) {
                  return (
                    <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-8 text-center space-y-2">
                      <Search className="w-8 h-8 text-[#8C8C7E] mx-auto opacity-60" />
                      <p className="text-xs font-bold text-[#5A5A40]">
                        No residents match your search filters
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDirectorySearch('');
                          setDirectoryBedFilter('All');
                        }}
                        className="text-xs text-[#889E81] font-semibold hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResidents.map((r) => (
                      <div
                        key={r.id}
                        id={`resident-card-${r.id}`}
                        className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-3 relative group hover:border-[#889E81]/60 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-full bg-[#EBF1EA] text-[#5A5A40] font-bold text-xs flex items-center justify-center ring-2 ring-[#E6E2D3] shrink-0">
                              {r.fullName
                                ? r.fullName
                                    .split(' ')
                                    .filter(Boolean)
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()
                                : 'R'}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[#5A5A40] leading-tight">
                                {r.fullName}
                              </h4>
                              <div className="mt-1 flex items-center space-x-1.5">
                                <span className="text-[10px] font-bold text-[#5A5A40] bg-[#F0ECE2] border border-[#E6E2D3] px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1">
                                  <Bed className="w-3 h-3 text-[#889E81]" />
                                  <span>Room {r.roomNumber} &bull; {r.bedNumber}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Action Controls: Edit & Delete */}
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              id={`admin-edit-resident-btn-${r.id}`}
                              onClick={() => handleOpenEditResidentModal(r)}
                              title="Edit Resident Profile & Bed Registry"
                              className="p-1.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] text-[#889E81] hover:bg-[#889E81] hover:text-white transition-all cursor-pointer shadow-2xs"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              id={`admin-delete-resident-btn-${r.id}`}
                              onClick={() => handleRequestDeleteResident(r)}
                              title="Delete Resident & Free Bed Allocation"
                              className="p-1.5 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] text-[#8C8C7E] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-[#7C7C6D] space-y-1.5 pt-2 border-t border-[#E6E2D3]">
                          <p>
                            <span className="text-[#8C8C7E]">Age:</span> {r.age} yrs &bull; Admitted: {r.admissionDate}
                          </p>
                          <p>
                            <span className="text-[#8C8C7E]">Caregiver:</span>{' '}
                            <strong className="text-[#5A5A40]">{r.assignedCaregiverName}</strong>
                          </p>
                          <p>
                            <span className="text-[#8C8C7E]">Diet:</span> {r.dietaryRestrictions}
                          </p>
                          <p>
                            <span className="text-[#8C8C7E]">Family Contact:</span>{' '}
                            <strong className="text-[#5A5A40]">{r.familyContactName || 'Primary Contact'}</strong>{' '}
                            {r.familyContactRelation && (
                              <span className="text-[#8C8C7E]">({r.familyContactRelation})</span>
                            )}
                          </p>
                          {r.familyContactEmail ? (
                            <div className="flex items-center space-x-1.5 text-[11px] text-[#5A5A40] bg-[#FAF9F6] p-1.5 rounded-lg border border-[#E6E2D3]">
                              <Mail className="w-3.5 h-3.5 text-[#889E81] shrink-0" />
                              <span className="font-medium truncate">{r.familyContactEmail}</span>
                            </div>
                          ) : null}
                          {r.familyContactPhone ? (
                            <div className="flex items-center space-x-1.5 text-[11px] text-[#7C7C6D]">
                              <Phone className="w-3 h-3 text-[#8C8C7E] shrink-0" />
                              <span>{r.familyContactPhone}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* TAB 3: SUPABASE / POSTGRESQL SCHEMA */}
      {activeTab === 'supabase_schema' && (
        <div className="space-y-4">
          {/* Active Supabase Connection Card */}
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE2] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-serif font-bold text-[#5A5A40] flex items-center space-x-2">
                    <Database className="w-4 h-4 text-[#889E81]" />
                    <span>Supabase Backend Integration</span>
                  </h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#EBF1EA] text-[#5A5A40] border border-[#889E81]/30">
                    Live REST Client Configured
                  </span>
                </div>
                <p className="text-xs text-[#7C7C6D] mt-0.5">
                  Connected to your Supabase PostgreSQL project with auto-normalized REST endpoint.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={supabaseTestStatus === 'testing'}
                className="px-4 py-2 bg-[#889E81] hover:bg-[#778E70] text-white rounded-full text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${supabaseTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>{supabaseTestStatus === 'testing' ? 'Testing Ping...' : 'Test Supabase Connection'}</span>
              </button>
            </div>

            {/* Configured Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center space-x-1.5 text-[#7C7C6D] font-bold">
                  <Globe className="w-3.5 h-3.5 text-[#889E81]" />
                  <span>PROJECT URL</span>
                </div>
                <div className="font-mono text-[#2C332A] truncate select-all">
                  {supabaseDetails.url || SUPABASE_URL || '(Not Configured in Environment Variables)'}
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center space-x-1.5 text-[#7C7C6D] font-bold">
                  <Key className="w-3.5 h-3.5 text-[#889E81]" />
                  <span>ANON PUBLIC KEY</span>
                </div>
                <div className="font-mono text-[#7C7C6D] truncate">
                  {supabaseDetails.keyConfigured ? (
                    <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline mr-1" />
                      Configured &amp; Active
                    </span>
                  ) : (
                    <span className="text-[#8C8C7E]">
                      Pending configuration in Settings &gt; Secrets
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Test Status Message */}
            {supabaseTestMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start space-x-2 border ${
                  supabaseTestStatus === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : supabaseTestStatus === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-[#F0ECE2] border-[#E6E2D3] text-[#5A5A40]'
                }`}
              >
                {supabaseTestStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : supabaseTestStatus === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-[#889E81] shrink-0 mt-0.5 animate-spin" />
                )}
                <span>{supabaseTestMsg}</span>
              </div>
            )}

            {/* Live Cloud Setup / Connection Manager */}
            <div className="pt-2 border-t border-[#F0ECE2]">
              <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-[#889E81]" />
                    <h4 className="text-xs font-bold text-[#5A5A40]">
                      Live Cloud Supabase Connection (Render / Production)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#7C7C6D] bg-[#F0ECE2] px-2.5 py-0.5 rounded-full border border-[#E6E2D3]">
                    Instant Connect
                  </span>
                </div>

                <p className="text-[11px] text-[#7C7C6D] leading-relaxed">
                  If running on Render (<code className="text-[#5A5A40] font-mono">mycare-connect.onrender.com</code>), make sure to add <code className="text-[#5A5A40] bg-[#F0ECE2] px-1 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-[#5A5A40] bg-[#F0ECE2] px-1 rounded font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your <strong>Render Dashboard &gt; Environment</strong>. You can also connect and sync immediately using the fields below:
                </p>

                <form onSubmit={handleConfigureSupabase} className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-[#5A5A40] block mb-1">
                        Supabase Project URL:
                      </label>
                      <input
                        type="text"
                        placeholder="https://jjaduhfcetzhzwmcjuri.supabase.co"
                        value={inputSupabaseUrl}
                        onChange={(e) => setInputSupabaseUrl(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-[#E6E2D3] rounded-xl font-mono text-[#2C332A] focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#5A5A40] block mb-1">
                        Supabase Anon / Service Key:
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={inputSupabaseKey}
                        onChange={(e) => setInputSupabaseKey(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-[#E6E2D3] rounded-xl font-mono text-[#2C332A] focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={isConfiguringSupabase}
                      className="px-4 py-2 bg-[#889E81] hover:bg-[#778E70] text-white rounded-full text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isConfiguringSupabase ? 'Connecting...' : 'Save & Connect Supabase Live'}</span>
                    </button>

                    {configureSupabaseMsg && (
                      <span
                        className={`text-xs font-medium ${
                          configureSupabaseMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {configureSupabaseMsg.text}
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Quick Fix / Schema Cache Migration Box */}
          <div className="bg-white rounded-[24px] border border-[#889E81]/30 p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#5A5A40] flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#889E81]" />
                  <span>Quick Fix Migration &amp; Full Delete Permissions</span>
                </h3>
                <p className="text-xs text-[#7C7C6D]">
                  Run this snippet in your Supabase SQL Editor to add missing columns, enable full deletion policies on Row Level Security (RLS), and purge inactive residents:
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
                  setCopiedMigrationSql(true);
                  setTimeout(() => setCopiedMigrationSql(false), 2000);
                }}
                className="px-3.5 py-2 bg-[#889E81] hover:bg-[#778E70] text-white rounded-full text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                {copiedMigrationSql ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>{copiedMigrationSql ? 'Copied Migration SQL!' : 'Copy Migration & Delete SQL'}</span>
              </button>
            </div>

            <pre className="bg-[#FAF9F6] text-[#2D2D24] p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-[#E6E2D3]">
              {SUPABASE_MIGRATION_SQL}
            </pre>
          </div>

          {/* Dedicated Physical Delete & RLS Helper Box */}
          <div className="bg-amber-50/70 rounded-[24px] border border-amber-200/80 p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-serif font-bold text-amber-900 flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-amber-700" />
                  <span>Physical Deletion &amp; Row Level Security (RLS) Alignment</span>
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Supabase defaults to restricting table deletions under Row Level Security. Run this 2-line snippet in Supabase SQL Editor so deleting a resident in the portal or clicking &quot;Sync All&quot; immediately deletes them from your Supabase Table Editor:
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_DELETE_POLICY_SQL);
                  setCopiedDeleteSql(true);
                  setTimeout(() => setCopiedDeleteSql(false), 2000);
                }}
                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-full text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                {copiedDeleteSql ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>{copiedDeleteSql ? 'Copied Delete SQL!' : 'Copy 2-Line Delete SQL'}</span>
              </button>
            </div>

            <pre className="bg-white text-amber-950 p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-amber-200">
              {SUPABASE_DELETE_POLICY_SQL}
            </pre>
          </div>

          {/* Schema Box */}
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#5A5A40] flex items-center space-x-2">
                  <Database className="w-4 h-4 text-[#889E81]" />
                  <span>Supabase PostgreSQL Schema &amp; Security Definitions</span>
                </h3>
                <p className="text-xs text-[#7C7C6D]">
                  Execute this SQL in your Supabase SQL Editor to initialize the <code className="text-[#889E81]">residents</code>, <code className="text-[#889E81]">caregivers</code>, and <code className="text-[#889E81]">care_logs</code> tables.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="px-3.5 py-2 bg-[#F0ECE2] hover:bg-[#E6E2D3] text-[#5A5A40] rounded-full text-xs font-semibold flex items-center space-x-1.5 border border-[#E6E2D3] cursor-pointer shrink-0"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-[#889E81]" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <pre className="bg-[#2D2D24] text-[#FAF9F6] p-4 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[500px] border border-[#E6E2D3]">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      )}

      {/* TAB: ADMIN SECURITY & REGISTERED DIRECTORY */}
      {activeTab === 'admin_security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Session & PDPA Security Status */}
          <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-[24px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#889E81]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif text-lg font-bold text-[#5A5A40]">
                    Chief Administrator Identity &amp; Access Control
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Malaysia PDPA Enforced
                  </span>
                </div>
                <p className="text-xs text-[#7C7C6D] max-w-2xl leading-relaxed">
                  Strict single-administrator architecture is active. Administrative access is strictly limited to the Chief Admin. Contact details and emails are masked across all interfaces to protect privacy.
                </p>
                {adminAuthSession && adminAuthSession.isAuthenticated && (
                  <div className="text-[11px] text-[#5A5A40] pt-1 flex items-center space-x-2 flex-wrap gap-y-1">
                    <span>Active Authenticated Session:</span>
                    <strong className="text-[#889E81]">{adminAuthSession.name}</strong>
                    <span className="font-mono text-xs bg-[#EBF1EA] px-2 py-0.5 rounded-md border border-[#889E81]/30">
                      {showAdminEmail
                        ? adminAuthSession.email
                        : `${adminAuthSession.email?.slice(0, 2) || 'or'}••••••••@${adminAuthSession.email?.split('@')[1] || 'gmail.com'}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminEmail(!showAdminEmail)}
                      className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#889E81] hover:underline cursor-pointer ml-1"
                      title={showAdminEmail ? 'Hide email' : 'Show email'}
                    >
                      {showAdminEmail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showAdminEmail ? 'Hide Email' : 'Show Email'}</span>
                    </button>
                    {adminAuthSession.verifiedAt && (
                      <span className="text-[#8C8C7E]">
                        &bull; Verified {new Date(adminAuthSession.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {onLockAdminSession && (
              <button
                type="button"
                id="admin-security-lock-session-btn"
                onClick={onLockAdminSession}
                className="px-4 py-2.5 bg-white hover:bg-rose-50 border border-[#E6E2D3] hover:border-rose-300 text-rose-700 rounded-full text-xs font-bold shadow-2xs flex items-center space-x-2 cursor-pointer shrink-0 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Session / Sign Out</span>
              </button>
            )}
          </div>

          {/* Feedback Toast */}
          {adminSecurityMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between border ${
                adminSecurityMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>{adminSecurityMsg.text}</span>
              <button
                onClick={() => setAdminSecurityMsg(null)}
                className="text-xs font-bold underline cursor-pointer ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Registered Chief Admin (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-[#889E81]" />
                    <h4 className="text-base font-serif font-bold text-[#5A5A40]">
                      Authorized Chief Administrator
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAdminEmail(!showAdminEmail)}
                      className="px-3 py-1 bg-[#FAF9F6] hover:bg-[#F0ECE2] border border-[#E6E2D3] rounded-lg text-xs font-semibold text-[#5A5A40] flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      {showAdminEmail ? <EyeOff className="w-3.5 h-3.5 text-[#7C7C6D]" /> : <Eye className="w-3.5 h-3.5 text-[#7C7C6D]" />}
                      <span>{showAdminEmail ? 'Hide Email' : 'Show Email'}</span>
                    </button>
                    <span className="text-xs font-bold text-[#7C7C6D] bg-[#FAF9F6] border border-[#E6E2D3] px-3 py-1 rounded-full">
                      1 Chief Admin (Strict)
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[#E6E2D3]">
                  {registeredAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#EBF1EA] text-[#5A5A40] font-bold text-xs flex items-center justify-center shrink-0 border border-[#889E81]/30">
                          {admin.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#5A5A40]">{admin.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Chief Administrator
                            </span>
                          </div>
                          <div className="text-xs font-mono text-[#889E81]">
                            {showAdminEmail
                              ? admin.email
                              : (admin.email
                                ? `${admin.email.slice(0, 2)}••••••••@${admin.email.split('@')[1] || 'gmail.com'}`
                                : '••••••••@••••')}
                          </div>
                          <div className="text-[11px] text-[#7C7C6D]">
                            <span>{admin.title}</span>
                            {admin.lastLoginAt && (
                              <span> &bull; Last login: {new Date(admin.lastLoginAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <span className="text-[11px] px-3 py-1 rounded-lg font-bold bg-[#FAF9F6] border border-[#E6E2D3] text-[#5A5A40] flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#889E81]" />
                          <span>Primary System Master</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Security Policy & Privacy Status */}
            <div className="space-y-4">
              <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#889E81]" />
                  <h4 className="text-sm font-serif font-bold text-[#5A5A40]">
                    Chief Admin Policy Enforced
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs text-[#7C7C6D] leading-relaxed">
                  <div className="p-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl space-y-1">
                    <span className="font-bold text-[#5A5A40] block">Single Master Administrator</span>
                    <p className="text-[11px]">
                      Access is restricted to one Chief Admin. All secondary administrative accounts have been decommissioned.
                    </p>
                  </div>

                  <div className="p-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl space-y-1">
                    <span className="font-bold text-[#5A5A40] block">Zero Public Email Exposure</span>
                    <p className="text-[11px]">
                      Administrator email addresses are masked across all portals and login screens to prevent spam, shoulder-surfing, and privacy leaks.
                    </p>
                  </div>

                  <div className="p-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl space-y-1">
                    <span className="font-bold text-[#5A5A40] block">2-Factor OTP Dispatched via Resend</span>
                    <p className="text-[11px]">
                      Single-use 6-digit security codes are delivered directly to the Chief Admin mailbox.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Rule Card */}
              <div className="bg-[#F0ECE2]/60 border border-[#E6E2D3] rounded-[24px] p-5 space-y-2 text-xs text-[#5A5A40]">
                <div className="font-bold flex items-center space-x-1.5 text-[#5A5A40]">
                  <ShieldAlert className="w-4 h-4 text-[#889E81]" />
                  <span>Strict PDPA Compliance</span>
                </div>
                <p className="text-[11px] text-[#7C7C6D] leading-relaxed">
                  Any unrecognized email entering the Admin verification flow receives a strict <strong>403 Access Denied</strong> response without disclosing directory details.
                </p>
              </div>
            </div>
          </div>
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
                    {BED_IDENTIFIER_OPTIONS.map((bedOpt) => (
                      <option key={bedOpt} value={bedOpt}>
                        {bedOpt}
                      </option>
                    ))}
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
                    Primary Family Contact Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sarah Wong"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Relationship:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Daughter, Son, Spouse"
                    value={newFamilyRelation}
                    onChange={(e) => setNewFamilyRelation(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Family Contact Email:
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., sarah.wong@gmail.com"
                    value={newFamilyEmail}
                    onChange={(e) => setNewFamilyEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Family Phone (Optional):
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +1 (555) 234-5678"
                    value={newFamilyPhone}
                    onChange={(e) => setNewFamilyPhone(e.target.value)}
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
      {/* MODAL: Edit Resident Profile & Bed Tag */}
      {editingResident && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-[#E6E2D3]">
            <div className="flex items-center justify-between border-b border-[#E6E2D3] pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-[#889E81]" />
                <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
                  Edit Resident &amp; Bed Register
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingResident(null)}
                className="text-[#8C8C7E] hover:text-[#5A5A40] text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveResidentModal} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Full Legal Name:
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
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
                    value={editPreferredName}
                    onChange={(e) => setEditPreferredName(e.target.value)}
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
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Bed Register:
                  </label>
                  <select
                    value={editBedNumber}
                    onChange={(e) => setEditBedNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  >
                    {BED_IDENTIFIER_OPTIONS.map((bedOpt) => (
                      <option key={bedOpt} value={bedOpt}>
                        {bedOpt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Age (Years):
                  </label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(parseInt(e.target.value) || 75)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                  Dietary Requirements:
                </label>
                <input
                  type="text"
                  value={editDiet}
                  onChange={(e) => setEditDiet(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                  Assigned Caregiver Staff:
                </label>
                <input
                  type="text"
                  value={editCaregiverName}
                  onChange={(e) => setEditCaregiverName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Primary Family Contact Name:
                  </label>
                  <input
                    type="text"
                    value={editFamilyName}
                    onChange={(e) => setEditFamilyName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Relationship:
                  </label>
                  <input
                    type="text"
                    value={editFamilyRelation}
                    onChange={(e) => setEditFamilyRelation(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Family Contact Email:
                  </label>
                  <input
                    type="email"
                    value={editFamilyEmail}
                    onChange={(e) => setEditFamilyEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5A5A40] block mb-1">
                    Family Phone (Optional):
                  </label>
                  <input
                    type="tel"
                    value={editFamilyPhone}
                    onChange={(e) => setEditFamilyPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-none text-[#4A4A40]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E6E2D3]">
                <button
                  type="button"
                  id="admin-edit-modal-delete-btn"
                  onClick={() => {
                    if (editingResident) {
                      const target = editingResident;
                      setEditingResident(null);
                      handleRequestDeleteResident(target);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-full flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Resident &amp; Free Bed</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingResident(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#7C7C6D] hover:bg-[#FAF9F6] rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#889E81] hover:bg-[#788E71] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Resident Confirmation Modal */}
      {residentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-[#E6E2D3] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
                  Delete Resident &amp; Free Bed?
                </h3>
                <p className="text-xs text-[#7C7C6D]">
                  This will remove the resident from the directory and deallocate their assigned room bed.
                </p>
              </div>
            </div>

            {/* Resident Card Details */}
            <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-3.5 space-y-2 text-xs text-[#5A5A40]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#5A5A40]">{residentToDelete.fullName}</span>
                <span className="text-[10px] font-bold bg-[#F0ECE2] border border-[#E6E2D3] px-2.5 py-0.5 rounded-full">
                  Room {residentToDelete.roomNumber} &bull; {residentToDelete.bedNumber}
                </span>
              </div>
              <div className="text-[11px] text-[#7C7C6D] space-y-1 pt-1 border-t border-[#E6E2D3]">
                <p>
                  <span className="text-[#8C8C7E]">Assigned Caregiver:</span>{' '}
                  <strong className="text-[#5A5A40]">{residentToDelete.assignedCaregiverName || 'Caregiver Staff'}</strong>
                </p>
                <p>
                  <span className="text-[#8C8C7E]">Family Contact:</span>{' '}
                  <strong className="text-[#5A5A40]">{residentToDelete.familyContactName || 'None listed'}</strong>{' '}
                  {residentToDelete.familyContactRelation && `(${residentToDelete.familyContactRelation})`}
                </p>
              </div>
            </div>

            <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                This will delete the record from local state, backend storage, and synchronized Supabase tables. The bed tag will become available for new admissions.
              </span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setResidentToDelete(null)}
                disabled={isDeletingResident}
                className="px-4 py-2 text-xs font-semibold text-[#7C7C6D] hover:bg-[#FAF9F6] rounded-full cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-resident-btn"
                onClick={handleConfirmDeleteResident}
                disabled={isDeletingResident}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isDeletingResident ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection / Revision Request Modal */}
      {rejectionModal.isOpen && rejectionModal.log && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-[#E6E2D3] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-[#5A5A40]">
                  Request Revisions / Reject Update
                </h3>
                <p className="text-xs text-[#7C7C6D]">
                  This update for <strong>{rejectionModal.log.residentFullName}</strong> will remain hidden from the Family Portal. Please describe what the caregiver needs to revise.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#5A5A40] block">
                Supervisor Feedback / Revision Instructions:
              </label>
              <textarea
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                rows={3}
                placeholder="e.g. Please retake blood pressure monitor photo with clearer lighting, or verify lunch intake percentage."
                className="w-full text-xs p-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl focus:ring-2 focus:ring-[#889E81] focus:outline-hidden text-[#5A5A40] placeholder-[#8C8C7E]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6E2D3]">
              <button
                type="button"
                onClick={() => setRejectionModal({ isOpen: false, log: null, reason: '' })}
                className="px-4 py-2 text-xs font-semibold text-[#7C7C6D] hover:bg-[#FAF9F6] rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isApprovingLogId === rejectionModal.log.id}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-xs cursor-pointer flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Confirm Revision Request</span>
              </button>
            </div>
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
              <span className="text-emerald-400 font-mono font-semibold">Daily Vitals Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
