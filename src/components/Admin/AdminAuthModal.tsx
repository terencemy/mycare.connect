import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, X, Lock, Building2, UserCheck, ShieldAlert, Send } from 'lucide-react';
import { UserProfile } from '../../types';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminUser: UserProfile, token: string) => void;
  initialEmail?: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
}) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    adminName: string;
    adminTitle: string;
    maskedEmail: string;
    emailSent?: boolean;
    resendConfigured?: boolean;
    dispatchError?: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleSendCode = async (targetEmail?: string) => {
    const emailToUse = (targetEmail || email).trim();
    if (!emailToUse) {
      setError('Please enter the registered Chief Administrator email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/admin/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Access Denied: Unrecognized administrator credentials.');
        setLoading(false);
        return;
      }

      setEmail(emailToUse);
      setSuccessInfo({
        adminName: data.adminName || 'Chief Admin',
        adminTitle: data.adminTitle || 'Chief Administrator & Facility Director',
        maskedEmail: data.maskedEmail || `${emailToUse.slice(0, 2)}••••@${emailToUse.split('@')[1] || '***'}`,
        emailSent: data.emailSent,
        resendConfigured: data.resendConfigured,
        dispatchError: data.dispatchError,
      });
      setStep('otp');
      setCountdown(600);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError('Connection error. Please verify network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (clean.length > 1) {
      // Handle paste of whole code
      const pasted = clean.slice(0, 6).split('');
      pasted.forEach((ch, idx) => {
        if (idx < 6) newDigits[idx] = ch;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputsRef.current[nextFocus]?.focus();

      if (pasted.length === 6) {
        verifyOtpCode(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      verifyOtpCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const verifyOtpCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codeToVerify }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      // Success!
      onSuccess(data.user, data.token);
    } catch (err: any) {
      setError('Verification failed. Please check network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full shadow-2xl border border-[#E6E2D3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-[#FAF9F6] border-b border-[#E6E2D3] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#889E81]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif text-lg font-bold text-[#5A5A40]">Chief Admin Access</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#889E81]/15 text-[#5A5A40] border border-[#889E81]/30">
                  PDPA Secure
                </span>
              </div>
              <p className="text-xs text-[#7C7C6D]">Strictly for Authorized Chief Administrator</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7C7C6D] hover:text-[#5A5A40] hover:bg-[#F0ECE2] transition-colors cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Security Notice */}
          <div className="bg-[#F0ECE2]/60 border border-[#E6E2D3] rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-[#5A5A40]">
            <Lock className="w-4 h-4 text-[#889E81] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Administrative functions, facility analytics, medical care audits, and resident records require verified Chief Admin credentials.
            </p>
          </div>

          {/* STEP 1: Enter Registered Email */}
          {step === 'email' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5A5A40] flex items-center justify-between">
                  <span>Chief Admin Email</span>
                  <span className="text-[11px] font-normal text-[#8C8C7E]">Official Facility Email</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C8C7E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="admin-email-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter registered Chief Admin email..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendCode();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-xs font-medium text-[#5A5A40] placeholder-[#8C8C7E] focus:outline-hidden focus:border-[#889E81] focus:ring-2 focus:ring-[#889E81]/20 transition-all"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Access Restricted</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                id="send-admin-verification-code-btn"
                onClick={() => handleSendCode()}
                disabled={loading || !email.trim()}
                className="w-full py-3 bg-[#889E81] hover:bg-[#788E71] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Chief Admin Registry...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Enter 6-Digit OTP */}
          {step === 'otp' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center space-y-1.5">
                <div className="text-xs font-bold text-[#5A5A40]">
                  Verification Code Dispatched
                </div>
                <div className="text-xs font-mono font-bold text-[#889E81] bg-[#EBF1EA] px-3 py-1 rounded-lg inline-block border border-[#889E81]/30">
                  {successInfo?.maskedEmail || '••••••••@••••'}
                </div>
                {successInfo && (
                  <p className="text-[11px] text-[#7C7C6D]">
                    Authorized Profile: <strong>{successInfo.adminName}</strong> ({successInfo.adminTitle})
                  </p>
                )}
              </div>

              {/* Resend Email Delivery Notification */}
              <div className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl p-3.5 space-y-1.5 text-xs text-[#5A5A40]">
                <div className="flex items-center space-x-2 font-bold text-[#5A5A40]">
                  <Send className="w-4 h-4 text-[#889E81]" />
                  <span>
                    {successInfo?.emailSent
                      ? 'Verification Email Delivered via Resend'
                      : 'Verification Code Dispatched'}
                  </span>
                </div>
                <p className="text-[11px] text-[#7C7C6D] leading-relaxed">
                  Please check your inbox at the registered email address for the 6-digit security code. If not received within 30 seconds, please check your spam folder.
                </p>
                {successInfo?.dispatchError && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] mt-1.5">
                    <strong>Resend Delivery Note:</strong> {successInfo.dispatchError}
                  </div>
                )}
              </div>

              {/* 6-Digit Boxes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#5A5A40] text-center block">
                  Enter 6-Digit Security Code
                </label>
                <div className="flex items-center justify-center space-x-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-mono font-bold bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl text-[#5A5A40] focus:outline-hidden focus:border-[#889E81] focus:ring-2 focus:ring-[#889E81]/30 transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Expiry Countdown & Resend */}
              <div className="flex items-center justify-between text-xs text-[#7C7C6D] px-1">
                <span>
                  Code expires in: <strong className="font-mono text-[#5A5A40]">{formatTimer(countdown)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleSendCode(email)}
                  disabled={loading}
                  className="text-xs font-bold text-[#889E81] hover:underline cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend Code</span>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Verify & Enter Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="confirm-admin-otp-btn"
                  onClick={() => verifyOtpCode(otpDigits.join(''))}
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full py-3 bg-[#889E81] hover:bg-[#788E71] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating Chief Admin...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify &amp; Enter Chief Admin Portal</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                  className="w-full py-2 text-xs font-semibold text-[#7C7C6D] hover:text-[#5A5A40] text-center cursor-pointer transition-colors"
                >
                  &larr; Re-enter Chief Admin email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
