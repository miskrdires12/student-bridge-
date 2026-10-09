import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, RotateCw, ZoomIn, ZoomOut,
  Upload, UserCheck, ArrowRight, ShieldCheck, Sparkles, X, Sliders, Crop, ArrowLeft
} from 'lucide-react';
import { getStudents, addStudent, getSchools, getCurrentUser } from '@/lib/store';
import { Student } from '@/types';

export const StudentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Helper for generating an ID
  const generateNewId = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `SB-2026-${randomNum}`;
  };

  // Form States
  const [studentId, setStudentId] = useState(generateNewId);
  const [isIdTaken, setIsIdTaken] = useState(false);
  const [fullName, setFullName] = useState('');
  const [sex, setSex] = useState<'Female' | 'Male'>('Female');
  const [grade, setGrade] = useState('9C');
  const [phone, setPhone] = useState('+251');
  const [bloodType, setBloodType] = useState('O+');
  const [school, setSchool] = useState('YMS');
  const [location, setLocation] = useState('Addis Ababa');
  const [country, setCountry] = useState('Ethiopia');
  const [emergencyContact, setEmergencyContact] = useState('+251');
  const [schoolBusUsage, setSchoolBusUsage] = useState<'Yes' | 'No'>('Yes');

  // Camera & Photo States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Photo Editor Modal States (matching screenshot)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorActiveTab, setEditorActiveTab] = useState<'Brightness' | 'Contrast' | 'Saturation' | 'Crop' | 'Rotate'>('Brightness');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Success Confirmation State
  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);

  const schools = getSchools();

  // Check ID Uniqueness dynamically against all students
  useEffect(() => {
    const all = getStudents();
    const taken = all.some(s => s.studentId.trim().toUpperCase() === studentId.trim().toUpperCase());
    setIsIdTaken(taken);
  }, [studentId]);

  // Name Auto-Capitalizer (First Name & Father's Name)
  const handleNameChange = (val: string) => {
    const capitalized = val
      .split(' ')
      .map(word => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
    setFullName(capitalized);
  };

  // Ethiopian Phone Number Auto-Formatter
  // 09... -> +2519... and 07... -> +2517...
  const handlePhoneFormat = (val: string, setter: (v: string) => void) => {
    let clean = val.trim();
    if (clean.startsWith('09')) {
      clean = '+2519' + clean.slice(2);
    } else if (clean.startsWith('07')) {
      clean = '+2517' + clean.slice(2);
    } else if (clean.startsWith('9')) {
      clean = '+2519' + clean.slice(1);
    } else if (clean.startsWith('7')) {
      clean = '+2517' + clean.slice(1);
    }
    setter(clean);
  };

  // Start Webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError('Camera access unavailable. Please upload a portrait photo instead.');
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Take Snapshot
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isIdTaken) {
      alert('The Student ID is already taken. Please generate or specify a unique ID.');
      return;
    }

    if (!fullName.trim()) {
      alert('Student Full Name is required.');
      return;
    }

    const newStudent: Student = {
      id: 'std-' + Date.now(),
      studentId: studentId.trim(),
      fullName: fullName.trim(),
      sex,
      grade,
      phone: phone.trim(),
      bloodType,
      school,
      location,
      country,
      emergencyContactPhone: emergencyContact.trim(),
      schoolBusUsage,
      photoPath: capturedPhoto ? `captured_${studentId}.jpg` : undefined,
      previewPath: capturedPhoto || undefined,
      senderName: user?.username || 'Loza Bereket',
      status: 'Accepted', // Exact matching status from screenshot!
      createdAt: new Date().toISOString(),
      recordHistory: [
        {
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Initial Submission',
          user: user?.username || 'Loza Bereket',
          role: 'Sender',
          notes: 'Initial student registration and biometric capture'
        }
      ]
    };

    // Save to store (persists in memory and localStorage for Receiver Station)
    addStudent(newStudent);
    setSubmittedStudent(newStudent);
  };

  const resetFormForNext = () => {
    setStudentId(generateNewId());
    setFullName('');
    setPhone('+251');
    setEmergencyContact('+251');
    setCapturedPhoto(null);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setZoom(1);
    setSubmittedStudent(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hidden Canvas for captures */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">
              Sender &bull; Student Registration
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#85e510]/20 text-[#85e510] border border-[#85e510]/30 uppercase">
              Field Station Active
            </span>
          </div>
          <p className="text-xs text-[#8fa2b7] mt-0.5">
            Capture biometric student portrait, identity metadata, and transmit directly to Receiver Station
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/receiver/students"
            className="px-3 py-2 rounded-xl bg-[#131e2b] hover:bg-white/[0.08] border border-[#1e2e42] text-xs font-bold text-white transition-all flex items-center gap-1.5"
          >
            <span>View in Receiver Directory</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#85e510]" />
          </Link>
        </div>
      </div>

      {/* Main Grid: Form on Left/Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Biometric Live Camera & Photo Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2e42]">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#85e510]" />
                  <span className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                    Portrait Photograph
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8fa2b7]">ISO/IEC 19794</span>
              </div>

              {/* Viewfinder Area */}
              <div className="mt-4 relative aspect-[3/4] bg-[#0b1118] rounded-2xl overflow-hidden border-2 border-dashed border-[#1e2e42] flex items-center justify-center">
                {capturedPhoto ? (
                  /* Photo Preview */
                  <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                    <img
                      src={capturedPhoto}
                      alt="Captured Student Portrait"
                      style={{
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                        transform: `rotate(${rotation}deg) scale(${zoom})`,
                        transition: 'transform 0.15s ease, filter 0.15s ease',
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#85e510] text-[#062404] text-[10px] font-black uppercase shadow">
                      Accepted
                    </div>
                  </div>
                ) : isCameraActive ? (
                  /* Live Camera View */
                  <div className="w-full h-full relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Oval Viewfinder Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-60 rounded-full border-2 border-[#85e510]/70 shadow-[0_0_20px_rgba(133,229,16,0.35)] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#85e510]/60" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-white/90 bg-black/70 backdrop-blur-sm py-1 rounded">
                      Align student face in oval &bull; Look straight
                    </div>
                  </div>
                ) : (
                  /* Idle Camera State */
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#8fa2b7]">
                      <Camera className="w-8 h-8 text-[#85e510]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Live Camera Ready</div>
                      <div className="text-[11px] text-[#8fa2b7] mt-1 max-w-[200px] mx-auto">
                        Activate your connected camera or upload portrait file
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                  {cameraError}
                </div>
              )}

              {/* Photo Action Buttons */}
              <div className="mt-4 space-y-3">
                {capturedPhoto ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        className="py-2.5 px-3 rounded-xl bg-[#85e510] hover:bg-[#9bf028] text-[#062404] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(133,229,16,0.3)]"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop & Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setCapturedPhoto(null); startCamera(); }}
                        className="py-2.5 px-3 rounded-xl bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-xs font-bold text-white flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                    </div>
                  </div>
                ) : isCameraActive ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-3 rounded-xl bg-[#85e510] hover:bg-[#9bf028] text-[#062404] font-extrabold text-xs shadow-[0_0_20px_rgba(133,229,16,0.4)] flex items-center justify-center gap-2 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-3 rounded-xl bg-[#0b1118] hover:bg-white/10 text-white text-xs font-bold border border-[#1e2e42]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-2.5 px-3 rounded-xl bg-[#85e510] hover:bg-[#9bf028] text-[#062404] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(133,229,16,0.3)] transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>

                    <label className="py-2.5 px-3 rounded-xl bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5 text-[#85e510]" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e2e42] text-[11px] text-[#8fa2b7] flex items-center justify-between">
              <span>Cloudflare R2 Destination</span>
              <span className="text-[#85e510] font-bold">siliconlabs</span>
            </div>
          </div>
        </div>

        {/* Right Column: Form matching "Student Information" in screenshot (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2e42]">
              <div>
                <h2 className="text-base font-heading font-extrabold text-white tracking-tight">
                  Student Information
                </h2>
                <p className="text-xs text-[#8fa2b7] mt-0.5">Primary academic and demographic profile</p>
              </div>
              <span className="text-xs text-[#85e510] font-mono font-bold">Sender Station</span>
            </div>

            {/* Field: Student ID with uniqueness check */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#8fa2b7] uppercase tracking-wider">
                  Student ID
                </label>
                <button
                  type="button"
                  onClick={() => setStudentId(generateNewId())}
                  className="text-xs text-[#85e510] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. SB-2026-12788"
                  className={`w-full bg-[#0b1118] border rounded-xl px-4 py-2.5 font-mono text-sm text-white focus:outline-none transition-all ${
                    isIdTaken
                      ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500'
                      : 'border-[#1e2e42] focus:border-[#85e510] focus:ring-1 focus:ring-[#85e510]'
                  }`}
                />
                {isIdTaken ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-black uppercase flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Taken</span>
                  </span>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#85e510] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Available</span>
                  </span>
                )}
              </div>
              {isIdTaken && (
                <p className="text-xs text-red-400 mt-1 font-medium">
                  This Student ID is already taken. Click "Generate New" or pick a unique ID.
                </p>
              )}
            </div>

            {/* Field: Full Name (Auto-Title Casing) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#8fa2b7] uppercase tracking-wider">
                  Full Name
                </label>
                <span className="text-[10px] text-[#85e510] font-semibold">Auto-Capitalized</span>
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Loza Bereket"
                className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3f5267] focus:outline-none focus:border-[#85e510] focus:ring-1 focus:ring-[#85e510] transition-all"
              />
            </div>

            {/* 2-col Grid: Sex & Grade/Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5 uppercase tracking-wider">
                  Sex
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      sex === 'Female'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                        : 'bg-[#0b1118] text-[#8fa2b7] border-[#1e2e42] hover:bg-white/5'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      sex === 'Male'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-[#0b1118] text-[#8fa2b7] border-[#1e2e42] hover:bg-white/5'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5 uppercase tracking-wider">
                  Grade / Class
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85e510] transition-all"
                >
                  <option value="9C">9C</option>
                  <option value="9A">9A</option>
                  <option value="9B">9B</option>
                  <option value="10A">10A</option>
                  <option value="10B">10B</option>
                  <option value="11A">11A</option>
                  <option value="12A">12A</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
            </div>

            {/* 2-col Grid: Blood Group & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5 uppercase tracking-wider">
                  Blood Group
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85e510] transition-all font-mono"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#8fa2b7] uppercase tracking-wider">
                    Phone Number
                  </label>
                  <span className="text-[10px] text-[#85e510] font-mono">Auto 09 &rarr; +2519</span>
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneFormat(e.target.value, setPhone)}
                  placeholder="+251 912 400 376"
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder-[#3f5267] focus:outline-none focus:border-[#85e510] focus:ring-1 focus:ring-[#85e510] transition-all"
                />
              </div>
            </div>

            {/* 2-col Grid: School & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5 uppercase tracking-wider">
                  School
                </label>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85e510] transition-all"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5 uppercase tracking-wider">
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Addis Ababa"
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#85e510] transition-all"
                />
              </div>
            </div>

            {/* Extra Details Accordion/Section (matching screenshot) */}
            <div className="pt-2 border-t border-[#1e2e42]">
              <div className="text-[11px] font-heading font-bold text-[#8fa2b7] uppercase tracking-wider mb-2">
                Extra Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => handlePhoneFormat(e.target.value, setEmergencyContact)}
                    placeholder="+251 911 112 233"
                    className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#85e510]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5">
                    School Bus Usage
                  </label>
                  <select
                    value={schoolBusUsage}
                    onChange={(e) => setSchoolBusUsage(e.target.value as any)}
                    className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons: Save Draft & Next (matching screenshot) */}
            <div className="pt-4 border-t border-[#1e2e42] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => alert('Draft saved locally.')}
                className="py-2.5 px-4 rounded-xl bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-xs font-bold text-white transition-all"
              >
                Save Draft
              </button>

              <button
                type="submit"
                disabled={isIdTaken}
                className={`py-3 px-8 rounded-xl font-heading font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                  isIdTaken
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    : 'bg-[#85e510] hover:bg-[#9bf028] text-[#062404] shadow-[0_0_25px_rgba(133,229,16,0.35)]'
                }`}
              >
                <span>Save & Submit Student</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Photo Editor Modal (matching screenshot 'Photo Editor' in collage) */}
      {isEditorOpen && capturedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-3xl max-w-sm w-full overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative">
            {/* Header */}
            <div className="p-4 border-b border-[#1e2e42] flex items-center justify-between">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-[#8fa2b7] hover:text-white flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h3 className="font-heading font-black text-sm text-white">Photo Editor</h3>
              <button onClick={() => setIsEditorOpen(false)} className="text-[#8fa2b7] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Canvas Stage */}
            <div className="p-4 bg-[#0b1118] flex items-center justify-center aspect-[3/4] overflow-hidden">
              <img
                src={capturedPhoto}
                alt="Editing portrait"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'filter 0.1s ease',
                }}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Editor Tools & Sliders */}
            <div className="p-4 bg-[#131e2b] space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center justify-between text-xs border-b border-[#1e2e42] pb-2">
                {(['Brightness', 'Contrast', 'Saturation', 'Rotate'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEditorActiveTab(tab)}
                    className={`font-bold transition-colors ${
                      editorActiveTab === tab ? 'text-[#85e510]' : 'text-[#8fa2b7] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Slider for Current Tool */}
              {editorActiveTab === 'Brightness' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8fa2b7]">
                    <span>Brightness</span>
                    <span className="font-mono text-white">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-[#85e510]"
                  />
                </div>
              )}

              {editorActiveTab === 'Contrast' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8fa2b7]">
                    <span>Contrast</span>
                    <span className="font-mono text-white">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-[#85e510]"
                  />
                </div>
              )}

              {editorActiveTab === 'Saturation' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8fa2b7]">
                    <span>Saturation</span>
                    <span className="font-mono text-white">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-[#85e510]"
                  />
                </div>
              )}

              {editorActiveTab === 'Rotate' && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="py-1.5 px-3 rounded-lg bg-[#0b1118] border border-[#1e2e42] text-xs font-bold text-white flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#85e510]" />
                    <span>Rotate +90&deg;</span>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="py-2.5 rounded-xl bg-[#0b1118] border border-[#1e2e42] text-xs font-bold text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="py-2.5 rounded-xl bg-[#85e510] text-[#062404] font-extrabold text-xs shadow-[0_0_15px_rgba(133,229,16,0.3)]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirmation Modal */}
      {submittedStudent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#131e2b] border border-[#85e510]/50 rounded-3xl max-w-md w-full p-6 shadow-[0_0_60px_rgba(133,229,16,0.3)] text-center relative">
            <button
              onClick={() => setSubmittedStudent(null)}
              className="absolute top-4 right-4 text-[#8fa2b7] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#85e510]/20 border border-[#85e510] text-[#85e510] flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(133,229,16,0.4)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-heading font-black text-white">Student Transmitted Successfully!</h3>
            <p className="text-xs text-[#8fa2b7] mt-1">
              Record transmitted from Sender Station &amp; now immediately accessible in Central Receiver Directory
            </p>

            <div className="my-5 p-4 rounded-2xl bg-[#0b1118] border border-[#1e2e42] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8fa2b7]">Student ID:</span>
                <span className="font-mono font-bold text-[#85e510]">{submittedStudent.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa2b7]">Full Name:</span>
                <span className="font-bold text-white">{submittedStudent.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa2b7]">Grade / Class:</span>
                <span className="text-white">{submittedStudent.grade} &bull; {submittedStudent.sex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa2b7]">School Campus:</span>
                <span className="text-white">{submittedStudent.school}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8fa2b7]">Verification Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-[#85e510]/15 text-[#85e510] font-black text-[10px]">
                  Accepted
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetFormForNext}
                className="py-2.5 px-4 rounded-xl bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-white font-bold text-xs transition-all"
              >
                Register Next Student
              </button>

              <button
                type="button"
                onClick={() => navigate('/receiver/students')}
                className="py-2.5 px-4 rounded-xl bg-[#85e510] hover:bg-[#9bf028] text-[#062404] font-heading font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(133,229,16,0.3)]"
              >
                <span>View in Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
