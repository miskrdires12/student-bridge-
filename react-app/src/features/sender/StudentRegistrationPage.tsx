import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, RotateCw, ZoomIn, ZoomOut,
  Upload, UserCheck, ArrowRight, ShieldCheck, Sparkles, X
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
  const [grade, setGrade] = useState('Grade 9');
  const [phone, setPhone] = useState('+251');
  const [bloodType, setBloodType] = useState('O+');
  const [country, setCountry] = useState('Ethiopia');
  const [school, setSchool] = useState('YMS');

  // Camera & Photo States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Success Notification state
  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);

  const schools = getSchools();

  // Check ID Uniqueness
  useEffect(() => {
    const all = getStudents();
    const taken = all.some(s => s.studentId.trim().toUpperCase() === studentId.trim().toUpperCase());
    setIsIdTaken(taken);
  }, [studentId]);

  // Name Auto-Capitalizer (First Name & Father's Name)
  const handleNameChange = (val: string) => {
    // Capitalize each word's initial letter
    const capitalized = val
      .split(' ')
      .map(word => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
    setFullName(capitalized);
  };

  // Ethiopian Phone Number Auto-Formatter
  // 09... -> +2519... and 07... -> +2517...
  const handlePhoneChange = (val: string) => {
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
    setPhone(clean);
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
      setCameraError('Camera access denied or unavailable. You can upload an image instead.');
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

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isIdTaken) {
      alert('The Student ID is already taken. Please regenerate or specify a unique ID.');
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
      country,
      school,
      photoPath: capturedPhoto ? `captured_${studentId}.jpg` : undefined,
      previewPath: capturedPhoto || undefined,
      senderName: user?.username || 'Field Operator',
      status: 'VERIFIED',
      createdAt: new Date().toISOString(),
    };

    addStudent(newStudent);
    setSubmittedStudent(newStudent);
  };

  const resetFormForNext = () => {
    setStudentId(generateNewId());
    setFullName('');
    setPhone('+251');
    setCapturedPhoto(null);
    setRotation(0);
    setZoom(1);
    setSubmittedStudent(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hidden Canvas for captures */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">
              Student Registration Station
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/30 uppercase">
              Field Station v2
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Capture verified student biometric portrait, identity data, and sync to Cloudflare R2
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/sender/students"
            className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all"
          >
            Directory View
          </Link>
        </div>
      </div>

      {/* Main Registration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Biometric Live Camera Station (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#8fe617]" />
                  <span className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                    Biometric Portrait Capture
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#9eb2a6]">ISO/IEC 19794</span>
              </div>

              {/* Viewfinder Area */}
              <div className="mt-4 relative aspect-[3/4] bg-[#070908] rounded-xl overflow-hidden border-2 border-dashed border-[#1e2c22] flex items-center justify-center group">
                {capturedPhoto ? (
                  /* Photo Preview */
                  <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                    <img
                      src={capturedPhoto}
                      alt="Captured Student Portrait"
                      style={{
                        transform: `rotate(${rotation}deg) scale(${zoom})`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#8fe617] text-[#062404] text-[10px] font-black uppercase">
                      Captured OK
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
                    {/* Head Alignment Oval Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-64 rounded-full border-2 border-[#8fe617]/60 shadow-[0_0_15px_rgba(143,230,23,0.3)] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#8fe617]/50" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-white/80 bg-black/60 backdrop-blur-sm py-1 rounded">
                      Align face within oval guide &bull; Look straight
                    </div>
                  </div>
                ) : (
                  /* Idle Camera State */
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#9eb2a6]">
                      <Camera className="w-8 h-8 text-[#8fe617]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Live Camera Offline</div>
                      <div className="text-[11px] text-[#9eb2a6] mt-1 max-w-[200px] mx-auto">
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

              {/* Photo Editing & Camera Controls */}
              <div className="mt-4 space-y-3">
                {capturedPhoto ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-[#070908] p-2 rounded-xl border border-[#1e2c22]">
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs flex items-center gap-1.5 font-bold"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-[#8fe617]" />
                        <span>Rotate</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoom(prev => Math.max(0.8, prev - 0.1))}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-mono text-[#9eb2a6] px-1">
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setCapturedPhoto(null); startCamera(); }}
                        className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                ) : isCameraActive ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-3 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] font-extrabold text-xs shadow-[0_0_20px_rgba(143,230,23,0.4)] flex items-center justify-center gap-2 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Portrait</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-2.5 px-3 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(143,230,23,0.3)] transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>

                    <label className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5 text-[#8fe617]" />
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

            <div className="mt-4 pt-3 border-t border-[#1e2c22] text-[11px] text-[#9eb2a6] flex items-center justify-between">
              <span>Cloud Storage: Cloudflare R2</span>
              <span className="text-[#8fe617] font-bold">250 KB JPG Target</span>
            </div>
          </div>
        </div>

        {/* Right Column: Required Student Fields (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
              <div>
                <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                  Student Identity Record
                </h2>
                <p className="text-xs text-[#9eb2a6] mt-0.5">All demographic, academic, and contact attributes</p>
              </div>
              <span className="text-xs text-[#8fe617] font-mono font-bold">Step 1 of 1</span>
            </div>

            {/* Field: Student ID with uniqueness validator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">
                  Student ID (Auto-Generated & Unique)
                </label>
                <button
                  type="button"
                  onClick={() => setStudentId(generateNewId())}
                  className="text-xs text-[#8fe617] hover:underline flex items-center gap-1"
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
                  placeholder="e.g. SB-2026-10492"
                  className={`w-full bg-[#070908] border rounded-xl px-4 py-2.5 font-mono text-sm text-white focus:outline-none transition-all ${
                    isIdTaken
                      ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500'
                      : 'border-[#1e2c22] focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617]'
                  }`}
                />
                {isIdTaken ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-black uppercase flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>TAKEN</span>
                  </span>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8fe617] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AVAILABLE</span>
                  </span>
                )}
              </div>
              {isIdTaken && (
                <p className="text-xs text-red-400 mt-1 font-medium">
                  This Student ID already exists in the central directory. Please generate a new ID.
                </p>
              )}
            </div>

            {/* Field: Full Name (Auto First word + Father Name Capitalizer) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">
                  Full Name (Auto-Capitalized: First & Father's Name)
                </label>
                <span className="text-[10px] text-[#8fe617] font-semibold">Auto-Title Case</span>
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Loza Bereket Tadesse"
                className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
              />
            </div>

            {/* 2-col Grid: Sex & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
                  Sex
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      sex === 'Female'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'bg-[#070908] text-[#9eb2a6] border-[#1e2c22] hover:bg-white/5'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      sex === 'Male'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-[#070908] text-[#9eb2a6] border-[#1e2c22] hover:bg-white/5'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
                  Grade Level
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8fe617] transition-all"
                >
                  <option value="Pre-K">Pre-K</option>
                  <option value="KG">KG</option>
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

            {/* 2-col Grid: Phone (Auto 09->+2519, 07->+2517) & Blood Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">
                    Phone Number
                  </label>
                  <span className="text-[10px] text-[#8fe617] font-mono">Auto 09/07 &rarr; +251</span>
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+251911234567"
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
                  Blood Type (All Types Included)
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8fe617] transition-all font-mono"
                >
                  <option value="A+">A+ (A Positive)</option>
                  <option value="A-">A- (A Negative)</option>
                  <option value="B+">B+ (B Positive)</option>
                  <option value="B-">B- (B Negative)</option>
                  <option value="AB+">AB+ (AB Positive)</option>
                  <option value="AB-">AB- (AB Negative)</option>
                  <option value="O+">O+ (O Positive)</option>
                  <option value="O-">O- (O Negative)</option>
                  <option value="Unknown">Unknown / Not Tested</option>
                </select>
              </div>
            </div>

            {/* 2-col Grid: School & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
                  School Branch
                </label>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8fe617] transition-all"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.location})</option>
                  ))}
                  <option value="Other School">Other School Branch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8fe617] transition-all"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-4 border-t border-[#1e2c22]">
              <button
                type="submit"
                disabled={isIdTaken}
                className={`w-full py-3.5 px-6 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                  isIdTaken
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    : 'bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] shadow-[0_0_25px_rgba(143,230,23,0.35)]'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span>Save & Submit Student Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal Confirmation */}
      {submittedStudent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#101612] border border-[#8fe617]/50 rounded-2xl max-w-md w-full p-6 shadow-[0_0_60px_rgba(143,230,23,0.3)] relative text-center">
            <button
              onClick={() => setSubmittedStudent(null)}
              className="absolute top-4 right-4 text-[#9eb2a6] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#8fe617]/20 border border-[#8fe617] text-[#8fe617] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(143,230,23,0.4)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-heading font-black text-white">Student Registered Successfully!</h3>
            <p className="text-xs text-[#9eb2a6] mt-1">
              Record stored and synchronized with central Receiver Directory
            </p>

            <div className="my-5 p-4 rounded-xl bg-[#070908] border border-[#1e2c22] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#9eb2a6]">Student ID:</span>
                <span className="font-mono font-bold text-[#8fe617]">{submittedStudent.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9eb2a6]">Full Name:</span>
                <span className="font-bold text-white">{submittedStudent.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9eb2a6]">Grade / Sex:</span>
                <span className="text-white">{submittedStudent.grade} &bull; {submittedStudent.sex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9eb2a6]">School Branch:</span>
                <span className="text-white">{submittedStudent.school}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9eb2a6]">Blood Type:</span>
                <span className="font-mono text-purple-300 font-bold">{submittedStudent.bloodType}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetFormForNext}
                className="py-2.5 px-4 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] font-extrabold text-xs transition-all"
              >
                Register Next Student
              </button>

              <Link
                to="/receiver/students"
                className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white font-bold text-xs flex items-center justify-center transition-all"
              >
                View Directory
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
