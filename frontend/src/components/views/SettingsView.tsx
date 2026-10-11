"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

// ============================================================================
// STREAMLINED SETTINGS SCHEMA (APPLE-INSPIRED ESSENTIALS ONLY)
// ============================================================================

export interface EssentialSettings {
  // 1. Signal Actuation
  controllerMode: "kinetica" | "fixed";
  minGreenSeconds: number; // 5 - 25s (default: 10s)
  maxGreenSeconds: number; // 30 - 90s (default: 60s)
  gapOutSeconds: number; // 1.0 - 5.0s (default: 2.5s)

  // 2. Emergency Preemption
  emergencyPreemption: boolean; // 108 Ambulance / Fire Override
  schoolZoneProtection: boolean; // Active School Zone Clearance
  greenWaveLookahead: 1 | 2 | 3 | 5; // Lookahead intersections

  // 3. Connectivity & Telemetry
  gatewayUrl: string;
  tomtomApiKey: string; // Not hardcoded; empty string by default, inherits from server .env.local

  // 4. Workstation Preferences
  emergencyChimeAlert: boolean;
  unitSystem: "metric" | "imperial";
  operatorName: string;
}

export const DEFAULT_ESSENTIAL_SETTINGS: EssentialSettings = {
  controllerMode: "kinetica",
  minGreenSeconds: 10,
  maxGreenSeconds: 60,
  gapOutSeconds: 2.5,
  emergencyPreemption: true,
  schoolZoneProtection: true,
  greenWaveLookahead: 3,
  gatewayUrl: "http://127.0.0.1:8000",
  tomtomApiKey: "", // Never hardcoded
  emergencyChimeAlert: true,
  unitSystem: "metric",
  operatorName: "Officer S. Ramanathan · IX-104",
};

const STORAGE_KEY = "kinetica_apple_settings_v1";

interface ToastNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
}

// ── APPLE-STYLE SWITCH TOGGLE ────────────────────────────────────────────────
function AppleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked
          ? "bg-state-calm shadow-[0_0_12px_rgba(16,185,129,0.35)]"
          : "bg-surface-high/80 dark:bg-surface-highest/80"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── APPLE-STYLE SEGMENTED CONTROL ────────────────────────────────────────────
function AppleSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="bg-surface-mid/60 dark:bg-surface-low/80 p-1 rounded-2xl flex items-center shadow-inner dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_3px_rgba(0,0,0,0.5)] w-full">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
              isActive
                ? "bg-surface dark:bg-surface-high text-on-surface shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_0_0_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(0,0,0,0.45)] font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const loadSavedSettings = (): EssentialSettings => {
  if (typeof window === "undefined") return DEFAULT_ESSENTIAL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure any legacy hardcoded key is scrubbed
      if (parsed.tomtomApiKey && parsed.tomtomApiKey.includes("kG6z9X8Q2mP")) {
        parsed.tomtomApiKey = "";
      }
      return { ...DEFAULT_ESSENTIAL_SETTINGS, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_ESSENTIAL_SETTINGS;
};

