import React from 'react';
import { UserRole, UserProfile } from '../types';
import { ShieldCheck, HeartHandshake, Users, Sparkles, Building2, Bell } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  onSelectRole: (role: UserRole) => void;
  pendingInquiriesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectRole,
  pendingInquiriesCount,
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#E6E2D3] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Facility Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#889E81] rounded-2xl flex items-center justify-center text-white shadow-xs">
              <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-2xl font-semibold tracking-tight text-[#5A5A40]">
                  Care Connect
                </span>
              </div>
              <p className="text-xs text-[#7C7C6D] hidden sm:block">
                Family Transparency & Care Communication Protocol
              </p>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center space-x-1.5 bg-[#F0ECE2] p-1 rounded-2xl border border-[#E6E2D3]">
            <button
              id="role-btn-caregiver"
              onClick={() => onSelectRole('caregiver')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                currentUser.role === 'caregiver'
                  ? 'bg-white text-[#5A5A40] shadow-xs border border-[#E6E2D3]'
                  : 'text-[#7C7C6D] hover:text-[#4A4A40]'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-[#889E81]"></div>
              <span>Caregiver (Nurse)</span>
            </button>

            <button
              id="role-btn-family"
              onClick={() => onSelectRole('family')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                currentUser.role === 'family'
                  ? 'bg-white text-[#5A5A40] shadow-xs border border-[#E6E2D3]'
                  : 'text-[#7C7C6D] hover:text-[#4A4A40]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#889E81]" />
              <span>Family Portal</span>
            </button>

            <button
              id="role-btn-admin"
              onClick={() => onSelectRole('admin')}
              className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                currentUser.role === 'admin'
                  ? 'bg-white text-[#5A5A40] shadow-xs border border-[#E6E2D3]'
                  : 'text-[#7C7C6D] hover:text-[#4A4A40]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#889E81]" />
              <span>Admin Interception</span>
              {pendingInquiriesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#C27D60] text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingInquiriesCount}
                </span>
              )}
            </button>
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-[#5A5A40]">{currentUser.name}</div>
              <div className="text-[11px] text-[#7C7C6D] flex items-center justify-end space-x-1">
                <span>{currentUser.title || currentUser.role}</span>
              </div>
            </div>
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#889E81]/30 border border-white"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
