import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CaregiverView } from './components/Caregiver/CaregiverView';
import { FamilyPortalView } from './components/Family/FamilyPortalView';
import { AdminDashboardView } from './components/Admin/AdminDashboardView';
import { AdminAuthModal } from './components/Admin/AdminAuthModal';
import {
  Resident,
  CareLog,
  FamilyMessage,
  UserProfile,
  UserRole,
  MorningVitalsRecord,
  AdminAuthSession,
} from './types';
import { INITIAL_USERS, INITIAL_RESIDENTS, INITIAL_CARE_LOGS, INITIAL_FAMILY_MESSAGES, INITIAL_MORNING_VITALS } from './data/mockData';
import {
  syncResidentToSupabase,
  updateResidentInSupabase,
  deleteResidentFromSupabase,
  fetchResidentsFromSupabase,
  toValidUuid,
  generateUuid,
} from './lib/supabaseClient';

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('careconnect_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If parsed contains legacy hardcoded names, reset to INITIAL_USERS
        const hasLegacyNames = parsed.some((u: UserProfile) => 
          u.name.includes('Sarah Jenkins') || u.name.includes('Eleanor Vance') || u.name.includes('Jonathan Tan')
        );
        if (!hasLegacyNames) return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return INITIAL_USERS;
  });
  const [currentRole, setCurrentRole] = useState<UserRole>('caregiver');
  const [residents, setResidents] = useState<Resident[]>(INITIAL_RESIDENTS);
  const [careLogs, setCareLogs] = useState<CareLog[]>(INITIAL_CARE_LOGS);
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>(INITIAL_FAMILY_MESSAGES);
  const [morningVitals, setMorningVitals] = useState<MorningVitalsRecord[]>(INITIAL_MORNING_VITALS);
  const [loading, setLoading] = useState(true);

  // Admin Email Verification & Authentication Session
  const [adminAuthSession, setAdminAuthSession] = useState<AdminAuthSession>(() => {
    try {
      const saved = sessionStorage.getItem('careconnect_admin_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }
    return { isAuthenticated: false };
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);

  // Handle Role Selection with Admin Gate Enforcement
  const handleSelectRole = (role: UserRole) => {
    if (role === 'admin') {
      if (!adminAuthSession.isAuthenticated) {
        setIsAdminAuthModalOpen(true);
        return;
      }
    }
    setCurrentRole(role);
  };

  // On successful admin verification
  const handleAdminAuthSuccess = (verifiedAdmin: UserProfile, token: string) => {
    const newSession: AdminAuthSession = {
      isAuthenticated: true,
      email: verifiedAdmin.email,
      name: verifiedAdmin.name,
      title: verifiedAdmin.title,
      verifiedAt: new Date().toISOString(),
      token,
    };
    setAdminAuthSession(newSession);
    try {
      sessionStorage.setItem('careconnect_admin_session', JSON.stringify(newSession));
    } catch (e) {
      console.warn('Session storage error:', e);
    }

    // Update admin profile in users list
    setUsers((prev) =>
      prev.map((u) =>
        u.role === 'admin'
          ? {
              ...u,
              id: verifiedAdmin.id || u.id,
              name: verifiedAdmin.name,
              email: verifiedAdmin.email,
              title: verifiedAdmin.title || u.title,
            }
          : u
      )
    );

    setIsAdminAuthModalOpen(false);
    setCurrentRole('admin');
  };

  // Lock Admin Session & Sign Out
  const handleLockAdminSession = () => {
    try {
      sessionStorage.removeItem('careconnect_admin_session');
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }
    setAdminAuthSession({ isAuthenticated: false });
    setCurrentRole('caregiver');
  };

  // Update User Profile / Caregiver Name handler
  const handleUpdateUserName = (newName: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.role === currentRole ? { ...u, name: newName } : u));
      try {
        localStorage.setItem('careconnect_users', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist user name:', e);
      }
      return updated;
    });
  };

  // Sync initial and ongoing data from backend API and Supabase
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [resRes, logsRes, msgRes, vitalsRes] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/care-logs'),
          fetch('/api/messages'),
          fetch('/api/vitals/morning-records'),
        ]);

        let loadedResidents: Resident[] = [];

        if (resRes.ok) {
          const resData = await resRes.json();
          if (Array.isArray(resData)) {
            loadedResidents = resData;
          }
        }

        // Direct Supabase pull check for live persistence
        try {
          const supaResult = await fetchResidentsFromSupabase();
          if (supaResult.success && Array.isArray(supaResult.residents)) {
            loadedResidents = supaResult.residents;
          }
        } catch (supaErr) {
          console.warn('Client Supabase direct sync note:', supaErr);
        }

        setResidents(loadedResidents);

        if (logsRes.ok) {
          const logsData = await logsRes.json();
          if (Array.isArray(logsData)) {
            setCareLogs(logsData);
          }
        }
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          if (Array.isArray(msgData)) {
            setFamilyMessages(msgData);
          }
        }
        if (vitalsRes.ok) {
          const vitalsData = await vitalsRes.json();
          if (Array.isArray(vitalsData)) {
            setMorningVitals(vitalsData);
          }
        }
      } catch (e) {
        console.warn('Sync notice:', e);
      } finally {
        setLoading(false);
      }
    }

    loadBackendData();
    const interval = setInterval(loadBackendData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Determine current active user based on selected role
  const currentUser: UserProfile =
    users.find((u) => u.role === currentRole) || users[0];

  // Handler: Save new Morning Vitals Record with Watermark
  const handleSaveMorningVitals = async (newRecordData: Partial<MorningVitalsRecord>) => {
    try {
      const response = await fetch('/api/vitals/morning-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecordData),
      });

      if (response.ok) {
        const created: MorningVitalsRecord = await response.json();
        setMorningVitals((prev) => [
          created,
          ...prev.filter((v) => !(v.residentId === created.residentId && v.formattedDate === created.formattedDate)),
        ]);
      } else {
        const now = new Date();
        const fallback: MorningVitalsRecord = {
          id: `vtl_${Date.now()}`,
          recordedAt: now.toISOString(),
          formattedTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          isBefore7am: now.getHours() < 7,
          status: 'normal',
          readings: {},
          vitalsPhotoUrl: '',
          caregiverId: currentUser.id,
          caregiverName: currentUser.name,
          residentId: '',
          residentFullName: '',
          roomNumber: '',
          bedNumber: '',
          ...(newRecordData as MorningVitalsRecord),
        };
        setMorningVitals((prev) => [
          fallback,
          ...prev.filter((v) => !(v.residentId === fallback.residentId && v.formattedDate === fallback.formattedDate)),
        ]);
      }
    } catch (err) {
      console.error('Failed to save morning vitals:', err);
    }
  };

  // Handler: Publish new Care Log (Defaults to pending admin approval)
  const handlePublishLog = async (newLogData: Partial<CareLog>) => {
    const payload = {
      ...newLogData,
      approvalStatus: newLogData.approvalStatus || 'pending_approval',
    };

    try {
      const response = await fetch('/api/care-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const created: CareLog = await response.json();
        setCareLogs((prev) => [created, ...prev]);
      } else {
        // Fallback local update
        const fallback: CareLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          familyLikesCount: 0,
          familyCommentsCount: 0,
          flaggedForAdminReview: false,
          approvalStatus: 'pending_approval',
          ...(newLogData as CareLog),
        };
        setCareLogs((prev) => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Failed to post care log:', err);
    }
  };

  // Handler: Admin approves / rejects a Caregiver update
  const handleApproveCareLog = async (
    logId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => {
    try {
      const response = await fetch(`/api/care-logs/${logId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminName: currentUser.name,
          reviewNotes,
        }),
      });

      if (response.ok) {
        const updated: CareLog = await response.json();
        setCareLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
      } else {
        setCareLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  approvalStatus: status,
                  approvedByAdminName: currentUser.name,
                  approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
                  adminReviewNotes: reviewNotes,
                }
              : l
          )
        );
      }
    } catch (err) {
      console.error('Failed to update care log approval status:', err);
      // Optimistic local update
      setCareLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                approvalStatus: status,
                approvedByAdminName: currentUser.name,
                approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
                adminReviewNotes: reviewNotes,
              }
            : l
        )
      );
    }
  };

  // Handler: Admin bulk approves all pending caregiver updates
  const handleBulkApproveCareLogs = async () => {
    try {
      const response = await fetch('/api/care-logs/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: currentUser.name }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.logs) {
          setCareLogs(data.logs);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to bulk approve care logs:', err);
    }

    // Local fallback
    const now = new Date().toISOString();
    setCareLogs((prev) =>
      prev.map((l) =>
        l.approvalStatus === 'pending_approval' || !l.approvalStatus
          ? {
              ...l,
              approvalStatus: 'approved',
              approvedByAdminName: currentUser.name,
              approvedAt: now,
            }
          : l
      )
    );
  };

  // Handler: Send Family Inquiry / Message (Intercepted to Admin)
  const handleSendMessage = async (msgData: Partial<FamilyMessage>) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData),
      });

      if (response.ok) {
        const created: FamilyMessage = await response.json();
        setFamilyMessages((prev) => [created, ...prev]);
      } else {
        const fallback: FamilyMessage = {
          id: `msg_${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'intercepted_pending_admin',
          urgency: 'normal',
          ...(msgData as FamilyMessage),
        };
        setFamilyMessages((prev) => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handler: Like a care log
  const handleLikeLog = async (logId: string) => {
    try {
      await fetch(`/api/care-logs/${logId}/like`, { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    setCareLogs((prev) =>
      prev.map((l) =>
        l.id === logId ? { ...l, familyLikesCount: l.familyLikesCount + 1 } : l
      )
    );
  };

  // Handler: Admin responds to intercepted message
  const handleRespondMessage = async (msgId: string, adminResponseText: string) => {
    try {
      const response = await fetch(`/api/messages/${msgId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminResponse: adminResponseText,
          adminName: currentUser.name,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setFamilyMessages((prev) =>
          prev.map((m) => (m.id === msgId ? updated : m))
        );
      } else {
        setFamilyMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  adminResponse: adminResponseText,
                  respondedByAdminName: currentUser.name,
                  respondedAt: new Date().toISOString(),
                  status: 'responded',
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Failed to respond to message:', err);
    }
  };

  // Handler: Admit new resident
  const handleAddResident = async (newRes: Partial<Resident>) => {
    try {
      const residentId = newRes.id || generateUuid();
      const residentPayload: Resident = {
        id: residentId,
        fullName: newRes.fullName || 'Resident',
        preferredName: newRes.preferredName || newRes.fullName?.split(' ')[0] || 'Resident',
        roomNumber: newRes.roomNumber || '101',
        bedNumber: newRes.bedNumber || 'Bed 01',
        age: newRes.age || 80,
        dietaryRestrictions: newRes.dietaryRestrictions || 'Standard balanced, soft texture',
        medicalNotes: newRes.medicalNotes || 'Assisted living general care plan.',
        carePlan: newRes.carePlan || ['Routine vitals check', 'Nutritional monitoring', 'Hydration schedule'],
        assignedCaregiverId: newRes.assignedCaregiverId || 'user_care_1',
        assignedCaregiverName: newRes.assignedCaregiverName || 'Caregiver Staff',
        familyContactName: newRes.familyContactName || 'Primary Family Contact',
        familyContactRelation: newRes.familyContactRelation || 'Family Member',
        familyContactEmail: newRes.familyContactEmail || '',
        familyContactPhone: newRes.familyContactPhone || '',
        photoUrl: newRes.photoUrl || '',
        admissionDate: newRes.admissionDate || new Date().toISOString().split('T')[0],
      };

      // Optimistically update local state immediately
      setResidents((prev) => {
        const idx = prev.findIndex((r) => r.id === residentPayload.id || toValidUuid(r.id) === toValidUuid(residentPayload.id));
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = residentPayload;
          return copy;
        }
        return [...prev, residentPayload];
      });

      // Synchronize with Supabase and backend
      await syncResidentToSupabase(residentPayload);
    } catch (err) {
      console.error('Failed to add resident:', err);
    }
  };

  // Handler: Update existing resident name, bed register, and details
  const handleUpdateResident = async (residentId: string, updatedFields: Partial<Resident>) => {
    try {
      // Optimistically update local state
      setResidents((prev) =>
        prev.map((r) => (r.id === residentId || toValidUuid(r.id) === toValidUuid(residentId) ? { ...r, ...updatedFields } : r))
      );

      // Synchronize with Supabase and backend
      await updateResidentInSupabase(residentId, updatedFields);

      // Keep careLogs and familyMessages sync'd with updated resident details
      if (updatedFields.fullName || updatedFields.roomNumber || updatedFields.bedNumber) {
        setFamilyMessages((prev) =>
          prev.map((m) =>
            m.residentId === residentId
              ? {
                  ...m,
                  residentFullName: updatedFields.fullName || m.residentFullName,
                  roomNumber: updatedFields.roomNumber || m.roomNumber,
                  bedNumber: updatedFields.bedNumber || m.bedNumber,
                }
              : m
          )
        );
        setCareLogs((prev) =>
          prev.map((l) =>
            l.residentId === residentId
              ? {
                  ...l,
                  residentFullName: updatedFields.fullName || l.residentFullName,
                  roomNumber: updatedFields.roomNumber || l.roomNumber,
                  bedNumber: updatedFields.bedNumber || l.bedNumber,
                }
              : l
          )
        );
      }
    } catch (err) {
      console.error('Failed to update resident:', err);
    }
  };

  // Handler: Delete resident & deallocate bed
  const handleDeleteResident = async (residentId: string) => {
    try {
      const targetUuid = toValidUuid(residentId);
      // Optimistically remove resident from state
      setResidents((prev) =>
        prev.filter((r) => r.id !== residentId && toValidUuid(r.id) !== targetUuid)
      );

      // Delete from Supabase and backend
      await deleteResidentFromSupabase(residentId);
    } catch (err) {
      console.error('Failed to delete resident:', err);
    }
  };

  const pendingInquiriesCount = familyMessages.filter(
    (m) => m.status === 'intercepted_pending_admin'
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#4A4A40] flex flex-col font-sans antialiased selection:bg-[#889E81]/20 selection:text-[#5A5A40]">
      {/* Global Navigation Header */}
      <Header
        currentUser={currentUser}
        onSelectRole={handleSelectRole}
        pendingInquiriesCount={pendingInquiriesCount}
        onUpdateUserName={handleUpdateUserName}
        adminAuthSession={adminAuthSession}
        onLockAdminSession={handleLockAdminSession}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'caregiver' && (
          <CaregiverView
            residents={residents}
            caregiver={currentUser}
            onPublishLog={handlePublishLog}
            existingLogs={careLogs}
            morningVitals={morningVitals}
            onSaveMorningVitals={handleSaveMorningVitals}
          />
        )}

        {currentRole === 'family' && (
          <FamilyPortalView
            currentFamilyUser={currentUser}
            residents={residents}
            careLogs={careLogs}
            familyMessages={familyMessages}
            morningVitals={morningVitals}
            onSendMessage={handleSendMessage}
            onLikeLog={handleLikeLog}
          />
        )}

        {currentRole === 'admin' && (
          <AdminDashboardView
            adminUser={currentUser}
            residents={residents}
            careLogs={careLogs}
            familyMessages={familyMessages}
            morningVitals={morningVitals}
            adminAuthSession={adminAuthSession}
            onLockAdminSession={handleLockAdminSession}
            onRespondMessage={handleRespondMessage}
            onApproveCareLog={handleApproveCareLog}
            onBulkApproveCareLogs={handleBulkApproveCareLogs}
            onAddResident={handleAddResident}
            onUpdateResident={handleUpdateResident}
            onDeleteResident={handleDeleteResident}
          />
        )}
      </main>

      {/* Admin Email Verification Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Footer */}
      <footer className="bg-[#FAF9F6] border-t border-[#E6E2D3] py-4 text-xs text-[#7C7C6D]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center space-x-2">
            <span className="font-semibold text-[#5A5A40]">Care Connect</span>
            <span>&bull;</span>
            <span>Family Transparency &amp; Care Communication Protocol</span>
          </span>
          <div className="flex items-center space-x-4 text-[11px] text-[#8C8C7E]">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#889E81]"></span>
              <span>Gemini Multimodal AI</span>
            </span>
            <span>&bull;</span>
            <span>Malaysia PDPA Compliant &amp; Supabase RLS Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
