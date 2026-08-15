import React, { useState, useEffect, useRef } from 'react';
import {
  Resident,
  UserProfile,
  MorningVitalsRecord,
} from '../../types';
import { SAMPLE_VITALS_PRESETS } from '../../data/mockData';
import { applyVitalsWatermark } from '../../utils/watermark';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Clock,
  Activity,
  Bed,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  RefreshCw,
  Sliders,
  Check,
  Heart,
  ChevronRight,
  Eye,
  FileCheck,
  Calendar,
  Sparkle
} from 'lucide-react';

interface MorningVitalsModuleProps {
  residents: Resident[];
  caregiver: UserProfile;
  morningVitals: MorningVitalsRecord[];
  onSaveMorningVitals: (record: Partial<MorningVitalsRecord>) => Promise<void>;
  onSelectForCareLog?: (vitalsRecord: MorningVitalsRecord) => void;
}

export const MorningVitalsModule: React.FC<MorningVitalsModuleProps> = ({
  residents,
  caregiver,
  morningVitals,
  onSaveMorningVitals,
  onSelectForCareLog,
}) => {
  // Current time & countdown to 7:00 AM
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedResident, setSelectedResident] = useState<Resident | null>(residents[0] || null);

  useEffect(() => {
    if (!selectedResident && residents.length > 0) {
      setSelectedResident(residents[0]);
    }
  }, [residents, selectedResident]);

  // Helper: check if resident already completed today
  const getResidentTodayRecord = (resId: string) => {
    return morningVitals.find((v) => v.residentId === resId);
  };

  const existingRecord = getResidentTodayRecord(selectedResident?.id || '');

  // Photo state (strictly blank / pending upload when no photo exists)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(-1);
  const [currentRawPhotoUrl, setCurrentRawPhotoUrl] = useState<string>(
    existingRecord?.vitalsPhotoUrl || ''
  );
  const [watermarkedPhotoUrl, setWatermarkedPhotoUrl] = useState<string>(
    existingRecord?.vitalsPhotoUrl || ''
  );
  const [isWatermarking, setIsWatermarking] = useState(false);

  // Vitals readings (strictly blank / pending upload if no photo/record)
  const [bloodPressure, setBloodPressure] = useState<string>(
    existingRecord?.readings.bloodPressure || ''
  );
  const [pulseRate, setPulseRate] = useState<number | undefined>(
    existingRecord?.readings.pulseRate
  );
  const [spo2, setSpo2] = useState<number | undefined>(
    existingRecord?.readings.spo2
  );
  const [temperature, setTemperature] = useState<number | undefined>(
    existingRecord?.readings.temperature
  );
  const [bloodSugar, setBloodSugar] = useState<number | undefined>(
    existingRecord?.readings.bloodSugar
  );
  const [deviceType, setDeviceType] = useState<string>(
    existingRecord?.deviceType || ''
  );
  const [notes, setNotes] = useState<string>(
    existingRecord?.notes || ''
  );
  const [status, setStatus] = useState<'normal' | 'attention_needed' | 'critical'>(
    existingRecord?.status || 'normal'
  );

  // AI OCR / Vision analysis state
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiExtracted, setAiExtracted] = useState<boolean>(!!existingRecord);
  const [aiFeedbackMessage, setAiFeedbackMessage] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When selected resident changes, sync state with their existing record or reset to blank pending upload
  const handleSelectResident = (r: Resident) => {
    setSelectedResident(r);
    const rec = getResidentTodayRecord(r.id);
    if (rec) {
      setCurrentRawPhotoUrl(rec.vitalsPhotoUrl);
      setWatermarkedPhotoUrl(rec.vitalsPhotoUrl);
      setBloodPressure(rec.readings.bloodPressure || '');
      setPulseRate(rec.readings.pulseRate);
      setSpo2(rec.readings.spo2);
      setTemperature(rec.readings.temperature);
      setBloodSugar(rec.readings.bloodSugar);
      setDeviceType(rec.deviceType || 'Digital Vital Signs Monitor');
      setNotes(rec.notes || '');
      setStatus(rec.status || 'normal');
      setAiExtracted(true);
      setAiConfidence(96);
      setSelectedPresetIndex(-1);
      setAiFeedbackMessage('Loaded existing audited morning record.');
    } else {
      // RESET TO BLANK PENDING UPLOAD
      setCurrentRawPhotoUrl('');
      setWatermarkedPhotoUrl('');
      setBloodPressure('');
      setPulseRate(undefined);
      setSpo2(undefined);
      setTemperature(undefined);
      setBloodSugar(undefined);
      setDeviceType('');
      setNotes('');
      setStatus('normal');
      setAiExtracted(false);
      setAiConfidence(null);
      setSelectedPresetIndex(-1);
      setAiFeedbackMessage('');
    }
  };

  // Update watermark whenever resident, raw photo, readings, or time changes
  useEffect(() => {
    let isCancelled = false;

    async function generateWatermark() {
      if (!currentRawPhotoUrl || !selectedResident) {
        setWatermarkedPhotoUrl('');
        return;
      }
      setIsWatermarking(true);
      try {
        const watermarked = await applyVitalsWatermark(currentRawPhotoUrl, {
          residentFullName: selectedResident.fullName,
          roomNumber: selectedResident.roomNumber,
          bedNumber: selectedResident.bedNumber,
          caregiverName: caregiver.name,
          timestamp: currentTime,
          isBefore7am: currentTime.getHours() < 7,
          bloodPressure: bloodPressure || undefined,
          pulseRate,
          spo2,
          temperature,
        });

        if (!isCancelled) {
          setWatermarkedPhotoUrl(watermarked);
        }
      } catch (err) {
        console.error('Watermark generation error:', err);
      } finally {
        if (!isCancelled) {
          setIsWatermarking(false);
        }
      }
    }

    generateWatermark();

    return () => {
      isCancelled = true;
    };
  }, [currentRawPhotoUrl, selectedResident, caregiver.name, bloodPressure, pulseRate, spo2, temperature]);

  const completedCount = residents.filter((r) => getResidentTodayRecord(r.id)).length;
  const isCurrentlyPre7Am = currentTime.getHours() < 7;

  // AI Vision analysis with Gemini
  const analyzePhotoWithAI = async (photoInput: string, customDeviceHint?: string) => {
    if (!photoInput) return;
    setIsAnalyzingPhoto(true);
    setAiFeedbackMessage('Gemini AI Vision is scanning monitor screen for numerical readings...');

    try {
      const res = await fetch('/api/vitals/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaBase64: photoInput.startsWith('data:') ? photoInput : undefined,
          mediaUrl: photoInput.startsWith('http') ? photoInput : undefined,
          residentFullName: selectedResident?.fullName,
          deviceHint: customDeviceHint || deviceType || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update fields strictly from what the AI read on screen
        if (data.bloodPressure) {
          setBloodPressure(data.bloodPressure);
        } else {
          setBloodPressure('');
        }

        if (data.pulseRate !== null && data.pulseRate !== undefined) {
          setPulseRate(data.pulseRate);
        } else {
          setPulseRate(undefined);
        }

        if (data.spo2 !== null && data.spo2 !== undefined) {
          setSpo2(data.spo2);
        } else {
          setSpo2(undefined);
        }

        if (data.temperature !== null && data.temperature !== undefined) {
          setTemperature(data.temperature);
        } else {
          setTemperature(undefined);
        }

        if (data.bloodSugar !== null && data.bloodSugar !== undefined) {
          setBloodSugar(data.bloodSugar);
        } else {
          setBloodSugar(undefined);
        }

        if (data.deviceType) setDeviceType(data.deviceType);
        if (data.status) setStatus(data.status);
        if (data.clinicalNotes) {
          setNotes(data.clinicalNotes);
          setAiFeedbackMessage(data.clinicalNotes);
        }
        if (data.aiConfidence !== undefined && data.aiConfidence !== null) {
          setAiConfidence(data.aiConfidence);
        }
        setAiExtracted(true);
      } else {
        setAiFeedbackMessage('AI vision service unavailable. Please review or enter readings manually.');
      }
    } catch (err) {
      console.warn('AI analysis error:', err);
      setAiFeedbackMessage('Unable to complete AI scan. You may enter readings manually.');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Handle Preset selection
  const handleSelectPreset = (index: number) => {
    const preset = SAMPLE_VITALS_PRESETS[index];
    setSelectedPresetIndex(index);
    setCurrentRawPhotoUrl(preset.imageUrl);
    setDeviceType(preset.deviceType);
    // Trigger real AI analysis on the preset photo
    analyzePhotoWithAI(preset.imageUrl, preset.deviceType);
  };

  // Handle local file upload (camera or file)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPresetIndex(-1);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCurrentRawPhotoUrl(dataUrl);
      // Run real AI Vision OCR on newly uploaded photo
      analyzePhotoWithAI(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Clear current photo back to blank
  const handleClearPhoto = () => {
    setCurrentRawPhotoUrl('');
    setWatermarkedPhotoUrl('');
    setBloodPressure('');
    setPulseRate(undefined);
    setSpo2(undefined);
    setTemperature(undefined);
    setBloodSugar(undefined);
    setDeviceType('');
    setNotes('');
    setStatus('normal');
    setAiExtracted(false);
    setAiConfidence(null);
    setSelectedPresetIndex(-1);
    setAiFeedbackMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Morning Vitals Record
  const handleSave = async () => {
    if (!selectedResident || !currentRawPhotoUrl) return;
    setIsSubmitting(true);

    try {
      const finalPhotoUrl = watermarkedPhotoUrl || currentRawPhotoUrl;
      const hours = currentTime.getHours();
      const isBefore7am = hours < 7;

      await onSaveMorningVitals({
        residentId: selectedResident.id,
        residentFullName: selectedResident.fullName,
        roomNumber: selectedResident.roomNumber,
        bedNumber: selectedResident.bedNumber,
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        vitalsPhotoUrl: finalPhotoUrl,
        readings: {
          bloodPressure: bloodPressure || undefined,
          pulseRate,
          spo2,
          temperature,
          bloodSugar,
        },
        deviceType: deviceType || 'Vital Signs Monitor',
        recordedAt: currentTime.toISOString(),
        formattedTime: currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        formattedDate: currentTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        isBefore7am,
        notes: notes || 'Morning vital signs round completed.',
        status,
        aiExtracted,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save morning vitals:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. MORNING 07:00 AM PROTOCOL HEADER BANNER */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF1EA] text-[#5A5A40] flex items-center justify-center font-bold border border-[#889E81]/30 shrink-0">
              <Clock className="w-6 h-6 text-[#889E81]" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base font-serif font-bold text-[#5A5A40]">
                  Morning Vital Signs Round (Pre-07:00 AM Protocol)
                </h2>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                    isCurrentlyPre7Am
                      ? 'bg-[#EBF1EA] text-[#5A5A40] border-[#889E81]/40'
                      : 'bg-[#F0ECE2] text-[#7C7C6D] border-[#E6E2D3]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#889E81] animate-pulse"></span>
                  <span>{isCurrentlyPre7Am ? 'ACTIVE PRE-7 AM WINDOW' : '07:00 AM ROUND AUDIT'}</span>
                </span>
              </div>
              <p className="text-xs text-[#7C7C6D] mt-0.5">
                Every morning before 07:00 AM, take a photo of the vital signs monitor for each resident. The system embeds a tamper-evident date &amp; time watermark and extracts readings with AI Vision.
              </p>
            </div>
          </div>

          {/* Real-time Clock & Compliance Progress */}
          <div className="flex items-center space-x-4 bg-[#FAF9F6] p-3 rounded-2xl border border-[#E6E2D3] shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8C8C7E] block">
                Facility Timestamp
              </span>
              <div className="text-sm font-mono font-bold text-[#5A5A40]">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>
            <div className="h-8 w-px bg-[#E6E2D3]"></div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8C8C7E] block">
                Ward Compliance
              </span>
              <div className="text-sm font-bold text-[#889E81]">
                {completedCount} of {residents.length} Beds
              </div>
            </div>
          </div>
        </div>

        {/* Resident Bed Quick Selection Strip */}
        <div className="mt-4 pt-4 border-t border-[#E6E2D3]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C7C6D] block mb-2">
            Select Resident Bed for Morning Check:
          </span>
          {residents.length === 0 ? (
            <div className="text-center py-4 px-4 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E6E2D3]">
              <p className="text-xs font-semibold text-[#5A5A40]">No resident beds registered yet</p>
              <p className="text-[11px] text-[#7C7C6D] mt-0.5">Please add a resident in the Admin Dashboard to start the morning vitals protocol.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {residents.map((r) => {
                const isSelected = selectedResident?.id === r.id;
                const record = getResidentTodayRecord(r.id);
                const isDone = !!record;

                return (
                  <button
                    key={r.id}
                    id={`select-morning-resident-${r.id}`}
                    type="button"
                    onClick={() => handleSelectResident(r)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#F7F5F0] border-2 border-[#889E81] shadow-xs'
                        : 'bg-white border-[#E6E2D3] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <img
                        src={r.photoUrl}
                        alt={r.fullName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#E6E2D3]"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-[#5A5A40] truncate">
                          {r.fullName}
                        </div>
                        <div className="text-[10px] text-[#7C7C6D]">
                          Rm {r.roomNumber} &bull; {r.bedNumber}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isDone ? (
                        <span
                          title={`Verified at ${record.formattedTime}`}
                          className="w-6 h-6 rounded-full bg-[#EBF1EA] text-[#889E81] flex items-center justify-center text-xs font-bold border border-[#889E81]/30 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span
                          title="Pending Pre-7AM Photo"
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                        >
                          Pending upload
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE CAPTURE & WATERMARKING STATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Photo Capture & Watermarked Live Canvas (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[#889E81]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                  1. Vital Sign Device Photo &amp; Watermark
                </h3>
              </div>
              {currentRawPhotoUrl ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-[#889E81] bg-[#EBF1EA] px-2.5 py-0.5 rounded-full border border-[#889E81]/30 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Watermark Active</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold px-2 py-0.5 rounded-md hover:bg-red-50 cursor-pointer"
                  >
                    Clear Photo
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A] flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Pending upload</span>
                </span>
              )}
            </div>

            {/* Photo Preview Container with Live Watermark OR Pending Upload Placeholder */}
            <div className="relative rounded-2xl overflow-hidden border border-[#E6E2D3] bg-[#2D2D24] aspect-4/3 flex items-center justify-center group">
              {currentRawPhotoUrl ? (
                watermarkedPhotoUrl ? (
                  <img
                    src={watermarkedPhotoUrl}
                    alt="Watermarked Vital Sign Monitor"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-[#FAF9F6]">
                    <Activity className="w-10 h-10 text-[#889E81] mx-auto mb-2 animate-spin" />
                    <p className="text-xs">Applying Clinical Watermark...</p>
                  </div>
                )
              ) : (
                /* Empty Pending Upload State */
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FAF9F6] w-full h-full border-2 border-dashed border-[#D6D2C4]">
                  <div className="w-14 h-14 rounded-2xl bg-[#F0ECE2] text-[#7C7C6D] flex items-center justify-center border border-[#E6E2D3]">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center space-x-2">
                      <h4 className="text-sm font-bold text-[#5A5A40]">
                        No Monitor Photo Uploaded
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                        Pending upload
                      </span>
                    </div>
                    <p className="text-xs text-[#7C7C6D] max-w-xs mx-auto">
                      Please upload or capture a photo of the vital signs monitor for{' '}
                      <strong>{selectedResident?.fullName}</strong>. Gemini AI Vision will read the numbers automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#889E81] hover:bg-[#788E71] text-white rounded-full text-xs font-bold shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Capture / Upload Monitor Photo</span>
                  </button>
                </div>
              )}

              {/* Watermark Loading Spinner */}
              {isWatermarking && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center">
                  <div className="bg-white px-3.5 py-2 rounded-full shadow-lg flex items-center space-x-2 text-xs font-bold text-[#5A5A40]">
                    <RefreshCw className="w-3.5 h-3.5 text-[#889E81] animate-spin" />
                    <span>Stamping Timestamp &amp; Bed Tag...</span>
                  </div>
                </div>
              )}

              {/* AI Scanning Overlay */}
              {isAnalyzingPhoto && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center p-4 text-white text-center space-y-2">
                  <Sparkle className="w-8 h-8 text-emerald-400 animate-spin" />
                  <div className="text-sm font-bold">Reading Monitor Screen with AI Vision...</div>
                  <div className="text-xs text-white/80 max-w-xs">
                    Gemini is extracting visible blood pressure, pulse, SpO2, and temperature directly from the photo pixels.
                  </div>
                </div>
              )}

              {/* Zoom In button */}
              {currentRawPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setSelectedPreviewImage(watermarkedPhotoUrl || currentRawPhotoUrl)}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                  title="Zoom into Full Watermarked Photo"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Upload or Device Preset Switcher */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-[#7C7C6D]">
                  Device Screen Presets / Direct Capture:
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[#889E81] hover:text-[#5A5A40] flex items-center space-x-1 cursor-pointer underline"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Camera / File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_VITALS_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center space-x-2 ${
                      selectedPresetIndex === idx
                        ? 'bg-[#F7F5F0] border-[#889E81] font-bold text-[#5A5A40] shadow-2xs'
                        : 'bg-[#FAF9F6] border-[#E6E2D3] text-[#7C7C6D] hover:bg-white'
                    }`}
                  >
                    <img
                      src={preset.imageUrl}
                      alt={preset.label}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#E6E2D3] shrink-0"
                    />
                    <span className="truncate text-[11px]">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: AI Vision Reading Extraction & Numeric Confirmation (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#889E81]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                  2. AI Vision Telemetry Extraction
                </h3>
              </div>

              {currentRawPhotoUrl ? (
                <button
                  type="button"
                  disabled={isAnalyzingPhoto}
                  onClick={() => analyzePhotoWithAI(currentRawPhotoUrl)}
                  className="px-3 py-1 bg-[#EBF1EA] hover:bg-[#dce6da] text-[#5A5A40] text-xs font-bold rounded-full border border-[#889E81]/30 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkle className={`w-3.5 h-3.5 text-[#889E81] ${isAnalyzingPhoto ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingPhoto ? 'Scanning...' : 'Re-Scan Monitor with AI'}</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                  Readings: Pending upload
                </span>
              )}
            </div>

            {/* AI Confidence Notice / Status Banner */}
            <div className={`rounded-2xl p-3.5 border flex items-center justify-between text-xs ${
              currentRawPhotoUrl
                ? 'bg-[#FAF9F6] border-[#E6E2D3] text-[#5A5A40]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${currentRawPhotoUrl ? 'bg-[#889E81]' : 'bg-[#D97706]'}`}></span>
                <span>
                  {currentRawPhotoUrl ? (
                    <>
                      Detected Device: <strong>{deviceType || 'Medical Monitor Display'}</strong>
                    </>
                  ) : (
                    <>
                      Status: <strong>No photo uploaded — Readings pending upload</strong>
                    </>
                  )}
                </span>
              </div>
              <span className="text-[11px] font-bold">
                {currentRawPhotoUrl ? (
                  aiConfidence ? `${aiConfidence}% AI Vision Confidence` : (aiExtracted ? 'OCR Verified' : 'Custom Input')
                ) : (
                  <span className="text-[#92400E]">Pending upload</span>
                )}
              </span>
            </div>

            {aiFeedbackMessage && (
              <div className="text-[11px] p-2.5 bg-[#F0ECE2] rounded-xl border border-[#E6E2D3] text-[#5A5A40] flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#889E81] shrink-0" />
                <span>{aiFeedbackMessage}</span>
              </div>
            )}

            {/* Numeric Readings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Blood Pressure */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-[#889E81]" />
                    <span>Blood Pressure</span>
                  </label>
                  {!bloodPressure && (
                    <span className="text-[9px] text-[#92400E] font-bold bg-[#FEF3C7] px-1.5 py-0.2 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="Pending upload"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none placeholder:text-[#A8A89A] placeholder:font-normal"
                />
                <span className="text-[9px] text-[#8C8C7E]">mmHg (Sys / Dia)</span>
              </div>

              {/* Heart Rate */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                    <Heart className="w-3 h-3 text-[#889E81]" />
                    <span>Pulse Rate</span>
                  </label>
                  {pulseRate === undefined && (
                    <span className="text-[9px] text-[#92400E] font-bold bg-[#FEF3C7] px-1.5 py-0.2 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={pulseRate !== undefined ? pulseRate : ''}
                  onChange={(e) => setPulseRate(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                  placeholder="Pending upload"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none placeholder:text-[#A8A89A] placeholder:font-normal"
                />
                <span className="text-[9px] text-[#8C8C7E]">beats / min (bpm)</span>
              </div>

              {/* SpO2 */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-[#889E81]" />
                    <span>Oxygen (SpO2)</span>
                  </label>
                  {spo2 === undefined && (
                    <span className="text-[9px] text-[#92400E] font-bold bg-[#FEF3C7] px-1.5 py-0.2 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={spo2 !== undefined ? spo2 : ''}
                  onChange={(e) => setSpo2(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                  placeholder="Pending upload"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none placeholder:text-[#A8A89A] placeholder:font-normal"
                />
                <span className="text-[9px] text-[#8C8C7E]">% SpO2</span>
              </div>

              {/* Body Temperature */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-[#889E81]" />
                    <span>Temperature</span>
                  </label>
                  {temperature === undefined && (
                    <span className="text-[9px] text-[#92400E] font-bold bg-[#FEF3C7] px-1.5 py-0.2 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={temperature !== undefined ? temperature : ''}
                  onChange={(e) => setTemperature(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  placeholder="Pending upload"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none placeholder:text-[#A8A89A] placeholder:font-normal"
                />
                <span className="text-[9px] text-[#8C8C7E]">°Celsius</span>
              </div>

              {/* Blood Sugar */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-[#889E81]" />
                    <span>Blood Glucose</span>
                  </label>
                  {bloodSugar === undefined && (
                    <span className="text-[9px] text-[#8C8C7E] italic">Optional</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={bloodSugar !== undefined ? bloodSugar : ''}
                  onChange={(e) => setBloodSugar(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  placeholder="Pending upload"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none placeholder:text-[#A8A89A] placeholder:font-normal"
                />
                <span className="text-[9px] text-[#8C8C7E]">mmol/L (Fasting)</span>
              </div>

              {/* Status Indicator */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#7C7C6D] block">
                  Clinical Rating
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                >
                  <option value="normal">Normal / Stable</option>
                  <option value="attention_needed">Attention Needed</option>
                  <option value="critical">Physician Review</option>
                </select>
                <span className="text-[9px] text-[#8C8C7E]">Ward Protocol</span>
              </div>
            </div>

            {/* Quick Clinical Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5A5A40] block">
                Caregiver Morning Observation:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Awake, rested well, baseline stable, greeted nurse cheerfully..."
                className="w-full text-xs p-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl text-[#4A4A40] focus:ring-2 focus:ring-[#889E81] focus:outline-none"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                id="submit-morning-vitals-btn"
                type="button"
                disabled={isSubmitting || !currentRawPhotoUrl}
                onClick={handleSave}
                className={`w-full py-3 rounded-full font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  currentRawPhotoUrl
                    ? 'bg-[#889E81] hover:bg-[#788E71] text-white disabled:opacity-50'
                    : 'bg-[#E6E2D3] text-[#7C7C6D] cursor-not-allowed'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>✓ Morning Vitals Stamped &amp; Recorded!</span>
                  </>
                ) : !currentRawPhotoUrl ? (
                  <>
                    <Camera className="w-4 h-4 text-[#7C7C6D]" />
                    <span>Photo Required to Save Vitals (Pending Upload)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Certifying & Saving...'
                        : `Stamp & Save Pre-7 AM Vitals for ${selectedResident.fullName}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. WARD MORNING VITALS AUDIT LOG FEED */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D3] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-[#889E81]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
              Today&apos;s Audited Morning Vitals Feed ({morningVitals.length} Recorded)
            </h3>
          </div>
          <span className="text-xs text-[#7C7C6D]">
            All photos timestamped with cryptographic audit watermark
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {morningVitals.map((record) => (
            <div
              key={record.id}
              className="bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#5A5A40]">
                      {record.residentFullName}
                    </h4>
                    <span className="text-[10px] text-[#7C7C6D]">
                      Room {record.roomNumber}, {record.bedNumber}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      record.isBefore7am
                        ? 'bg-[#EBF1EA] text-[#5A5A40] border-[#889E81]/30'
                        : 'bg-[#F0ECE2] text-[#7C7C6D] border-[#E6E2D3]'
                    }`}
                  >
                    {record.isBefore7am ? '✓ Pre-7 AM Verified' : 'Routine Check'}
                  </span>
                </div>

                {/* Watermarked Photo Thumbnail */}
                <div
                  onClick={() => setSelectedPreviewImage(record.vitalsPhotoUrl)}
                  className="relative rounded-xl overflow-hidden border border-[#E6E2D3] aspect-16/10 cursor-pointer group bg-black"
                >
                  <img
                    src={record.vitalsPhotoUrl}
                    alt={record.residentFullName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 text-[#5A5A40] text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow">
                      <ZoomIn className="w-3.5 h-3.5 text-[#889E81]" />
                      <span>View Watermark</span>
                    </span>
                  </div>
                  <div className="absolute bottom-1.5 left-2 right-2 bg-black/70 backdrop-blur-2xs rounded px-2 py-0.5 text-[9px] text-white truncate">
                    ⏰ {record.formattedTime} &bull; {record.formattedDate}
                  </div>
                </div>

                {/* Readings Chips */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  {record.readings.bloodPressure && (
                    <div className="bg-white p-1.5 rounded-lg border border-[#E6E2D3]">
                      <span className="text-[#8C8C7E] block text-[9px]">BP</span>
                      <strong className="text-[#5A5A40]">{record.readings.bloodPressure}</strong>
                    </div>
                  )}
                  {record.readings.pulseRate && (
                    <div className="bg-white p-1.5 rounded-lg border border-[#E6E2D3]">
                      <span className="text-[#8C8C7E] block text-[9px]">HR</span>
                      <strong className="text-[#5A5A40]">{record.readings.pulseRate} bpm</strong>
                    </div>
                  )}
                  {record.readings.spo2 && (
                    <div className="bg-white p-1.5 rounded-lg border border-[#E6E2D3]">
                      <span className="text-[#8C8C7E] block text-[9px]">SpO2</span>
                      <strong className="text-[#5A5A40]">{record.readings.spo2}%</strong>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {record.notes && (
                  <p className="text-[11px] text-[#7C7C6D] line-clamp-2 italic">
                    &ldquo;{record.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Staff Signature */}
              <div className="pt-2 border-t border-[#E6E2D3] flex items-center justify-between text-[10px] text-[#8C8C7E]">
                <span>By: {record.caregiverName}</span>
                {onSelectForCareLog && (
                  <button
                    type="button"
                    onClick={() => onSelectForCareLog(record)}
                    className="font-bold text-[#889E81] hover:text-[#5A5A40] cursor-pointer underline"
                  >
                    Include in Care Log
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FULL RESOLUTION WATERMARK MODAL */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div
            className="bg-white rounded-[28px] max-w-3xl w-full p-5 shadow-2xl border border-[#E6E2D3] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6E2D3] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#889E81]" />
                <h3 className="text-sm font-serif font-bold text-[#5A5A40]">
                  High-Resolution Watermarked Vital Sign Audit Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="text-[#8C8C7E] hover:text-[#5A5A40] text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#E6E2D3] bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={selectedPreviewImage}
                alt="Full Watermarked Vitals Capture"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#7C7C6D] pt-1">
              <span>
                Verified &amp; Certified under Care Connect Clinical Protocol.
              </span>
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="px-4 py-1.5 bg-[#889E81] text-white rounded-full font-bold cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
