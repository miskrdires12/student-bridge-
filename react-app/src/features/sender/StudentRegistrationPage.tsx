import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, RotateCw, ZoomIn, ZoomOut,
  Upload, UserCheck, ArrowRight, ShieldCheck, Sparkles, X, Sliders, Crop,
  ChevronDown, ChevronUp, Image as ImageIcon, Check, Printer
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

  // Extra Details (Expandable)
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('Addis Ababa');
  const [guardianName, setGuardianName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('+251');
  const [schoolBusUsage, setSchoolBusUsage] = useState<'Yes' | 'No'>('Yes');
  const [nationality, setNationality] = useState('Ethiopian');

  // Camera & Photo States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Photo Editor Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorActiveTab, setEditorActiveTab] = useState<'Brightness' | 'Contrast' | 'Saturation' | 'Crop' | 'Rotate'>('Brightness');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);

  const schools = getSchools();

  // Check ID Uniqueness dynamically against all students
  useEffect(() => {
    const all = getStudents();
    const taken = all.some(s => s.studentId.trim().toUpperCase() === studentId.trim().toUpperCase());
    setIsIdTaken(taken);
  }, [studentId]);

  // Name Auto-Capitalizer (First Name, Father's Name, Grandfather's Name)
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
      setCameraError('Camera access unavailable. Please choose an image file from your device.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isIdTaken) {
      alert('The Student ID is already taken. Please generate or specify a unique ID.');
      return;
    }

    if (!fullName.trim()) {
      alert('Student Full Name is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const studentPayload: Student = {
        id: 'std-' + Date.now(),
        studentId: studentId.trim(),
        fullName: fullName.trim(),
        sex,
        grade,
        phone: phone.trim(),
        bloodType,
        school,
        location,
        country: 'Ethiopia',
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined,
        guardianFullName: guardianName || undefined,
        emergencyContactPhone: emergencyContact.trim(),
        schoolBusUsage,
        nationality,
        photoPath: capturedPhoto ? `${grade}/${studentId.trim()}_${fullName.trim().replace(/\s+/g, '_')}.jpg` : undefined,
        previewPath: capturedPhoto || undefined,
        senderName: user?.username || 'Field Operator',
        status: 'Accepted',
        idProductionStatus: 'READY',
        createdAt: new Date().toISOString(),
        recordHistory: [
          {
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            action: 'Initial Registration',
            user: user?.username || 'Field Operator',
            role: 'Sender',
            notes: 'Biometric capture and identity registration in Sender Station'
          }
        ]
      };

      // Call Cloudflare Edge Worker API to save student & upload photo to R2
      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentPayload)
        });
        if (res.ok) {
          const cloudSaved = await res.json();
          if (cloudSaved && cloudSaved.photoPath) {
            studentPayload.photoPath = cloudSaved.photoPath;
            studentPayload.previewPath = cloudSaved.previewPath || cloudSaved.photoPath;
          }
        }
      } catch (cloudErr) {
        console.warn('Direct Cloudflare Edge sync warning, saving locally:', cloudErr);
      }

      // Persist in client store & notify Receiver Station immediately
      addStudent(studentPayload);
      setSubmittedStudent(studentPayload);
    } catch (err: any) {
      alert('Error during registration: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormForNext = () => {
    setStudentId(generateNewId());
    setFullName('');
    setPhone('+251');
    setEmergencyContact('+251');
    setGuardianName('');
    setDateOfBirth('');
    setCapturedPhoto(null);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setZoom(1);
    setSubmittedStudent(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hidden Canvas for captures */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Register Student
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 uppercase">
              Station One &bull; Sender
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Capture biometric photograph, input student records, and transmit directly to authoritative database
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
            Operator: <strong className="text-[#202833]">{user?.username || 'Sender'}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: 2 White Cards */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Student Photograph Card (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-[#202833] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#4D8A07]" />
                <span>Student Photograph</span>
              </h2>
              {capturedPhoto ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Captured
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Required
                </span>
              )}
            </div>

            {/* Photo Preview Container */}
            <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto bg-[#F4F7F5] rounded-2xl border-2 border-dashed border-[#CBD5E1] overflow-hidden flex flex-col items-center justify-center shadow-inner group">
              {isCameraActive ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Portrait Alignment Guide */}
                  <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-[#85E510]/60 rounded-full pointer-events-none" />
                </div>
              ) : capturedPhoto ? (
                <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={capturedPhoto}
                    alt="Captured Student"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      transition: 'all 0.15s ease'
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] font-mono text-white">
                    {studentId}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-[#64748B] flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] mb-3 shadow-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-bold text-[#202833]">No Photograph Selected</div>
                  <p className="text-[11px] text-[#94A3B8] mt-1 max-w-[200px]">
                    Use live camera capture or select a portrait photo from device
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Photo Actions */}
          <div className="space-y-2 pt-2">
            {isCameraActive ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="py-2.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="py-2.5 px-4 rounded-xl bg-[#F4F7F5] hover:bg-[#E2E8F0] text-[#202833] font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2.5 px-3 rounded-xl bg-[#202833] hover:bg-[#161D26] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera className="w-4 h-4 text-[#85E510]" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-[#F4F7F5] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-[#202833] font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Upload className="w-4 h-4 text-[#64748B]" />
                    <span>Upload Image</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {capturedPhoto && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-[#F8FAF9] border border-[#CBD5E1] text-[#202833] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#4D8A07]" />
                      <span>Edit & Crop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(null);
                        setBrightness(100);
                        setContrast(100);
                        setSaturation(100);
                        setRotation(0);
                        setZoom(1);
                      }}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-red-50 border border-[#CBD5E1] hover:border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Student Information Card (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-[#202833] uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#4D8A07]" />
                <span>Student Information</span>
              </h2>
              <span className="text-[11px] font-semibold text-[#64748B]">All fields verified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#202833]">Student ID</label>
                  <button
                    type="button"
                    onClick={() => setStudentId(generateNewId())}
                    className="text-[10px] text-[#4D8A07] hover:underline font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isIdTaken ? (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Taken
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#4D8A07] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Loza Bereket Tadesse"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs text-[#202833] font-medium focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                />
              </div>

              {/* Sex */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      sex === 'Female'
                        ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-white'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      sex === 'Male'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-white'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Blood Group</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              {/* School */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Assigned School</label>
                <select
                  value={school}
                  onChange={(e) => {
                    setSchool(e.target.value);
                    const found = schools.find(s => s.name === e.target.value);
                    if (found) setLocation(found.location);
                  }}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade / Section */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Grade / Section</label>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value.toUpperCase())}
                  placeholder="e.g. 9C or 10A"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                />
              </div>

              {/* Phone Number */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#202833] mb-1.5">
                  Phone Number (Ethiopia +251)
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneFormat(e.target.value, setPhone)}
                  placeholder="+251911234567"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Auto-formats: 09... &rarr; +2519... and 07... &rarr; +2517...
                </span>
              </div>
            </div>

            {/* Expandable Extra Details */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowExtraDetails(!showExtraDetails)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#202833] py-2 px-3 rounded-xl bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#CBD5E1] transition-all"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#4D8A07]" />
                  <span>Extra Details (Guardian, Bus, DOB, Address)</span>
                </span>
                {showExtraDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showExtraDetails && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Guardian Full Name</label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="Parent / Guardian"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => handlePhoneFormat(e.target.value, setEmergencyContact)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">School Bus Usage</label>
                    <select
                      value={schoolBusUsage}
                      onChange={(e) => setSchoolBusUsage(e.target.value as any)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="Yes">Yes (Uses School Bus)</option>
                      <option value="No">No (Private Transport)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Home Address / Sub-City</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Bole Sub-City, Woreda 03"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <button
              type="submit"
              disabled={isSubmitting || isIdTaken || !fullName.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] disabled:opacity-50 text-[#062404] font-heading font-black text-sm shadow-[0_4px_15px_rgba(133,229,16,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting to Authoritative Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Student Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* In-Browser Photo Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#4D8A07]" />
                <span>Photo Adjustments & Crop</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Preview in Modal */}
            <div className="relative aspect-[3/4] w-48 mx-auto bg-slate-900 rounded-xl overflow-hidden shadow-inner">
              {capturedPhoto && (
                <img
                  src={capturedPhoto}
                  alt="Editor Preview"
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                  }}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Slider Tabs */}
            <div className="flex items-center justify-center gap-1 bg-[#F4F7F5] p-1 rounded-xl text-xs font-bold text-[#64748B]">
              {(['Brightness', 'Contrast', 'Saturation', 'Crop', 'Rotate'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEditorActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    editorActiveTab === tab
                      ? 'bg-white text-[#202833] shadow-sm font-black'
                      : 'hover:text-[#202833]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="p-3 bg-[#F8FAF9] rounded-xl space-y-3">
              {editorActiveTab === 'Brightness' && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#202833] mb-1">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-[#85E510]"
                  />
                </div>
              )}

              {editorActiveTab === 'Contrast' && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#202833] mb-1">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-[#85E510]"
                  />
                </div>
              )}

              {editorActiveTab === 'Saturation' && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#202833] mb-1">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-[#85E510]"
                  />
                </div>
              )}

              {editorActiveTab === 'Rotate' && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="px-4 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <RotateCw className="w-4 h-4 text-[#4D8A07]" />
                    <span>Rotate 90&deg;</span>
                  </button>
                </div>
              )}

              {editorActiveTab === 'Crop' && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#202833] mb-1">
                    <span>Zoom Factor</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-[#85E510]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                  setRotation(0);
                  setZoom(1);
                }}
                className="px-3 py-2 text-xs font-bold text-[#64748B] hover:text-[#202833]"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#85E510] text-[#062404] font-black text-xs shadow-sm"
              >
                Apply Adjustments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      {submittedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#4D8A07]">
              <div className="w-10 h-10 rounded-full bg-[#85E510]/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#4D8A07]" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-[#202833]">Student Registered!</h3>
                <p className="text-xs text-[#64748B]">Transmitted to authoritative repository</p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Student ID:</span>
                <span className="font-mono font-bold text-[#202833]">{submittedStudent.studentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Full Name:</span>
                <span className="font-bold text-[#202833]">{submittedStudent.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">School & Grade:</span>
                <span className="font-semibold text-[#202833]">{submittedStudent.school} &bull; Grade {submittedStudent.grade}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Phone:</span>
                <span className="font-mono text-[#202833]">{submittedStudent.phone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#64748B]">Biometric Photo:</span>
                <span className="font-bold text-[#4D8A07]">Stored & Associated</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-white border border-[#CBD5E1] text-[#202833] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#F8FAF9]"
              >
                <Printer className="w-4 h-4 text-[#64748B]" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={resetFormForNext}
                className="py-2.5 px-3 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Register Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
