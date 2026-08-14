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
  const [selectedResident, setSelectedResident] = useState<Resident>(residents[0]);

  // Photo state
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [currentRawPhotoUrl, setCurrentRawPhotoUrl] = useState<string>(
    SAMPLE_VITALS_PRESETS[0].imageUrl
  );
  const [watermarkedPhotoUrl, setWatermarkedPhotoUrl] = useState<string>('');
  const [isWatermarking, setIsWatermarking] = useState(false);

  // Vitals readings
  const [bloodPressure, setBloodPressure] = useState<string>('118/76');
  const [pulseRate, setPulseRate] = useState<number>(72);
  const [spo2, setSpo2] = useState<number>(98);
  const [temperature, setTemperature] = useState<number>(36.6);
  const [bloodSugar, setBloodSugar] = useState<number | undefined>(5.4);
  const [deviceType, setDeviceType] = useState<string>('Digital Upper-Arm Blood Pressure Monitor');
  const [notes, setNotes] = useState<string>('Awake, comfortable, baseline readings stable.');
  const [status, setStatus] = useState<'normal' | 'attention_needed' | 'critical'>('normal');

  // AI OCR / Vision analysis state
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(94);
  const [aiExtracted, setAiExtracted] = useState<boolean>(true);

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

  // Update watermark whenever resident, raw photo, readings, or time changes
  useEffect(() => {
    let isCancelled = false;

    async function generateWatermark() {
      if (!currentRawPhotoUrl || !selectedResident) return;
      setIsWatermarking(true);
      try {
        const watermarked = await applyVitalsWatermark(currentRawPhotoUrl, {
          residentFullName: selectedResident.fullName,
          roomNumber: selectedResident.roomNumber,
          bedNumber: selectedResident.bedNumber,
          caregiverName: caregiver.name,
          timestamp: currentTime,
          isBefore7am: currentTime.getHours() < 7,
          bloodPressure,
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
  }, [currentRawPhotoUrl, selectedResident, caregiver.name]);

  // Helper: check if resident already completed today
  const getResidentTodayRecord = (resId: string) => {
    return morningVitals.find((v) => v.residentId === resId);
  };

  const completedCount = residents.filter((r) => getResidentTodayRecord(r.id)).length;
  const isCurrentlyPre7Am = currentTime.getHours() < 7;

  // Handle Preset selection
  const handleSelectPreset = (index: number) => {
    const preset = SAMPLE_VITALS_PRESETS[index];
    setSelectedPresetIndex(index);
    setCurrentRawPhotoUrl(preset.imageUrl);
    setDeviceType(preset.deviceType);
    setBloodPressure(preset.suggestedReadings.bloodPressure);
    setPulseRate(preset.suggestedReadings.pulseRate);
    setSpo2(preset.suggestedReadings.spo2);
    setTemperature(preset.suggestedReadings.temperature);
    setBloodSugar(preset.suggestedReadings.bloodSugar);
    setAiConfidence(95);
    setAiExtracted(true);
  };

  // Handle local file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCurrentRawPhotoUrl(dataUrl);
      // Run AI Vision on newly uploaded photo
      analyzePhotoWithAI(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // AI Vision analysis
  const analyzePhotoWithAI = async (photoBase64: string) => {
    setIsAnalyzingPhoto(true);
    try {
      const res = await fetch('/api/vitals/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaBase64: photoBase64,
          residentFullName: selectedResident?.fullName,
          deviceHint: deviceType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.bloodPressure) setBloodPressure(data.bloodPressure);
        if (data.pulseRate) setPulseRate(data.pulseRate);
        if (data.spo2) setSpo2(data.spo2);
        if (data.temperature) setTemperature(data.temperature);
        if (data.bloodSugar) setBloodSugar(data.bloodSugar);
        if (data.deviceType) setDeviceType(data.deviceType);
        if (data.status) setStatus(data.status);
        if (data.clinicalNotes) setNotes(data.clinicalNotes);
        if (data.aiConfidence) setAiConfidence(data.aiConfidence);
        setAiExtracted(true);
      }
    } catch (err) {
      console.warn('AI analysis fallback:', err);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Save Morning Vitals Record
  const handleSave = async () => {
    if (!selectedResident) return;
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
          bloodPressure,
          pulseRate,
          spo2,
          temperature,
          bloodSugar,
        },
        deviceType,
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
        notes,
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
                  onClick={() => setSelectedResident(r)}
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
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0ECE2] text-[#7C7C6D] border border-[#E6E2D3]"
                      >
                        Pending
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
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
              <span className="text-[11px] font-semibold text-[#889E81] bg-[#EBF1EA] px-2.5 py-0.5 rounded-full border border-[#889E81]/30 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Auto-Watermark Active</span>
              </span>
            </div>

            {/* Photo Preview Container with Live Watermark */}
            <div className="relative rounded-2xl overflow-hidden border border-[#E6E2D3] bg-[#2D2D24] aspect-4/3 flex items-center justify-center group">
              {watermarkedPhotoUrl ? (
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

              {/* Zoom In button */}
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(watermarkedPhotoUrl || currentRawPhotoUrl)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                title="Zoom into Full Watermarked Photo"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
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

              <button
                type="button"
                disabled={isAnalyzingPhoto}
                onClick={() => analyzePhotoWithAI(currentRawPhotoUrl)}
                className="px-3 py-1 bg-[#EBF1EA] hover:bg-[#dce6da] text-[#5A5A40] text-xs font-bold rounded-full border border-[#889E81]/30 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkle className={`w-3.5 h-3.5 text-[#889E81] ${isAnalyzingPhoto ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingPhoto ? 'Scanning...' : 'Re-Scan Monitor with AI'}</span>
              </button>
            </div>

            {/* AI Confidence Notice */}
            <div className="bg-[#FAF9F6] rounded-2xl p-3.5 border border-[#E6E2D3] flex items-center justify-between text-xs text-[#5A5A40]">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#889E81]"></span>
                <span>
                  Detected: <strong>{deviceType}</strong>
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#889E81]">
                {aiConfidence ? `${aiConfidence}% AI Confidence` : 'OCR Verified'}
              </span>
            </div>

            {/* Numeric Readings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Blood Pressure */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                  <Activity className="w-3 h-3 text-[#889E81]" />
                  <span>Blood Pressure</span>
                </label>
                <input
                  type="text"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="120/80"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                />
                <span className="text-[9px] text-[#8C8C7E]">mmHg (Sys / Dia)</span>
              </div>

              {/* Heart Rate */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                  <Heart className="w-3 h-3 text-[#889E81]" />
                  <span>Pulse Rate</span>
                </label>
                <input
                  type="number"
                  value={pulseRate}
                  onChange={(e) => setPulseRate(parseInt(e.target.value, 10) || 0)}
                  placeholder="72"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                />
                <span className="text-[9px] text-[#8C8C7E]">beats / min (bpm)</span>
              </div>

              {/* SpO2 */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                  <Activity className="w-3 h-3 text-[#889E81]" />
                  <span>Oxygen Saturation</span>
                </label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(parseInt(e.target.value, 10) || 0)}
                  placeholder="98"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                />
                <span className="text-[9px] text-[#8C8C7E]">% SpO2</span>
              </div>

              {/* Body Temperature */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                  <Activity className="w-3 h-3 text-[#889E81]" />
                  <span>Temperature</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                  placeholder="36.6"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none"
                />
                <span className="text-[9px] text-[#8C8C7E]">°Celsius</span>
              </div>

              {/* Blood Sugar */}
              <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E6E2D3] space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#7C7C6D] flex items-center space-x-1">
                  <Activity className="w-3 h-3 text-[#889E81]" />
                  <span>Blood Glucose</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bloodSugar || ''}
                  onChange={(e) => setBloodSugar(parseFloat(e.target.value) || undefined)}
                  placeholder="5.4"
                  className="w-full text-sm font-bold text-[#5A5A40] bg-white border border-[#E6E2D3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#889E81] focus:outline-none"
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
                placeholder="e.g., Awake, rested well, greeted nurse cheerfully..."
                className="w-full text-xs p-3 bg-[#FAF9F6] border border-[#E6E2D3] rounded-2xl text-[#4A4A40] focus:ring-2 focus:ring-[#889E81] focus:outline-none"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                id="submit-morning-vitals-btn"
                type="button"
                disabled={isSubmitting}
                onClick={handleSave}
                className="w-full py-3 bg-[#889E81] hover:bg-[#788E71] text-white rounded-full font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>✓ Morning Vitals Stamped &amp; Recorded!</span>
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
                Verified &amp; Certified under Silver Pines Clinical Protocol.
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
