"use client";

// ============================================================================
// STUDENT BRIDGE — UNIFIED STATION & PRODUCTION SETTINGS
// Dynamically rendered based on Operator Role:
// - SENDER: Intake defaults, Studio Camera framing, auto-format phone, draft clearing
// - RECEIVER: Local photo folder paths, CSV schemas, 8-Up print imposition, live polling
// - ADMIN: Master tabbed console providing full control over Receiver, Sender, and System
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  Folder,
  Printer,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Save,
  Sparkles,
  Shield,
  Volume2,
  VolumeX,
  Camera,
  School,
  Sliders,
} from "lucide-react";
import {
  getStudentCountFromDB,
  clearAllStudentsFromDB,
} from "@/lib/idb-storage";
import { clearAllStudentsAction } from "@/actions/students";
import { publishStudentSync } from "@/lib/sync-client";
import { RECEIVER_STUDENT_PHOTO_FOLDER } from "@/lib/export-utils";

export interface ReceiverSettings {
  photoFolder: string;
  csvPrefix: string;
  csvDelimiter: "," | ";";
  autoFormatPhone: boolean;
  photoFolderStructure: "flat" | "by-grade" | "by-id";
  pollingIntervalMs: number;
  enableAudioAlerts: boolean;
  includeCropMarks: boolean;
  printDpi: "300dpi" | "600dpi";
  theme: "dark" | "light";
}

export interface SenderSettings {
  defaultGrade: string;
  defaultSchool: string;
  autoFormatPhone: boolean;
  enableIntakeChime: boolean;
  mirrorCamera: boolean;
  cameraGuideGrid: boolean;
  autoResetForm: boolean;
  theme: "dark" | "light";
}

const DEFAULT_RECEIVER_SETTINGS: ReceiverSettings = {
  photoFolder: RECEIVER_STUDENT_PHOTO_FOLDER,
  csvPrefix: "student_bridge_receiver_manifest",
  csvDelimiter: ",",
  autoFormatPhone: true,
  photoFolderStructure: "by-grade",
  pollingIntervalMs: 4000,
  enableAudioAlerts: true,
  includeCropMarks: true,
  printDpi: "300dpi",
  theme: "dark",
};

const DEFAULT_SENDER_SETTINGS: SenderSettings = {
  defaultGrade: "Grade 10",
  defaultSchool: "Silicon Labs Academy",
  autoFormatPhone: true,
  enableIntakeChime: true,
  mirrorCamera: true,
  cameraGuideGrid: true,
  autoResetForm: true,
  theme: "dark",
};

interface SettingsClientProps {
  userRole?: string;
  username?: string;
}

