import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  ShieldAlert,
  Siren,
  Play,
  Volume2,
  RotateCcw,
  AlertOctagon,
  CheckCircle,
  Flame,
  HeartPulse,
  Send,
  Check,
  Smartphone,
  Info,
  Clock,
  MapPin,
  Mic,
  MicOff,
  User,
  Hospital as HospitalIcon,
  ChevronRight,
  Database,
  Mail,
  Zap,
  Activity,
  PlusSquare,
  BadgeInfo,
  AlertCircle,
  AlertTriangle,
  Ambulance
} from "lucide-react";
import { Hospital, Responder, Incident, Dispatch, NotificationLog, HospitalPreAlert } from "./types";
import InteractiveMap from "./components/InteractiveMap.tsx";
import SqlTerminal from "./components/SqlTerminal.tsx";

export default function App() {
  // DB States synchronized from express full-stack server
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [preAlerts, setPreAlerts] = useState<HospitalPreAlert[]>([]);

  // Simulation UI States
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [trackingPath, setTrackingPath] = useState<{ lat: number; lng: number }[] | null>(null);
  const [activeTab, setActiveTab] = useState<"board" | "sql" | "schemas">("board");
  
  // Simulated Voice / Microphone States
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [aiClassification, setAiClassification] = useState<any>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Simulated IoT parameters
  const [iotAcceleration, setIotAcceleration] = useState(18.2);
  const [iotSpeedDelta, setIotSpeedDelta] = useState(55);
  const [iotCountdown, setIotCountdown] = useState<number | null>(null);
  const [iotTimer, setIotTimer] = useState<any>(null);

  // Active status of browser speech API
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Sync state stats from backend DB
  const refreshDatabaseState = async () => {
    try {
      const response = await fetch("/api/db/state");
      const data = await response.json();
      setHospitals(data.hospitals || []);
      setResponders(data.responders || []);
      setIncidents(data.incidents || []);
      setDispatches(data.dispatches || []);
      setNotifications(data.notifications || []);
      setPreAlerts(data.hospital_pre_alerts || []);

      // Autoselect the first active/newest incident in the simulator
      if (data.incidents && data.incidents.length > 0) {
        // If we don't have selected incident yet, or current one updated
        const active = data.incidents.find((i: any) => i.status !== "RESOLVED" && i.status !== "CANCELLED");
        const current = active || data.incidents[0];
        setSelectedIncident(current);

        // Fetch tracker path if dispatched
        if (current.status === "DISPATCHED" || current.status === "EN_ROUTE" || current.status === "ARRIVED") {
          fetchCoordinatePath(current.id);
        } else if (current.status === "RESOLVED") {
          setTrackingPath(null);
        }
      } else {
        setSelectedIncident(null);
        setTrackingPath(null);
      }
    } catch (err) {
      console.error("Failed to connect to express backend:", err);
    }
  };

  // Fetch coordinates track path for animation
  const fetchCoordinatePath = async (incidentId: string) => {
    try {
      const res = await fetch(`/api/dispatches/${incidentId}/track`);
      if (res.ok) {
        const data = await res.json();
        setTrackingPath(data.path);
      }
    } catch (err) {
      console.error("Coordinate tracking error:", err);
    }
  };

  // Run initial state fetch
  useEffect(() => {
    refreshDatabaseState();
    // Enable browser speech recognition detection
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recObj = new SpeechRecognition();
      recObj.continuous = false;
      recObj.interimResults = false;
      recObj.lang = "en-IN"; // support English Indian accent, standard Hindi transcription automatically resolves

      recObj.onstart = () => {
        setIsRecording(true);
        setMicError(null);
      };

      recObj.onerror = (event: any) => {
        setMicError(`Speech detection: ${event.error}. Use speech presets if microphone access is hindered.`);
        setIsRecording(false);
      };

      recObj.onend = () => {
        setIsRecording(false);
      };

      recObj.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscriptText(resultText);
        runAITriageClassification(resultText);
      };

      recognitionRef.current = recObj;
    }
  }, []);

  // Dispatch live polling of DB status
  useEffect(() => {
    const timer = setInterval(() => {
      refreshDatabaseState();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Voice toggle record trigger
  const toggleRecording = () => {
    if (!speechSupported) {
      setMicError("Speech recognition is not natively supported in your browser. Use the instant Speak Presets!");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscriptText("");
      setMicError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setMicError("Microphone already occupied or locked by frame permissions.");
      }
    }
  };

  // Speak voice output instructions to bystander/user
  const speakInstruction = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger Gemini API classification
  const runAITriageClassification = async (transcript: string) => {
    setTriageLoading(true);
    setAiClassification(null);
    try {
      const response = await fetch("/api/triage/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript,
          latitude: 18.5583 + (Math.random() - 0.5) * 0.05, // Randomize nearby Baner
          longitude: 73.7801 + (Math.random() - 0.5) * 0.05,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setAiClassification(data.data);
      }
    } catch (e) {
      console.error("AI Model error", e);
    } finally {
      setTriageLoading(false);
    }
  };

  // Instant speak button shortcuts
  const selectSpeakPreset = (presetText: string) => {
    setTranscriptText(presetText);
    runAITriageClassification(presetText);
  };

  // Execute full rescue triggering pipeline (Submit SOS)
  const submitRescueSOS = async (classification: any, originalTranscript: string) => {
    if (!classification) return;
    setTriageLoading(true);
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_type: classification.incident_type,
          severity: classification.severity,
          latitude: 18.5583 + (Math.random() - 0.5) * 0.02,
          longitude: 73.7801 + (Math.random() - 0.5) * 0.02,
          voice_transcript: originalTranscript,
          breathing_confirmed: classification.breathing_confirmed,
          fire_present: classification.fire_present,
          victims_count: classification.victims_count,
          injury_keywords: classification.injury_keywords,
          language_detected: classification.language_detected,
        }),
      });
      if (response.ok) {
        setTranscriptText("");
        setAiClassification(null);
        refreshDatabaseState();
      }
    } catch (e) {
      console.error("SOS Placing error:", e);
    } finally {
      setTriageLoading(false);
    }
  };

  // Perform dynamic Postgres SQL queries
  const handleQueryRun = async (sql: string) => {
    try {
      const response = await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Reset entire database to default seeds
  const handleResetDB = async () => {
    if (confirm("Are you sure you want to trigger psql truncate and seed.sql restore?")) {
      try {
        const response = await fetch("/api/db/reset", { method: "POST" });
        if (response.ok) {
          alert("Database states fully restored!");
          refreshDatabaseState();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Update State progression
  const handleStatusUpdate = async (incidentId: string, status: string) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        refreshDatabaseState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Hospital Beds count
  const handleUpdateHospitalBeds = async (hospitalId: string, currentAvailable: number, delta: number) => {
    const newBeds = Math.max(0, currentAvailable + delta);
    try {
      const response = await fetch(`/api/hospitals/${hospitalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icu_beds_available: newBeds }),
      });
      if (response.ok) {
        refreshDatabaseState();
      }
    } catch (err) {
      console.error("Failed to update hospital ICU beds:", err);
    }
  };

  // Update Responder Status
  const handleUpdateResponderStatus = async (responderId: string, status: string) => {
    try {
      const response = await fetch(`/api/responders/${responderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        refreshDatabaseState();
      }
    } catch (err) {
      console.error("Failed to update responder status:", err);
    }
  };

  // Handle simulated IoT automatic acceleration deceleration trigger
  const triggerIoTDecimalCrash = () => {
    // Clear existing counters
    if (iotTimer) clearInterval(iotTimer);
    setIotCountdown(10);

    const timer = setInterval(() => {
      setIotCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIotCountdown(null);
          // If countdown hit zero and is uncancelled, execute immediate IoT critical incident
          triggerActualIoTSos();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    setIotTimer(timer);
  };

  // Actually push the IoT SOS trigger
  const triggerActualIoTSos = async () => {
    try {
      await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_type: "AUTO_CRASH",
          severity: "CRITICAL",
          latitude: 18.6367, // Chinchwad near highway
          longitude: 73.7912,
          voice_transcript: `[AUTO-COLLISION DETECTED via ESP32-001 ADXL345: ${iotAcceleration}G, Delta speed: ${iotSpeedDelta}km/h]`,
          is_iot_triggered: true,
          iot_acceleration_g: iotAcceleration,
          iot_speed_delta_kmh: iotSpeedDelta,
          breathing_confirmed: null,
          fire_present: true,
          victims_count: 2,
          injury_keywords: ["severe-impact-deceleration"],
        }),
      });
      refreshDatabaseState();
    } catch (err) {
      console.error("IoT SOS triggered error", err);
    }
  };

  // Cancel any active IoT countdown (the ESP32 cancel button/app safety check)
  const cancelIoTTrigger = () => {
    if (iotTimer) {
      clearInterval(iotTimer);
      setIotTimer(null);
    }
    setIotCountdown(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. Global Navigation Frame */}
      <header className="border-b border-slate-900 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/20">
            <Siren className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-extrabold tracking-tight text-white flex items-center gap-1.5 uppercase font-mono">
              RoadSoS
              <span className="text-[10px] font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">
                COERS HACKATHON CORE 2026
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Voice-First AI Triage & IoT Crash Emergency Network Emulator (PostGIS + Gemini 3.5)
            </p>
          </div>
        </div>

        {/* System Node Connection status lights */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-full px-3 py-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gemini Classify: ONLINE</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-full px-3 py-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>PostgreSql PostGIS: SIMULATED</span>
          </div>

          <button
            onClick={handleResetDB}
            className="flex items-center gap-1.5 bg-slate-800/70 hover:bg-slate-700 active:bg-slate-900 px-3.5 py-1.5 rounded-lg text-[11px] border border-slate-700/60 font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
            <span>Restore seed.sql</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workstation Dashboard Container */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        
        {/* LEFT COLUMN: Simulated Victim App Interface (4 columns) */}
        <section className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden flex flex-col shadow-2xl min-h-[750px] max-w-sm mx-auto w-full">
            {/* Phone Speaker/notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 flex items-center justify-center z-10">
              <div className="w-28 h-3.5 bg-black rounded-b-xl flex items-center justify-center">
                <div className="w-12 h-1 bg-neutral-800 rounded-full"></div>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 pt-9 pb-4 px-5 border-b border-slate-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-rose-500 font-bold font-mono">
                <ShieldAlert className="w-4 h-4 animate-bounce" />
                <span className="text-[10px] tracking-widest">RoadSoS EMERGENCY PORTAL</span>
              </div>
              <div className="text-slate-400 font-mono text-[9px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                GPS Locked: Baner Corridor
              </div>
            </div>

            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto max-h-[660px]">
              
              {/* LARGE VOICE TRIGGER SOS SECTOR */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden backdrop-blur-sm">
                
                {/* Accent Background light glow */}
                <div className="absolute inset-0 bg-rose-900/5 filter blur-3xl rounded-full"></div>

                <p className="text-xs text-slate-300 px-4 leading-relaxed relative">
                  Say distress phrase like <span className="font-bold text-rose-400 font-mono">"car crash, ambulance!"</span> or hit speak preset.
                </p>

                {/* Pulsing Trigger SOS circular widget */}
                <button
                  onClick={toggleRecording}
                  className={`w-36 h-36 rounded-full flex flex-col items-center justify-center relative cursor-pointer outline-none border transition-all duration-300 group ${
                    isRecording
                      ? "bg-rose-500 border-white shadow-lg shadow-rose-500/20"
                      : "bg-gradient-to-tr from-rose-700 to-rose-500 border-rose-400/30 hover:scale-105 active:scale-95 shadow-xl shadow-rose-950/40"
                  }`}
                >
                  <div className="absolute inset-0 rounded-full bg-rose-600 animate-ping opacity-15"></div>
                  {isRecording ? (
                    <>
                      <Mic className="w-12 h-12 text-white animate-pulse" />
                      <span className="text-[10px] text-rose-100 font-bold uppercase tracking-widest mt-1">LISTENING...</span>
                    </>
                  ) : (
                    <>
                      <Siren className="w-12 h-12 text-white group-hover:rotate-12 duration-200" />
                      <span className="text-xl font-black text-white tracking-tighter uppercase font-mono">PULSE SOS</span>
                      <span className="text-[9px] text-rose-100/80 uppercase font-bold tracking-widest mt-0.5">PRESS OR SPEAK</span>
                    </>
                  )}
                </button>

                {micError && (
                  <div className="text-[10px] text-amber-400 border border-amber-500/10 bg-amber-500/5 px-2.5 py-1.5 rounded-lg leading-snug">
                    {micError}
                  </div>
                )}

                {/* Instant voice triggers presets */}
                <div className="w-full">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-2 px-1 uppercase tracking-wider">
                    <span>Speak Simulation Presets:</span>
                    <span>Tap to Sim</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => selectSpeakPreset("Accident ho gaya hai, pair toot gaya!")}
                      className="w-full bg-slate-950 hover:bg-slate-800 text-left px-3 py-2 rounded-lg text-[11px] border border-slate-800/80 text-slate-300 hover:text-rose-400 flex items-center justify-between transition-all"
                    >
                      <span className="truncate">"Accident ho gaya, pair toot gaya!"</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      onClick={() => selectSpeakPreset("Severe accident on expressway, ambulance block with fire!")}
                      className="w-full bg-slate-950 hover:bg-slate-800 text-left px-3 py-2 rounded-lg text-[11px] border border-slate-800/80 text-slate-300 hover:text-rose-400 flex items-center justify-between transition-all"
                    >
                      <span className="truncate">"Severe highway crash, fire at scene"</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      onClick={() => selectSpeakPreset("Mera dost behosh hai, help chahiye saans le raha hai")}
                      className="w-full bg-slate-950 hover:bg-slate-800 text-left px-3 py-2 rounded-lg text-[11px] border border-slate-800/80 text-slate-300 hover:text-rose-400 flex items-center justify-between transition-all"
                    >
                      <span className="truncate">"He's unconscious, breathing is weak"</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>

              {/* AUTOMATED COUNTDOWN IF ESP32 IoT TRIGGER FIRE */}
              {iotCountdown !== null && (
                <div className="bg-gradient-to-r from-rose-950/80 to-amber-950/80 border-2 border-rose-500 p-4 rounded-2xl text-center shadow-lg relative flex flex-col gap-2">
                  <div className="absolute top-2 right-2 animate-ping w-2 h-2 rounded-full bg-rose-500"></div>
                  <div className="flex items-center justify-center gap-1.5 text-rose-400 font-extrabold text-xs uppercase tracking-wider font-mono">
                    <AlertTriangle className="w-4 h-4" />
                    <span>AUTOMATIC CRASH DETECTED</span>
                  </div>
                  <p className="text-[11px] text-slate-200">
                    Buzzer & LED alerting in vehicle. Dispatching Help automatic in:
                  </p>
                  <span className="text-4xl font-mono text-white font-extrabold py-1">
                    {iotCountdown}s
                  </span>
                  <button
                    onClick={cancelIoTTrigger}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs uppercase cursor-pointer"
                  >
                    DISMISS / FALSE ALARM (BOOT PIN)
                  </button>
                </div>
              )}

              {/* TRANSCRIPT RESULTS & ACTION TRIGGER IN PROGRESS */}
              {transcriptText && (
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800 pb-1.5">
                    <span>Captured Transcript:</span>
                    <span className="text-rose-500">STT Active</span>
                  </div>
                  <p className="italic font-medium text-slate-200">
                    "{transcriptText}"
                  </p>
                </div>
              )}

              {/* LIVE AI TRIAGE ESTIMATION CARD */}
              {(triageLoading || aiClassification) && (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                      Gemini 3.5 AI Classifier
                    </span>
                    {triageLoading && (
                      <span className="text-[10px] text-rose-400 animate-pulse font-mono font-semibold">
                        PROCESSING TRAUMA...
                      </span>
                    )}
                  </div>

                  {triageLoading && (
                    <div className="py-6 flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[11px] text-slate-400 font-mono">Running triage guidelines...</span>
                    </div>
                  )}

                  {!triageLoading && aiClassification && (
                    <div className="flex flex-col gap-3 text-xs leading-relaxed">
                      
                      {/* Emergency Metadata */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Incident Type</span>
                          <span className="font-bold text-white text-[11px] flex items-center gap-1 mt-0.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            {aiClassification.incident_type}
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Severity Tier</span>
                          <span className={`font-bold text-[11px] block mt-0.5 uppercase ${
                            aiClassification.severity === "CRITICAL"
                              ? "text-red-500"
                              : aiClassification.severity === "HIGH"
                              ? "text-amber-500"
                              : "text-blue-400"
                          }`}>
                            {aiClassification.severity}
                          </span>
                        </div>
                      </div>

                      {/* Urgency justification reason */}
                      <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-2 border border-slate-800 rounded-lg">
                        <span className="font-bold text-slate-400 font-mono text-[9px] uppercase block mb-0.5">AI Urgency Reason:</span>
                        {aiClassification.urgency_reason}
                      </p>

                      {/* First Aid Guidance steps (TTS integrated) */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1">
                          <span className="text-[9px] font-bold text-rose-400 font-mono uppercase tracking-wider">
                            AI Step-by-Step Guidance
                          </span>
                          <button
                            onClick={() => speakInstruction(aiClassification.first_aid_instructions.join(". "))}
                            className="bg-slate-800 hover:bg-slate-700 p-1 px-1.5 rounded text-[9px] font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3 text-emerald-400" />
                            Speak List
                          </button>
                        </div>
                        <ul className="space-y-1.5 text-[10px] text-slate-300">
                          {aiClassification.first_aid_instructions.map((step: string, idx: number) => (
                            <li key={idx} className="flex gap-1.5 leading-snug">
                              <span className="text-rose-500 font-bold shrink-0">{idx + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Dispatch Trigger action button */}
                      <button
                        onClick={() => submitRescueSOS(aiClassification, transcriptText)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl uppercase flex items-center justify-center gap-2 cursor-pointer shadow shadow-emerald-950/20 text-xs"
                      >
                        <Check className="w-4 h-4 shrink-0" />
                        <span>CONFIRM DISPATCH ALL HELP</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MOBILE SIMULATED ACTIVE INCIDENT CARD */}
              {selectedIncident && (
                <div className="bg-slate-900 border-2 border-emerald-500/20 p-4 rounded-2xl flex flex-col gap-3 relative">
                  <div className="absolute top-2.5 right-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest leading-none">
                    {selectedIncident.status}
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold text-[12px] flex items-center gap-1 uppercase tracking-tight">
                      <Siren className="w-4 h-4 text-emerald-400" />
                      SOS #{selectedIncident.id} Active
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Reported: {new Date(selectedIncident.reported_at).toLocaleTimeString() || "Live Now"}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 border border-slate-800 rounded-lg">
                    <span className="text-slate-500 text-[9px] uppercase font-mono block">GPS Landmark Coordinates</span>
                    <span className="text-slate-200 font-bold text-[10.5px] block mt-0.5">
                      {selectedIncident.landmark || "Baner Overpass Bridge"} ({selectedIncident.latitude.toFixed(4)}N, {selectedIncident.longitude.toFixed(4)}E)
                    </span>
                  </div>

                  {/* Allocated unit if dispatched */}
                  {selectedIncident.status !== "REPORTED" && (
                    <div className="bg-emerald-950/20 border border-emerald-900/60 p-3 rounded-xl flex items-start gap-2.5">
                      <Ambulance className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold block">Assigned Responder</span>
                        <span className="text-slate-100 font-extrabold font-mono text-xs block py-0.5">
                          MH-14-EU-4720 (ALS Unit)
                        </span>
                        <span className="text-[10px] text-slate-300">
                          Vijay Gaikwad (Driver) - ETA: 4 mins
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status alert timeline actions */}
                  <div className="flex gap-1.5 border-t border-slate-800/80 pt-3">
                    <button
                      onClick={() => handleStatusUpdate(selectedIncident.id, "ARRIVED")}
                      disabled={selectedIncident.status === "ARRIVED" || selectedIncident.status === "RESOLVED"}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-1.5 rounded-lg text-[10px] uppercase cursor-pointer disabled:opacity-30"
                    >
                      Mark Arrived
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedIncident.id, "RESOLVED")}
                      disabled={selectedIncident.status === "RESOLVED"}
                      className="flex-1 bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold p-1.5 rounded-lg text-[10px] uppercase cursor-pointer disabled:opacity-30"
                    >
                      Resolve Handover
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedIncident.id, "CANCELLED")}
                      className="bg-slate-800/50 hover:bg-red-950/20 text-slate-400 hover:text-red-400 p-1.5 rounded-lg text-[10px] cursor-pointer"
                      title="Mark False Alarm / Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Footer button space */}
            <div className="bg-slate-900 border-t border-slate-800/80 py-4 px-6 flex items-center justify-between text-neutral-400 z-10 text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> Dial 112 Fallback
              </span>
              <span className="font-mono text-[9px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-neutral-300">
                ACTIVE SECURITY RULE V16
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Admin Panels & Database visualizer (8 columns) */}
        <section className="xl:col-span-8 flex flex-col gap-6">
          
          {/* MAP TRACKING PREVIEW */}
          <InteractiveMap
            hospitals={hospitals}
            responders={responders}
            activeIncident={selectedIncident}
            trackPath={trackingPath}
          />

          {/* LOWER INTERACTIVE TAB WORKSPACE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col flex-1">
            
            {/* Header Tabs */}
            <div className="bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("board")}
                  className={`py-3.5 text-xs uppercase tracking-wider font-extrabold font-mono border-b-2 cursor-pointer transition-all ${
                    activeTab === "board"
                      ? "border-rose-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Incident Dispatch pipeline
                </button>
                <button
                  onClick={() => setActiveTab("sql")}
                  className={`py-3.5 text-xs uppercase tracking-wider font-extrabold font-mono border-b-2 cursor-pointer transition-all ${
                    activeTab === "sql"
                      ? "border-rose-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Diagnostic Postgres Terminal
                </button>
                <button
                  onClick={() => setActiveTab("schemas")}
                  className={`py-3.5 text-xs uppercase tracking-wider font-extrabold font-mono border-b-2 cursor-pointer transition-all ${
                    activeTab === "schemas"
                      ? "border-rose-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  database/schema.sql Code
                </button>
              </div>

              {/* Counts indicator */}
              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 border border-slate-800 rounded">
                  <span>Hospitals: {hospitals.length}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 border border-slate-800 rounded">
                  <span>Responders: {responders.length}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 border border-slate-800 rounded">
                  <span>Active incidents: {incidents.filter((i) => i.status !== "RESOLVED").length}</span>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: INCIDENT BOARD DIAGNOSTICS */}
            {activeTab === "board" && (
              <div className="p-6 flex flex-col gap-6">
                
                {/* Seed trigger mock IoT device trigger */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4.5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-rose-500 shrink-0">
                      <Zap className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase font-mono flex items-center gap-1.5">
                        ESP32 DevKit C Simulator (Core Hardware)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Simulates sudden deceleration threshold crash alert from ADXL-345 3-axis accelerometer sensor.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800/80 rounded-lg p-1.5 px-3">
                      <div className="text-xs font-mono">
                        <span className="text-slate-500 text-[9px] block uppercase">G Force Impact</span>
                        <input
                          type="number"
                          step="0.1"
                          value={iotAcceleration}
                          onChange={(e) => setIotAcceleration(parseFloat(e.target.value) || 15)}
                          className="w-12 bg-transparent text-rose-400 font-bold border-0 p-0 m-0 outline-none text-xs"
                        />
                      </div>
                      <div className="text-xs font-mono border-l border-slate-800 pl-3">
                        <span className="text-slate-500 text-[9px] block uppercase">Speed Drop</span>
                        <span className="text-slate-200 font-bold">-{iotSpeedDelta} km/h</span>
                      </div>
                    </div>

                    <button
                      onClick={triggerIoTDecimalCrash}
                      className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wide cursor-pointer transition-all shadow shadow-rose-950/20"
                    >
                      SIMULATE ESP32 CRASH TRIGGER
                    </button>
                  </div>
                </div>

                {/* Grid listing alerts log channels and pre-alerts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* SMS Feeds delivered logs */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-rose-500" /> Outbound SMS Notifications (Twilio)
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 uppercase">SIM800L Cellular Active</span>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-[10px] font-mono">
                          No messages triggered in this simulation sequence yet. Run SOS above to watch Twilio dispatch messages.
                        </div>
                      ) : (
                        notifications.map((sms) => (
                          <div key={sms.id} className="bg-slate-900 p-2.5 border border-slate-800/60 rounded-lg text-[10px]">
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pb-1 border-b border-slate-800">
                              <span>Recipient: {sms.recipient_name} ({sms.recipient})</span>
                              <span className="text-emerald-400 font-bold px-1 py-0.2 bg-emerald-500/10 rounded">DELIVERED</span>
                            </div>
                            <p className="text-slate-300 font-mono mt-1 px-1.5 border-l-2 border-rose-500 leading-relaxed italic">
                              "{sms.message_body}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Hospital pre-alerts REST webhook web logs */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <HospitalIcon className="w-3.5 h-3.5 text-blue-500" /> Trauma Hub REST Webhooks Pre-Alerts
                      </span>
                      <span className="text-[9px] font-mono text-blue-400 uppercase">Active Dispatch Sync</span>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {preAlerts.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-[10px] font-mono">
                          No pre-alerts received by hospitals yet. Dispatched incidents push telemetry webhooks.
                        </div>
                      ) : (
                        preAlerts.map((alert) => (
                          <div key={alert.id} className="bg-slate-900/60 p-2.5 border border-slate-800/60 rounded-lg text-[10px]">
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pb-1 border-b border-slate-800">
                              <span>Hospital: Sassoon Trauma Center (Webhook: Sassoon API)</span>
                              <span className="text-blue-400 font-bold">API POST 200 SUCCESS</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1.5 text-[9px] font-mono text-slate-400 bg-slate-950 p-2 rounded">
                              <div>
                                <span className="text-slate-500 block">Incident Type</span>
                                <span className="text-white font-extrabold">{alert.incident_type}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Trauma Severity</span>
                                <span className="text-rose-400 font-extrabold">{alert.severity}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Blood Group</span>
                                <span className="text-white font-bold">{alert.victim_blood_group}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Ambulance ETA</span>
                                <span className="text-emerald-400 font-extrabold">{Math.round(alert.eta_minutes)} mins</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Incidents Table overview */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-500" /> Active Emergency Distresses Registry
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">{incidents.length} total rows inside SQL log</span>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto pr-1">
                    <table className="w-full text-left font-mono text-[10.5px]">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider h-8">
                          <th className="font-bold">Incident ID</th>
                          <th className="font-bold">Distress Text Transcript</th>
                          <th className="font-bold">Trigger</th>
                          <th className="font-bold">Severity</th>
                          <th className="font-bold">Status</th>
                          <th className="font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 text-slate-300">
                        {incidents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-500 leading-snug">
                              Emergency log is currently blank. Speak a distress phrase or press simulated IoT crash on top!
                            </td>
                          </tr>
                        ) : (
                          incidents.map((inc) => (
                            <tr
                              key={inc.id}
                              onClick={() => setSelectedIncident(inc)}
                              className={`hover:bg-slate-900/40 h-10 transition-colors cursor-pointer ${
                                selectedIncident?.id === inc.id ? "bg-slate-900/50" : ""
                              }`}
                            >
                              <td className="font-bold text-slate-100">{inc.id}</td>
                              <td className="max-w-[150px] truncate" title={inc.voice_transcript || ""}>
                                "{inc.voice_transcript || ""}"
                              </td>
                              <td className="text-slate-400">{inc.location_method}</td>
                              <td>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                  inc.severity === "CRITICAL"
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                    : inc.severity === "HIGH"
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-500"
                                }`}>
                                  {inc.severity}
                                </span>
                              </td>
                              <td>
                                <span className="font-bold text-slate-400 text-[10px]">{inc.status}</span>
                              </td>
                              <td className="text-right">
                                <span className="text-rose-500 text-[9px] font-bold group-hover:underline">
                                  Review Telemetry ►
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* HOSPITALS & RESPONDERS CO-ORGANIZATION CONTROL FLUID GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Hospital Resource Panel */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <HospitalIcon className="w-4 h-4 text-blue-500" /> Trauma Hospital Bed Management
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">Live Resource Control</span>
                    </div>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {hospitals.map((hosp) => (
                        <div key={hosp.id} className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <h5 className="font-bold text-white flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              {hosp.name}
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {hosp.trauma_level} • {hosp.city}, {hosp.state}
                            </p>
                            <p className="text-[9px] font-mono text-slate-500 mt-1">
                              Emergency: {hosp.phone_emergency}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-mono">ICU Beds:</span>
                              <span className={`font-bold font-mono text-[11px] px-1.5 py-0.2 rounded ${
                                hosp.icu_beds_available > 10 ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                              }`}>
                                {hosp.icu_beds_available} / {hosp.icu_beds_total}
                              </span>
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleUpdateHospitalBeds(hosp.id, hosp.icu_beds_available, -1)}
                                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-bold px-2 py-0.5 rounded text-[10px] border border-slate-700/60 cursor-pointer"
                                title="Subtract Available Bed"
                              >
                                -1 Bed
                              </button>
                              <button
                                onClick={() => handleUpdateHospitalBeds(hosp.id, hosp.icu_beds_available, 1)}
                                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-bold px-2 py-0.5 rounded text-[10px] border border-slate-700/60 cursor-pointer"
                                title="Add Available Bed"
                              >
                                +1 Bed
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Responder Fleet Panel */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Ambulance className="w-4 h-4 text-emerald-500" /> Active Emergency Responder Fleet
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">Live Team Tracking</span>
                    </div>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {responders.map((resp) => (
                        <div key={resp.id} className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <h5 className="font-bold text-white flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                resp.status === "AVAILABLE" ? "bg-emerald-500" :
                                resp.status === "DISPATCHED" ? "bg-amber-500 animate-ping" :
                                resp.status === "ON_SCENE" ? "bg-rose-500 animate-pulse" : "bg-slate-600"
                              }`}></span>
                              {resp.call_sign}
                              <span className="text-[9px] font-normal text-slate-400 font-mono bg-slate-950 px-1.5 py-0.2 border border-slate-800 rounded">
                                {resp.responder_type === "AMBULANCE_ALS" ? "ALS" : resp.responder_type === "AMBULANCE_BLS" ? "BLS" : resp.responder_type}
                              </span>
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Driver: {resp.driver_name} ({resp.vehicle_number})
                            </p>
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                              Paramedic Contact: {resp.driver_phone}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                              resp.status === "AVAILABLE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" :
                              resp.status === "DISPATCHED" ? "bg-amber-500/10 text-amber-400 border-amber-500/10" :
                              resp.status === "ON_SCENE" ? "bg-rose-500/10 text-rose-400 border-rose-500/10" : "bg-slate-500/10 text-slate-400 border-slate-500/10"
                            }`}>
                              {resp.status}
                            </span>

                            <select
                              value={resp.status}
                              onChange={(e) => handleUpdateResponderStatus(resp.id, e.target.value)}
                              className="bg-slate-900 border border-slate-800 hover:border-slate-700 font-mono rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none cursor-pointer"
                            >
                              <option value="AVAILABLE">AVAILABLE Mode</option>
                              <option value="DISPATCHED">DISPATCHED Mode</option>
                              <option value="EN_ROUTE">EN_ROUTE Mode</option>
                              <option value="ON_SCENE">ON_SCENE Mode</option>
                              <option value="OFFLINE">OFFLINE Maintenance</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT: SQL TERMINAL */}
            {activeTab === "sql" && (
              <div className="p-6 h-full flex flex-col justify-between">
                <SqlTerminal onRunQuery={handleQueryRun} />
              </div>
            )}

            {/* TAB CONTENT: SCHEMAS DISPLAY */}
            {activeTab === "schemas" && (
              <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-b-2xl max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4 text-xs">
                  <span className="font-bold text-rose-500 font-mono flex items-center gap-1.5 uppercase">
                    <Database className="w-4 h-4 text-blue-500" /> schema.sql (PostgreSQL + PostGIS Exts)
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">READ ONLY PRODUCTION TARGET</span>
                </div>
                <pre className="text-[10px] font-mono leading-relaxed text-slate-300 select-text overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-800/80">
{`-- ============================================================
-- RoadSoS Database Schema: PostgreSQL 16 + PostGIS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema Enumerations
CREATE TYPE incident_type AS ENUM ('ACCIDENT', 'INJURY', 'FIRE', 'UNCONSCIOUS', 'AUTO_CRASH', 'UNKNOWN');
CREATE TYPE severity_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE incident_status AS ENUM ('REPORTED', 'TRIAGED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED', 'CANCELLED');

-- Primary Core Incident Table
CREATE TABLE incidents (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID REFERENCES users(id),
    incident_type         incident_type NOT NULL,
    severity              severity_level NOT NULL DEFAULT 'HIGH',
    status                incident_status NOT NULL DEFAULT 'REPORTED',
    location              GEOMETRY(POINT, 4326) NOT NULL, -- Point (Lng, Lat)
    address_resolved      TEXT,
    landmark              TEXT,
    voice_transcript      TEXT,
    language_detected     VARCHAR(5),
    victims_count         INT DEFAULT 1,
    fire_present          BOOLEAN DEFAULT FALSE,
    is_iot_triggered      BOOLEAN DEFAULT FALSE,
    reported_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Hospitals Verified registry
CREATE TABLE hospitals (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(200) NOT NULL,
    location             GEOMETRY(POINT, 4326) NOT NULL,
    trauma_level         VARCHAR(15) DEFAULT 'LEVEL_2',
    phone_emergency      VARCHAR(15) NOT NULL,
    icu_beds_available   INT DEFAULT 0,
    webhook_url          TEXT,
    is_active            BOOLEAN DEFAULT TRUE
);

-- Indexing GIS points for high performance ETA math
CREATE INDEX idx_hospitals_location ON hospitals USING GIST(location);
CREATE INDEX idx_incidents_location ON incidents USING GIST(location);`}
                </pre>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* 3. Global Dashboard Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4.5 px-6 font-mono text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-between mt-auto">
        <span>RoadSoS Smart EMS Response • IIT Madras Hackathon Project Core</span>
        <div className="flex gap-4">
          <span>Firmware target: Esp32 v3.1</span>
          <span>STT Engine: OpenAi Whisper + Claude.Triage</span>
          <span>PostgreSQL PostGIS calibrated</span>
        </div>
      </footer>
    </div>
  );
}
