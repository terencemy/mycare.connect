'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Resident {
  id: string;
  full_name: string;
  room_number: string;
  bed_number: string;
  preferred_name?: string;
  age?: number;
  created_at?: string;
}

export default function AdminResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states: Full Name, Room Number, Bed Number
  const [fullName, setFullName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [bedNumber, setBedNumber] = useState('Bed A');
  const [preferredName, setPreferredName] = useState('');
  const [age, setAge] = useState<string>('');

  // 1. Fetch existing residents from Supabase
  const fetchResidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('room_number', { ascending: true })
        .order('bed_number', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        setResidents(data as Resident[]);
      }
    } catch (err: any) {
      console.error('Error fetching residents:', err);
      setErrorMessage(err.message || 'Failed to fetch residents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  // 2. Handle adding a new resident
  const handleRegisterResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!roomNumber.trim()) {
      setErrorMessage('Room Number is required.');
      return;
    }
    if (!bedNumber.trim()) {
      setErrorMessage('Bed Number is required.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        full_name: fullName.trim(),
        room_number: roomNumber.trim(),
        bed_number: bedNumber.trim(),
        preferred_name: preferredName.trim() || null,
        age: age ? parseInt(age, 10) : null,
      };

      const { data, error } = await supabase
        .from('residents')
        .insert([payload])
        .select();

      if (error) {
        throw error;
      }

      setSuccessMessage(`Successfully registered ${fullName} to Room ${roomNumber} (${bedNumber})!`);

      // Reset form fields
      setFullName('');
      setRoomNumber('');
      setBedNumber('Bed A');
      setPreferredName('');
      setAge('');

      // Refresh list
      fetchResidents();
    } catch (err: any) {
      console.error('Error registering resident:', err);
      setErrorMessage(err.message || 'Failed to register resident.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#2C332A] p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2D3] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2C332A]">
              Resident Management
            </h1>
            <p className="text-sm text-[#7C7C6D] mt-1">
              Admin Portal: Register new residents and configure Room / Bed assignments.
            </p>
          </div>
          <div className="bg-[#EBF1EA] text-[#5A5A40] border border-[#889E81]/30 px-3.5 py-1.5 rounded-full text-xs font-semibold self-start">
            Connected to Supabase PostgreSQL
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 font-bold hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 font-bold hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Grid: Form + Resident Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E2D3] p-6 shadow-sm space-y-5">
            <div className="border-b border-[#F0ECE2] pb-3">
              <h2 className="text-lg font-bold text-[#2C332A]">
                Register New Resident
              </h2>
              <p className="text-xs text-[#7C7C6D]">
                Enter room and bed allocation for care tracking.
              </p>
            </div>

            <form onSubmit={handleRegisterResident} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#5A5A40] uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Arthur Pendelton"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-sm text-[#2C332A] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                />
              </div>

              {/* Room Number & Bed Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5A5A40] uppercase mb-1">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 104 or 201"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-sm text-[#2C332A] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A5A40] uppercase mb-1">
                    Bed Identifier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-sm text-[#2C332A] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                  >
                    <option value="Bed A">Bed A (Window)</option>
                    <option value="Bed B">Bed B (Door)</option>
                    <option value="Bed C">Bed C</option>
                    <option value="Bed D">Bed D</option>
                    <option value="Single Room">Single Room</option>
                  </select>
                </div>
              </div>

              {/* Optional: Preferred Name & Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#7C7C6D] uppercase mb-1">
                    Preferred Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Artie"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-sm text-[#2C332A] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7C7C6D] uppercase mb-1">
                    Age (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    placeholder="e.g., 82"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-sm text-[#2C332A] focus:outline-none focus:ring-2 focus:ring-[#889E81]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 bg-[#889E81] hover:bg-[#778E70] text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {submitting ? (
                  <span>Registering to Supabase...</span>
                ) : (
                  <span>+ Save &amp; Assign Resident</span>
                )}
              </button>
            </form>
          </div>

          {/* Resident Directory List (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E2D3] p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE2] pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#2C332A]">
                  Active Facility Residents
                </h2>
                <p className="text-xs text-[#7C7C6D]">
                  {residents.length} total resident{residents.length === 1 ? '' : 's'} in database
                </p>
              </div>
              <button
                onClick={fetchResidents}
                className="text-xs text-[#5A5A40] hover:text-[#2C332A] font-semibold bg-[#FAF9F6] border border-[#E6E2D3] px-3 py-1.5 rounded-lg"
              >
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-[#7C7C6D] text-sm">
                Loading residents from Supabase...
              </div>
            ) : residents.length === 0 ? (
              <div className="py-12 text-center text-[#7C7C6D] text-sm bg-[#FAF9F6] rounded-xl border border-dashed border-[#E6E2D3]">
                No residents registered yet. Fill out the form to register your first resident.
              </div>
            ) : (
              <div className="divide-y divide-[#F0ECE2] overflow-y-auto max-h-[500px]">
                {residents.map((r) => (
                  <div
                    key={r.id}
                    className="py-3.5 flex items-center justify-between hover:bg-[#FAF9F6] px-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center font-bold text-sm border border-[#889E81]/30">
                        {r.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#2C332A] flex items-center space-x-2">
                          <span>{r.full_name}</span>
                          {r.preferred_name && (
                            <span className="text-xs font-normal text-[#7C7C6D]">
                              ("{r.preferred_name}")
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#7C7C6D] flex items-center space-x-2 mt-0.5">
                          {r.age && <span>{r.age} yrs</span>}
                          {r.age && <span>•</span>}
                          <span>ID: {r.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-[#F0ECE2] text-[#5A5A40] font-bold text-xs rounded-lg border border-[#E6E2D3]">
                        Room {r.room_number} • {r.bed_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
