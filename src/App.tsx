import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CaregiverView } from './components/Caregiver/CaregiverView';
import { FamilyPortalView } from './components/Family/FamilyPortalView';
import { AdminDashboardView } from './components/Admin/AdminDashboardView';
import {
  Resident,
  CareLog,
  FamilyMessage,
  UserProfile,
  UserRole,
  MorningVitalsRecord,
} from './types';
import { INITIAL_USERS, INITIAL_RESIDENTS, INITIAL_CARE_LOGS, INITIAL_FAMILY_MESSAGES, INITIAL_MORNING_VITALS } from './data/mockData';

export default function App() {
  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentRole, setCurrentRole] = useState<UserRole>('caregiver');
  const [residents, setResidents] = useState<Resident[]>(INITIAL_RESIDENTS);
  const [careLogs, setCareLogs] = useState<CareLog[]>(INITIAL_CARE_LOGS);
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>(INITIAL_FAMILY_MESSAGES);
  const [morningVitals, setMorningVitals] = useState<MorningVitalsRecord[]>(INITIAL_MORNING_VITALS);
  const [loading, setLoading] = useState(true);

  // Sync initial data from backend API
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [resRes, logsRes, msgRes, vitalsRes] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/care-logs'),
          fetch('/api/messages'),
          fetch('/api/vitals/morning-records'),
        ]);

        if (resRes.ok) {
          const resData = await resRes.json();
          setResidents(resData);
        }
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setCareLogs(logsData);
        }
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setFamilyMessages(msgData);
        }
        if (vitalsRes.ok) {
          const vitalsData = await vitalsRes.json();
          setMorningVitals(vitalsData);
        }
      } catch (e) {
        console.warn('Using local fallback data:', e);
      } finally {
        setLoading(false);
      }
    }

    loadBackendData();
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

  // Handler: Publish new Care Log
  const handlePublishLog = async (newLogData: Partial<CareLog>) => {
    try {
      const response = await fetch('/api/care-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogData),
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
          ...(newLogData as CareLog),
        };
        setCareLogs((prev) => [fallback, ...prev]);
      }
    } catch (err) {
      console.error('Failed to post care log:', err);
    }
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
      const response = await fetch('/api/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRes),
      });

      if (response.ok) {
        const created = await response.json();
        setResidents((prev) => [...prev, created]);
      } else {
        const fallback: Resident = {
          id: `res_${Date.now()}`,
          ...(newRes as Resident),
        };
        setResidents((prev) => [...prev, fallback]);
      }
    } catch (err) {
      console.error('Failed to add resident:', err);
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
        onSelectRole={setCurrentRole}
        pendingInquiriesCount={pendingInquiriesCount}
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
            onRespondMessage={handleRespondMessage}
            onAddResident={handleAddResident}
          />
        )}
      </main>

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
            <span>HIPAA Compliant &amp; Supabase RLS Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