export default function SettingsView() {
  const [savedSettings, setSavedSettings] = useState<EssentialSettings>(loadSavedSettings);
  const [settings, setSettings] = useState<EssentialSettings>(loadSavedSettings);
  const [showTomTomKey, setShowTomTomKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [isEnvKeyDetected, setIsEnvKeyDetected] = useState<boolean>(true);

  // Ping gateway test state
  const [pingStatus, setPingStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check TomTom API status on mount
  useEffect(() => {
    fetch("/api/tile/tomtom?type=status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.configured === "boolean") {
          setIsEnvKeyDetected(data.configured);
        }
      })
      .catch(() => {
        // keep default
      });
  }, []);

  const addToast = (type: ToastNotification["type"], title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  const updateSetting = <K extends keyof EssentialSettings>(key: K, value: EssentialSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setSavedSettings(settings);
        setIsSaving(false);
        addToast("success", "Settings Applied", "Controller calibration deployed to active runtime.");
      } catch (err: unknown) {
        setIsSaving(false);
        const msg = err instanceof Error ? err.message : "Save failed.";
        addToast("error", "Save Failed", msg);
      }
    }, 250);
  };

  const handleDiscard = () => {
    setSettings(savedSettings);
    addToast("info", "Changes Reverted", "Restored previously active settings.");
  };

  const handleConfirmReset = () => {
    setSettings(DEFAULT_ESSENTIAL_SETTINGS);
    setSavedSettings(DEFAULT_ESSENTIAL_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ESSENTIAL_SETTINGS));
    } catch {
      // ignore
    }
    setShowResetConfirm(false);
    addToast("success", "Factory Defaults", "Settings restored to Webster 1958 & Kinetica baseline.");
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinetica-settings-IX104-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("info", "Settings Exported", "Configuration backup file downloaded.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.tomtomApiKey && parsed.tomtomApiKey.includes("kG6z9X8Q2mP")) {
          parsed.tomtomApiKey = "";
        }
        const merged: EssentialSettings = { ...DEFAULT_ESSENTIAL_SETTINGS, ...parsed };
        setSettings(merged);
        addToast("success", "Settings Imported", `Loaded configuration from ${file.name}.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid JSON file.";
        addToast("error", "Import Error", msg);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTestChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        addToast("warning", "Audio Unsupported", "Web Audio API is not available.");
        return;
      }
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1175, now + 0.16);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(587.33, now + 0.16);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);

      addToast("info", "Audio Test", "Emergency priority alert chime played.");
    } catch {
      addToast("warning", "Audio Test Failed", "Could not trigger local speaker audio.");
    }
  };

  const handleTestPing = async () => {
    setPingStatus("testing");
    const start = performance.now();
    try {
      const res = await fetch("/api/results", { method: "GET" });
      const lat = Math.round(performance.now() - start);
      setPingLatency(lat);
      if (res.ok) {
        setPingStatus("success");
        addToast("success", "Gateway Online", `Response verified in ${lat}ms.`);
      } else {
        setPingStatus("error");
        addToast("warning", "Gateway Response", `Server returned HTTP ${res.status}.`);
      }
    } catch {
      const lat = Math.round(performance.now() - start);
      setPingLatency(lat);
      setPingStatus("error");
      addToast("error", "Gateway Offline", "Could not connect to FastAPI backend.");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 w-full max-w-[1640px] mx-auto pb-16">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />

      {/* Toast Notifications */}
      <div className="fixed top-16 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-2xl flex items-start gap-3 transition-all animate-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-state-calm/15 border-state-calm/40 text-on-surface"
                : toast.type === "error"
                ? "bg-state-preempted/15 border-state-preempted/40 text-on-surface"
                : toast.type === "warning"
                ? "bg-state-building/15 border-state-building/40 text-on-surface"
                : "bg-surface-high border-outline text-on-surface"
            }`}
          >
            <span
              className={`material-symbols-rounded text-lg shrink-0 mt-0.5 ${
                toast.type === "success"
                  ? "text-state-calm"
                  : toast.type === "error"
                  ? "text-state-preempted"
                  : toast.type === "warning"
                  ? "text-state-building"
                  : "text-primary"
              }`}
            >
              {toast.type === "success"
                ? "check_circle"
                : toast.type === "error"
                ? "error"
                : toast.type === "warning"
                ? "warning"
                : "info"}
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="font-display text-xs font-bold leading-tight">{toast.title}</h5>
              <p className="font-body text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-on-surface-variant hover:text-on-surface text-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-rounded text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-surface/90 dark:bg-surface/95 backdrop-blur-3xl rounded-3xl p-6 max-w-md w-full shadow-2xl dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center gap-3 text-state-building">
              <span className="material-symbols-rounded text-2xl">restart_alt</span>
              <h3 className="font-display font-semibold text-base text-on-surface">
                Reset to Defaults?
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              This will restore all controller bounds, green timing limits, emergency overrides, and gap-out thresholds to the certified baseline.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-high text-on-surface hover:bg-surface-mid transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-state-building text-black hover:brightness-110 transition-all cursor-pointer shadow-sm"
              >
                Reset Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. GLOBAL TOOLBAR (IDENTICAL DESIGN TO INTERSECTION TELEMETRY) ───── */}
      <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-4.5 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_8px_28px_-4px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs dark:shadow-[0_0_0_1px_rgba(59,130,246,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <span className="material-symbols-rounded text-2xl">tune</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-base font-semibold text-on-surface tracking-tight">
                Controller Settings & Calibration
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-state-calm/10 text-state-calm dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-state-calm animate-pulse" />
                Live Node IX-104
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              Sholinganallur Junction Arterial Gateway · Adaptive Actuation & Safety Parameters
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-1.5 bg-surface dark:bg-surface-high/70 hover:bg-surface-high text-on-surface rounded-2xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
            title="Reset parameters to defaults"
          >
            <span className="material-symbols-rounded text-base">rotate_left</span>
            <span>Defaults</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-surface dark:bg-surface-high/70 hover:bg-surface-high text-on-surface rounded-2xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
            title="Import JSON settings file"
          >
            <span className="material-symbols-rounded text-base">upload</span>
            <span>Import</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 bg-surface dark:bg-surface-high/70 hover:bg-surface-high text-on-surface rounded-2xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
            title="Export settings snapshot"
          >
            <span className="material-symbols-rounded text-base">download</span>
            <span>Export</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={`px-4 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
              hasUnsavedChanges
                ? "bg-primary text-white hover:bg-primary/90 shadow-[0_0_16px_rgba(59,130,246,0.35)]"
                : "bg-surface dark:bg-surface-high/50 text-on-surface-variant/40 border border-outline/30 cursor-not-allowed opacity-50"
            }`}
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-rounded text-base">save</span>
            )}
            <span>{hasUnsavedChanges ? "Save Changes" : "Saved"}</span>
          </button>
        </div>
      </section>

      {/* ── 2. DYNAMIC ISLAND HERO CALIBRATION STATUS ───────────────────────── */}
      <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.11)_inset,0_12px_32px_-6px_rgba(0,0,0,0.7),0_3px_8px_-1px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Tile 1: Active Controller Mode */}
          <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-on-surface-variant font-medium block uppercase tracking-wider">
              Control Strategy
            </span>
            <span className="text-base font-bold text-on-surface font-display block mt-1">
              {settings.controllerMode === "kinetica" ? "Kinetica Dynamic" : "Fixed-Timer"}
            </span>
            <span className="text-[10px] text-state-calm font-medium block mt-0.5">
              {settings.controllerMode === "kinetica" ? "Demand-Responsive" : "Static 20s"}
            </span>
          </div>

          {/* Tile 2: Green Phase Range */}
          <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-on-surface-variant font-medium block uppercase tracking-wider">
              Green Bounds
            </span>
            <span className="text-base font-bold text-on-surface font-telemetry block mt-1">
              {settings.minGreenSeconds}s – {settings.maxGreenSeconds}s
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block mt-0.5">
              Gap-out: {settings.gapOutSeconds}s
            </span>
          </div>

          {/* Tile 3: Saturation Flow Baseline (Matching IntersectionDetailView) */}
          <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-on-surface-variant font-medium block uppercase tracking-wider">
              Saturation Flow
            </span>
            <span className="text-base font-bold text-on-surface font-telemetry block mt-1">
              1,900
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block mt-0.5">
              veh/hr/lane (Webster)
            </span>
          </div>

          {/* Tile 4: Emergency Override */}
          <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-on-surface-variant font-medium block uppercase tracking-wider">
              108 Preemption
            </span>
            <span className="text-base font-bold text-state-preempted font-display block mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-state-preempted animate-pulse" />
              {settings.emergencyPreemption ? "Armed & Active" : "Disabled"}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block mt-0.5">
              Wave: {settings.greenWaveLookahead} Nodes
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. APPLE-STYLE GROUPED SETTINGS CARDS GRID (2 COLUMNS) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* COLUMN 1, CARD 1: ADAPTIVE SIGNAL TIMING */}
        <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)] flex flex-col gap-5 justify-between">
          <div className="flex justify-between items-center pb-1 border-b border-outline/50">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-primary text-xl">traffic</span>
              <h2 className="font-display text-sm font-semibold text-on-surface">
                Adaptive Signal Timing
              </h2>
            </div>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase">
              Webster Demand
            </span>
          </div>

          <div className="space-y-4">
            {/* Control Mode Segmented Selector */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-on-surface">Controller Strategy</span>
                <span className="text-[10px] text-on-surface-variant">
                  {settings.controllerMode === "kinetica" ? "Real-time queue adaptation" : "Fixed-cycle round-robin"}
                </span>
              </div>
              <AppleSegmentedControl
                value={settings.controllerMode}
                onChange={(val) => updateSetting("controllerMode", val)}
                options={[
                  { value: "kinetica", label: "Kinetica Dynamic" },
                  { value: "fixed", label: "Fixed-Timer (20s)" },
                ]}
              />
            </div>

            {/* Minimum Green Time Slider */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-on-surface block">Minimum Green Phase</span>
                  <span className="text-[10px] text-on-surface-variant">Pedestrian safety floor</span>
                </div>
                <span className="font-telemetry font-bold text-state-calm text-sm">
                  {settings.minGreenSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={settings.minGreenSeconds}
                onChange={(e) => updateSetting("minGreenSeconds", Number(e.target.value))}
                className="w-full accent-state-calm cursor-pointer h-1.5 bg-surface-high/60 rounded-full"
              />
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                <span>5s</span>
                <span>10s (Baseline)</span>
                <span>25s</span>
              </div>
            </div>

            {/* Maximum Green Time Slider */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-on-surface block">Maximum Green Phase</span>
                  <span className="text-[10px] text-on-surface-variant">Surge cutoff ceiling</span>
                </div>
                <span className="font-telemetry font-bold text-state-building text-sm">
                  {settings.maxGreenSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={settings.maxGreenSeconds}
                onChange={(e) => updateSetting("maxGreenSeconds", Number(e.target.value))}
                className="w-full accent-state-building cursor-pointer h-1.5 bg-surface-high/60 rounded-full"
              />
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                <span>30s</span>
                <span>60s (Standard)</span>
                <span>90s</span>
              </div>
            </div>

            {/* Dynamic Gap-Out Passage Time Slider */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-on-surface block">Vehicle Gap-Out Time</span>
                  <span className="text-[10px] text-on-surface-variant">Queue dissipation passage threshold</span>
                </div>
                <span className="font-telemetry font-bold text-primary text-sm">
                  {settings.gapOutSeconds.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.1}
                value={settings.gapOutSeconds}
                onChange={(e) => updateSetting("gapOutSeconds", Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-1.5 bg-surface-high/60 rounded-full"
              />
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                <span>1.0s (Quick cut)</span>
                <span>2.5s (Calibrated)</span>
                <span>5.0s (Smooth)</span>
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN 1, CARD 2: EMERGENCY PREEMPTION & GREEN WAVES */}
        <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)] flex flex-col gap-5 justify-between">
          <div className="flex justify-between items-center pb-1 border-b border-outline/50">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-state-preempted text-xl">emergency</span>
              <h2 className="font-display text-sm font-semibold text-on-surface">
                Emergency Priority & Green Waves
              </h2>
            </div>
            <span className="text-[10px] font-mono text-state-preempted uppercase font-bold">
              Code 3 Preemption
            </span>
          </div>

          <div className="space-y-4">
            {/* 108 Emergency Ambulance Toggle */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-on-surface block">
                  108 Ambulance Priority Override
                </span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  Preempts signal immediately upon optical or emergency responder detection.
                </span>
              </div>
              <AppleSwitch
                checked={settings.emergencyPreemption}
                onChange={(val) => updateSetting("emergencyPreemption", val)}
              />
            </div>

            {/* School Zone Protection Toggle */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-on-surface block">
                  School Zone Auto-Protection
                </span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  Elevates school van clearance priority during 07:30–09:00 & 14:30–16:00 IST.
                </span>
              </div>
              <AppleSwitch
                checked={settings.schoolZoneProtection}
                onChange={(val) => updateSetting("schoolZoneProtection", val)}
              />
            </div>

            {/* Corridor Green Wave Lookahead */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-medium text-on-surface block">Green Wave Lookahead Depth</span>
                  <span className="text-[10px] text-on-surface-variant">Preclears downstream corridor signals</span>
                </div>
                <span className="font-telemetry font-bold text-primary text-sm">
                  {settings.greenWaveLookahead} Nodes
                </span>
              </div>
              <AppleSegmentedControl
                value={settings.greenWaveLookahead}
                onChange={(val) => updateSetting("greenWaveLookahead", val as 1 | 2 | 3 | 5)}
                options={[
                  { value: 1, label: "1 Node" },
                  { value: 2, label: "2 Nodes" },
                  { value: 3, label: "3 Nodes" },
                  { value: 5, label: "5 Nodes" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* COLUMN 2, CARD 3: GATEWAY & LIVE TRAFFIC CONNECTIVITY */}
        <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)] flex flex-col gap-5 justify-between">
          <div className="flex justify-between items-center pb-1 border-b border-outline/50">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-primary text-xl">hub</span>
              <h2 className="font-display text-sm font-semibold text-on-surface">
                Gateway & Live Traffic
              </h2>
            </div>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase">
              Uplink & GIS
            </span>
          </div>

          <div className="space-y-4">
            {/* FastAPI Gateway Endpoint with Ping Status */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-on-surface">FastAPI Telemetry Gateway</span>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={pingStatus === "testing"}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-high hover:bg-surface text-on-surface border border-outline transition-all cursor-pointer"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      pingStatus === "success"
                        ? "bg-state-calm"
                        : pingStatus === "error"
                        ? "bg-state-preempted"
                        : pingStatus === "testing"
                        ? "bg-primary animate-ping"
                        : "bg-on-surface-variant"
                    }`}
                  />
                  <span>
                    {pingStatus === "success"
                      ? `Online (${pingLatency}ms)`
                      : pingStatus === "error"
                      ? "Offline"
                      : pingStatus === "testing"
                      ? "Pinging..."
                      : "Check Link"}
                  </span>
                </button>
              </div>
              <input
                type="text"
                value={settings.gatewayUrl}
                onChange={(e) => updateSetting("gatewayUrl", e.target.value)}
                className="w-full bg-surface dark:bg-surface-high/60 border border-outline/60 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* TomTom Live Flow API Key - Loaded via Environment */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface">TomTom Traffic Flow API</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-state-calm/10 text-state-calm">
                    <span className="w-1.5 h-1.5 rounded-full bg-state-calm" />
                    {isEnvKeyDetected ? "Configured in .env.local" : "Server Configured"}
                  </span>
                </div>
                {settings.tomtomApiKey && (
                  <button
                    type="button"
                    onClick={() => setShowTomTomKey(!showTomTomKey)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <span className="material-symbols-rounded text-xs">
                      {showTomTomKey ? "visibility_off" : "visibility"}
                    </span>
                    <span>{showTomTomKey ? "Hide" : "Reveal"}</span>
                  </button>
                )}
              </div>
              <input
                type={showTomTomKey ? "text" : "password"}
                value={settings.tomtomApiKey}
                placeholder="Inherited from server environment (.env.local)"
                onChange={(e) => updateSetting("tomtomApiKey", e.target.value)}
                className="w-full bg-surface dark:bg-surface-high/60 border border-outline/60 rounded-xl px-3 py-2 text-xs font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary tracking-wider"
              />
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                Managed securely on the server via <code className="text-primary font-mono">TOMTOM_API_KEY</code>. Optional custom override can be set above.
              </p>
            </div>
          </div>
        </section>

        {/* COLUMN 2, CARD 4: WORKSTATION PREFERENCES & AUDIO ALERTS */}
        <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)] flex flex-col gap-5 justify-between">
          <div className="flex justify-between items-center pb-1 border-b border-outline/50">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-primary text-xl">person</span>
              <h2 className="font-display text-sm font-semibold text-on-surface">
                Workstation Preferences
              </h2>
            </div>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase">
              Audio & Units
            </span>
          </div>

          <div className="space-y-4">
            {/* Emergency Audio Chime Alert */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-on-surface block">
                  Acoustic Emergency Alert Chime
                </span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  Play dual-tone audio alert on priority ambulance preemption.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleTestChime}
                  className="px-2.5 py-1 rounded-xl bg-surface dark:bg-surface-high text-[11px] font-medium text-on-surface-variant hover:text-on-surface border border-outline/60 transition-all cursor-pointer shadow-xs"
                >
                  Test Chime
                </button>
                <AppleSwitch
                  checked={settings.emergencyChimeAlert}
                  onChange={(val) => updateSetting("emergencyChimeAlert", val)}
                />
              </div>
            </div>

            {/* Units Segmented Control */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-on-surface">Telemetry Units</span>
                <span className="text-[10px] text-on-surface-variant">Speed & distance format</span>
              </div>
              <AppleSegmentedControl
                value={settings.unitSystem}
                onChange={(val) => updateSetting("unitSystem", val)}
                options={[
                  { value: "metric", label: "Metric (km/h & m)" },
                  { value: "imperial", label: "Imperial (mph & ft)" },
                ]}
              />
            </div>

            {/* Operator Station Call-Sign */}
            <div className="p-4 rounded-2xl bg-surface-mid/40 dark:bg-surface-mid/60 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_4px_14px_rgba(0,0,0,0.4)] space-y-2">
              <span className="text-xs font-medium text-on-surface block">
                Operator Station Call-Sign
              </span>
              <input
                type="text"
                value={settings.operatorName}
                onChange={(e) => updateSetting("operatorName", e.target.value)}
                className="w-full bg-surface dark:bg-surface-high/60 border border-outline/60 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── 4. FLOATING DOCK FOR UNSAVED CHANGES (APPLE STYLE) ──────────────── */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[90%] p-3.5 sm:p-4 rounded-3xl bg-surface/85 dark:bg-surface/90 backdrop-blur-3xl border border-primary/30 shadow-2xl dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_36px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-state-building/20 flex items-center justify-center text-state-building shrink-0">
              <span className="material-symbols-rounded text-lg">edit</span>
            </div>
            <div>
              <span className="font-display text-xs font-bold text-on-surface block">
                Unsaved Modifications
              </span>
              <span className="text-[10px] text-on-surface-variant block">
                Controller calibration changed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDiscard}
              className="px-3.5 py-1.5 rounded-2xl bg-surface-high/80 text-xs text-on-surface-variant hover:text-on-surface transition-all cursor-pointer font-medium"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-primary/30"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-rounded text-sm">save</span>
              )}
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