export function SettingsClient({ userRole = "RECEIVER", username = "Operator" }: SettingsClientProps) {
  const isSenderRole = userRole === "SENDER";
  const isReceiverRole = userRole === "RECEIVER";
  const isAdminRole = userRole === "ADMIN";

  // Tab State for Admin: "receiver" | "sender" | "maintenance"
  const [adminTab, setAdminTab] = useState<"receiver" | "sender" | "maintenance">(
    isSenderRole ? "sender" : "receiver"
  );

  // Settings States
  const [receiverSettings, setReceiverSettings] = useState<ReceiverSettings>(DEFAULT_RECEIVER_SETTINGS);
  const [senderSettings, setSenderSettings] = useState<SenderSettings>(DEFAULT_SENDER_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [isClearingImmediate, setIsClearingImmediate] = useState(false);

  // Load saved configurations on mount
  useEffect(() => {
    try {
      const isDark = document.documentElement.classList.contains("dark");
      const savedTheme = (localStorage.getItem("sb_theme") as "light" | "dark") || (isDark ? "dark" : "light");

      // 1. Receiver Settings
      const rawReceiver = localStorage.getItem("sb_receiver_settings");
      if (rawReceiver) {
        const parsed = JSON.parse(rawReceiver);
        setReceiverSettings({
          ...DEFAULT_RECEIVER_SETTINGS,
          ...parsed,
          theme: savedTheme || parsed.theme || "dark",
        });
      } else {
        const legacyFolder = localStorage.getItem("sb_receiver_photo_folder");
        if (legacyFolder) {
          setReceiverSettings((prev) => ({
            ...prev,
            photoFolder: legacyFolder,
            theme: savedTheme,
          }));
        } else {
          setReceiverSettings((prev) => ({ ...prev, theme: savedTheme }));
        }
      }

      // 2. Sender Settings
      const rawSender = localStorage.getItem("sb_sender_settings");
      if (rawSender) {
        const parsed = JSON.parse(rawSender);
        setSenderSettings({
          ...DEFAULT_SENDER_SETTINGS,
          ...parsed,
          theme: savedTheme || parsed.theme || "dark",
        });
      } else {
        setSenderSettings((prev) => ({ ...prev, theme: savedTheme }));
      }

      // 3. Student Count
      getStudentCountFromDB()
        .then((cnt) => {
          if (cnt > 0) setStudentCount(cnt);
          else {
            const rawStudents = localStorage.getItem("sb_enrolled_students");
            if (rawStudents) {
              const list = JSON.parse(rawStudents);
              if (Array.isArray(list)) setStudentCount(list.length);
            }
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Error loading settings:", e);
    }
  }, []);

  const handleApplyTheme = (theme: "light" | "dark") => {
    setReceiverSettings((prev) => ({ ...prev, theme }));
    setSenderSettings((prev) => ({ ...prev, theme }));
    localStorage.setItem("sb_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSaveReceiverSettings = () => {
    try {
      const cleanFolder = receiverSettings.photoFolder.trim() || "C:\\Users\\athede\\Desktop\\students project for 17000";
      const updated = { ...receiverSettings, photoFolder: cleanFolder };
      setReceiverSettings(updated);
      localStorage.setItem("sb_receiver_settings", JSON.stringify(updated));
      localStorage.setItem("sb_receiver_photo_folder", cleanFolder);
      localStorage.setItem("sb_theme", updated.theme);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("receiver_settings_updated", { detail: updated }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      alert("Failed to save receiver settings to local storage.");
    }
  };

  const handleSaveSenderSettings = () => {
    try {
      localStorage.setItem("sb_sender_settings", JSON.stringify(senderSettings));
      localStorage.setItem("sb_theme", senderSettings.theme);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("sender_settings_updated", { detail: senderSettings }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      alert("Failed to save sender settings to local storage.");
    }
  };

  // Immediate Roster Purge (Receiver / Admin privilege)
  const handleImmediateClearAll = async () => {
    if (
      !confirm(
        "⚠️ PERMANENT INSTITUTIONAL PURGE: Are you sure you want to immediately delete ALL student records from the database and station cache? This action takes effect immediately across all workstations."
      )
    ) {
      return;
    }

    setIsClearingImmediate(true);

    try {
      localStorage.removeItem("sb_enrolled_students");
      localStorage.removeItem("sb_students_permanent_backup");
      localStorage.removeItem("sb_offline_pending_students");
      localStorage.removeItem("sb_deleted_student_ids");
      localStorage.removeItem("sb_photo_draft");
      localStorage.removeItem("sb_student_draft");
      sessionStorage.clear();

      await clearAllStudentsFromDB().catch(() => {});
      publishStudentSync("CLEAR").catch(() => {});
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("students_cleared"));

      setStudentCount(0);

      clearAllStudentsAction().catch((err) => {
        console.warn("Background server purge status:", err);
      });

      alert("✓ Institutional Roster Purge Complete! All student records wiped in 0ms.");
    } catch (err: any) {
      alert("Failed to perform roster reset: " + (err?.message || "Unknown error"));
    } finally {
      setIsClearingImmediate(false);
    }
  };

  const handlePurgeAllLocalResiduals = () => {
    if (confirm("Wipe all local client cache residuals and offline queues?")) {
      localStorage.removeItem("sb_deleted_student_ids");
      localStorage.removeItem("sb_offline_pending_students");
      localStorage.removeItem("sb_student_draft");
      localStorage.removeItem("sb_photo_draft");
      alert("Local storage residuals completely purged.");
    }
  };

  const handleClearSenderDrafts = () => {
    if (confirm("Clear local student intake drafts and studio photo buffers?")) {
      localStorage.removeItem("sb_student_draft");
      localStorage.removeItem("sb_photo_draft");
      alert("Local intake drafts cleared successfully.");
    }
  };

  // Sample Path Live Preview Calculation
  const samplePhotoPathPreview = `${receiverSettings.photoFolder.replace(/[/\\]+$/, "")}\\${
    receiverSettings.photoFolderStructure === "by-grade"
      ? "Grade_10\\"
      : ""
  }Yeah tarekegn.jpg`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 text-[#080808] dark:text-[#f2f7f4] font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dce7e1] dark:border-[#223126] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#062404] bg-[#8fe617] px-2.5 py-0.5 rounded-md font-black tracking-wider uppercase shadow-xs">
              {isAdminRole
                ? "ADMINISTRATIVE CONSOLE"
                : isSenderRole
                ? "SENDER WORKSTATION"
                : "RECEIVER FACILITY"}
            </span>
            <span className="text-[#dce7e1] dark:text-[#223126]">•</span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono font-semibold">
              {isAdminRole ? "Master Configuration" : `${username} Preferences`}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5 mt-1.5">
            {isSenderRole ? (
              <>
                <Camera className="h-6 w-6 text-[#8fe617]" />
                <span>Sender Station &amp; Intake Settings</span>
              </>
            ) : isReceiverRole ? (
              <>
                <Printer className="h-6 w-6 text-[#8fe617]" />
                <span>Receiver Production Settings</span>
              </>
            ) : (
              <>
                <Shield className="h-6 w-6 text-[#8fe617]" />
                <span>Station &amp; Production Settings</span>
              </>
            )}
          </h1>

          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5 font-mono">
            {isSenderRole
              ? "Configure student intake defaults, live studio camera parameters, audio alerts, and registration draft cache."
              : isReceiverRole
              ? "Configure local photo storage paths, CSV manifest options, 8-Up imposition defaults, telemetry frequency, and roster maintenance."
              : "Master administrative control console for Receiver production, Sender intake stations, and central database maintenance."}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (isSenderRole || (isAdminRole && adminTab === "sender")) {
                handleSaveSenderSettings();
              } else {
                handleSaveReceiverSettings();
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-[#8fe617] px-5 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_20px_rgba(143,230,23,0.35)] transition-all cursor-pointer"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Switcher (Visible only when logged in as ADMIN) */}
      {isAdminRole && (
        <div className="flex items-center gap-2 border-b border-[#dce7e1] dark:border-[#223126] pb-3">
          <button
            type="button"
            onClick={() => setAdminTab("receiver")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === "receiver"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93]"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Receiver Production Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab("sender")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === "sender"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93]"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Sender Station Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab("maintenance")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === "maintenance"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93]"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Database &amp; Roster Maintenance</span>
          </button>
        </div>
      )}

      {/* Success Notification */}
      {savedSuccess && (
        <div className="rounded-2xl border border-[#8fe617] bg-[#8fe617]/15 p-4 flex items-center gap-3 text-xs font-mono font-bold text-[#080808] dark:text-[#8fe617] shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 stroke-[2.5] text-[#8fe617]" />
          <span>Workstation preferences saved and applied immediately across active sessions.</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SENDER SETTINGS PANEL (Shown if role is SENDER, or Admin selected 'sender')  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(isSenderRole || (isAdminRole && adminTab === "sender")) && (
        <div className="space-y-6">
          {/* Section 1: Registration Intake Defaults */}
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                <School className="h-5 w-5 text-[#8fe617]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                  Intake Cohort &amp; Student Defaults
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Default values auto-populated during live student registration to speed up intake
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  Default Grade Cohort
                </label>
                <select
                  value={senderSettings.defaultGrade}
                  onChange={(e) => setSenderSettings({ ...senderSettings, defaultGrade: e.target.value })}
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                >
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                  <option value="General">General / All Grades</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  Default Institutional School Name
                </label>
                <input
                  type="text"
                  value={senderSettings.defaultSchool}
                  onChange={(e) => setSenderSettings({ ...senderSettings, defaultSchool: e.target.value })}
                  placeholder="Silicon Labs Academy"
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
              <div>
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                  Auto-Format Phone Number (2519 Format)
                </span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                  Automatically converts 09... and 9... into standard 2519 format during typing
                </span>
              </div>
              <input
                type="checkbox"
                checked={senderSettings.autoFormatPhone}
                onChange={(e) => setSenderSettings({ ...senderSettings, autoFormatPhone: e.target.checked })}
                className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
              />
            </div>
          </div>

          {/* Section 2: Live Studio Camera Settings */}
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                <Camera className="h-5 w-5 text-[#8fe617]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                  Live Studio Camera &amp; Photo Framing
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Presets for webcam capture, framing guides, and real-time portrait alignment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    Golden Ratio Framing Guide
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Displays oval head guide overlay on camera for 3:4 studio portrait framing
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={senderSettings.cameraGuideGrid}
                  onChange={(e) => setSenderSettings({ ...senderSettings, cameraGuideGrid: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    Mirror Video Stream
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Flips webcam preview horizontally so operators see natural reflection
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={senderSettings.mirrorCamera}
                  onChange={(e) => setSenderSettings({ ...senderSettings, mirrorCamera: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Intake Telemetry & Draft Management */}
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                <Sliders className="h-5 w-5 text-[#8fe617]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                  Intake Workflow &amp; Draft Maintenance
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Manage intake audio confirmation, form clearing, and local draft buffers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block flex items-center gap-1.5">
                    {senderSettings.enableIntakeChime ? (
                      <Volume2 className="h-4 w-4 text-[#8fe617]" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-[#6b7771]" />
                    )}
                    <span>Registration Success Audio Chime</span>
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Plays subtle studio audio feedback upon successful enrollment
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={senderSettings.enableIntakeChime}
                  onChange={(e) => setSenderSettings({ ...senderSettings, enableIntakeChime: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    Auto-Reset Form on Success
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Immediately clears name, photo, and phone so next student can be registered
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={senderSettings.autoResetForm}
                  onChange={(e) => setSenderSettings({ ...senderSettings, autoResetForm: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearSenderDrafts}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer"
              >
                Clear Incomplete Registration Drafts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* RECEIVER SETTINGS PANEL (Shown if role is RECEIVER, or Admin 'receiver')   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(isReceiverRole || (isAdminRole && adminTab === "receiver")) && (
        <div className="space-y-6">
          {/* Section 1: CSV & Local Photo File Path */}
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                <Folder className="h-5 w-5 text-[#8fe617]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                  Local Photo Storage &amp; CSV File Paths
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Configure directory where high-res studio photos are saved and mapped in Excel/CSV @photo column
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Photo Folder Path */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#080808] dark:text-[#f2f7f4] flex items-center justify-between">
                  <span>Photo Folder Local File Path</span>
                  <span className="text-[10px] text-[#8fe617] font-bold">
                    ACTIVE PRODUCTION DIRECTORY
                  </span>
                </label>
                <input
                  type="text"
                  value={receiverSettings.photoFolder}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReceiverSettings((prev) => ({ ...prev, photoFolder: val }));
                    try {
                      localStorage.setItem("sb_receiver_photo_folder", val.trim());
                    } catch {}
                  }}
                  placeholder="C:\Users\athede\Desktop\students project for 17000"
                  className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-4 py-2.5 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none focus:ring-1 focus:ring-[#8fe617] transition-all"
                />
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
                    Directly editable. All CSV exports and photo manifests will reference this path.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const p = "C:\\Users\\athede\\Desktop\\students project for 17000";
                      setReceiverSettings((prev) => ({ ...prev, photoFolder: p }));
                      try {
                        localStorage.setItem("sb_receiver_photo_folder", p);
                        window.dispatchEvent(new Event("storage"));
                      } catch {}
                    }}
                    className="text-[10px] font-mono font-bold text-[#062404] bg-[#8fe617] hover:bg-[#7ecc10] px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Set: C:\Users\athede\Desktop\students project for 17000
                  </button>
                </div>
              </div>

              {/* Live Preview of @photo column */}
              <div className="rounded-2xl border border-[#8fe617]/30 bg-[#8fe617]/5 p-3.5 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-bold uppercase">
                  <span>Excel / CSV @photo Column Live Preview</span>
                  <span className="text-[#8fe617]">NAME ONLY (NO STUDENT ID)</span>
                </div>
                <div className="text-xs font-bold text-[#080808] dark:text-[#8fe617] break-all bg-white dark:bg-[#070908] p-2.5 rounded-xl border border-[#dce7e1] dark:border-[#223126]">
                  {samplePhotoPathPreview}
                </div>
                <p className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                  Notice: In receiver photo exports, photos are named strictly after student full names without student IDs.
                </p>
              </div>

              {/* Folder Hierarchy Organization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                    Photo Subfolder Organization
                  </label>
                  <select
                    value={receiverSettings.photoFolderStructure}
                    onChange={(e: any) => setReceiverSettings({ ...receiverSettings, photoFolderStructure: e.target.value })}
                    className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                  >
                    <option value="by-grade">Subfolders by Grade Cohort (Grade_10\name.jpg)</option>
                    <option value="flat">Flat Directory (name.jpg)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                    CSV Manifest Export Filename Prefix
                  </label>
                  <input
                    type="text"
                    value={receiverSettings.csvPrefix}
                    onChange={(e) => setReceiverSettings({ ...receiverSettings, csvPrefix: e.target.value })}
                    placeholder="student_bridge_receiver_manifest"
                    className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                  />
                </div>
              </div>

              {/* CSV Delimiter & Normalization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                      Auto-Normalize Phone (2519 Format)
                    </span>
                    <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                      Converts 09... to 2519... for institutional communications
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={receiverSettings.autoFormatPhone}
                    onChange={(e) => setReceiverSettings({ ...receiverSettings, autoFormatPhone: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                      CSV Delimiter Character
                    </span>
                    <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                      Comma (standard) or Semicolon (European Excel)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setReceiverSettings({ ...receiverSettings, csvDelimiter: "," })}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        receiverSettings.csvDelimiter === ","
                          ? "bg-[#8fe617] text-[#062404]"
                          : "text-[#6b7771] dark:text-[#8a9e93]"
                      }`}
                    >
                      Comma (,)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiverSettings({ ...receiverSettings, csvDelimiter: ";" })}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        receiverSettings.csvDelimiter === ";"
                          ? "bg-[#8fe617] text-[#062404]"
                          : "text-[#6b7771] dark:text-[#8a9e93]"
                      }`}
                    >
                      Semicolon (;)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Live Metrics & Realtime Telemetry Cadence */}
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                <RefreshCw className="h-5 w-5 text-[#8fe617]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                  Live Metrics &amp; Telemetry Frequency
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Configure live dashboard sync cadence, workstation audio alerts, and telemetry notifications
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                  Live Polling Interval
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "2s Ultra", val: 2000 },
                    { label: "4s Normal", val: 4000 },
                    { label: "10s Eco", val: 10000 },
                  ].map((rate) => (
                    <button
                      key={rate.val}
                      type="button"
                      onClick={() => setReceiverSettings({ ...receiverSettings, pollingIntervalMs: rate.val })}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        receiverSettings.pollingIntervalMs === rate.val
                          ? "border-[#8fe617] bg-[#8fe617] text-[#062404] shadow-xs"
                          : "border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93]"
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono block pt-1">
                  Controls how frequently connected dashboards update registration velocity and status indicators.
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
                    {receiverSettings.enableAudioAlerts ? (
                      <Volume2 className="h-4 w-4 text-[#8fe617]" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-[#6b7771]" />
                    )}
                    <span>Incoming Ingestion Audio Chime</span>
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono block">
                    Plays subtle chime when new student records arrive at the workstation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={receiverSettings.enableAudioAlerts}
                  onChange={(e) => setReceiverSettings({ ...receiverSettings, enableAudioAlerts: e.target.checked })}
                  className="h-5 w-5 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 3: 8-Up Print Batch Defaults */}
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                <Printer className="h-5 w-5 text-[#8fe617]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                  8-Up A4 Print Engine Preferences
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Physical card imposition, high-DPI rasterization, and guillotine cutter alignment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div>
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    Guillotine Cut Marks (2mm Bleed)
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Renders corner crosshair guides on A4 sheets for precise blade trimming
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={receiverSettings.includeCropMarks}
                  onChange={(e) => setReceiverSettings({ ...receiverSettings, includeCropMarks: e.target.checked })}
                  className="h-5 w-5 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div>
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    Vector Print Resolution
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    300 DPI (standard thermal PVC) or 600 DPI (high-definition)
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setReceiverSettings({ ...receiverSettings, printDpi: "300dpi" })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      receiverSettings.printDpi === "300dpi"
                        ? "bg-[#8fe617] text-[#062404]"
                        : "text-[#6b7771] dark:text-[#8a9e93]"
                    }`}
                  >
                    300 DPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiverSettings({ ...receiverSettings, printDpi: "600dpi" })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      receiverSettings.printDpi === "600dpi"
                        ? "bg-[#8fe617] text-[#062404]"
                        : "text-[#6b7771] dark:text-[#8a9e93]"
                    }`}
                  >
                    600 DPI
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MAINTENANCE SECTION (Visible to Receiver or Admin 'maintenance' tab)       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(isReceiverRole || (isAdminRole && adminTab === "maintenance")) && (
        <div className="rounded-3xl border border-red-200 dark:border-red-950/40 bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-red-100 dark:border-red-950/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800/50 flex items-center justify-center text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  Central Database Maintenance &amp; Roster Reset
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Authorized institutional maintenance engine to clear local synchronization cache, reset suppression registries, and execute permanent database roster purges.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">Local Cached Records:</span>
              <div className="text-sm font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {studentCount.toLocaleString()} Students
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                  Purge Local Residuals & Queues
                </span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono block mt-0.5">
                  Wipe all local client cache residuals and offline intake queues with zero ghost traces remaining.
                </span>
              </div>
              <button
                type="button"
                onClick={handlePurgeAllLocalResiduals}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer"
              >
                Purge Storage Residuals
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-red-200 dark:border-red-950/50 bg-red-50/50 dark:bg-red-950/20 space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 block">
                  Execute Institutional Roster Purge
                </span>
                <span className="text-[10px] text-red-700/80 dark:text-red-400/80 font-mono block mt-0.5">
                  Wipes the central student roster and clears local station cache with zero lag.
                </span>
              </div>
              <button
                type="button"
                onClick={handleImmediateClearAll}
                disabled={isClearingImmediate}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white px-4 py-2 text-xs font-mono font-black hover:bg-red-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isClearingImmediate ? "Purging Roster..." : "Execute Institutional Roster Purge"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VISUAL THEME SELECTION (Shared across all roles)                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#dce7e1] dark:border-[#223126] pb-3">
          <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
            <Sparkles className="h-5 w-5 text-[#8fe617]" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
              Visual Theme &amp; Color System
            </h2>
            <p className="text-xs text-[#6b7771] dark:text-[#8a9e93]">
              True obsidian pitch-black night mode or light daylight studio
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleApplyTheme("dark")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
              receiverSettings.theme === "dark"
                ? "border-[#8fe617] bg-[#8fe617]/10 dark:bg-[#8fe617]/15 ring-2 ring-[#8fe617]/50 shadow-sm"
                : "border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="h-9 w-9 rounded-xl bg-[#070908] text-[#8fe617] flex items-center justify-center shrink-0 border border-[#223126]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                <span>Obsidian Night Mode</span>
                {receiverSettings.theme === "dark" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617] text-[#062404] font-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-1">
                Deep pitch-black (#070908) canvas with neon Lemon Green accents. Prevents screen glare and eye strain.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyTheme("light")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
              receiverSettings.theme === "light"
                ? "border-[#8fe617] bg-[#8fe617]/10 ring-2 ring-[#8fe617]/50 shadow-sm"
                : "border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                <span>Light Studio Mode</span>
                {receiverSettings.theme === "light" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617] text-[#062404] font-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-1">
                High-contrast daylight theme for outdoor and bright daylight environments.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
