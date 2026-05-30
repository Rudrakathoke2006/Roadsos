import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { dbInstance, Incident, Dispatch, NotificationLog, HospitalPreAlert } from "./server/db.js";

// Load environment configurations
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI client of @google/genai with correct custom User-Agent
const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper: Haversine distance in KM
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// ============================================================
// API ROUTES
// ============================================================

// 1. Live Database Queries (Postgres Simulator)
app.post("/api/db/query", (req, res) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: "SQL query string is required" });
  }
  try {
    const result = dbInstance.query(sql);
    res.json({ success: true, columns: result.columns, rows: result.rows });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Fetch Raw Database States
app.get("/api/db/state", (req, res) => {
  res.json(dbInstance.getRawState());
});

// 3. AI Triage Classification Engine
app.post("/api/triage/classify", async (req, res) => {
  const { transcript, latitude, longitude } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: "Voice transcript of incident is required" });
  }

  const lat = latitude || 18.5204;
  const lng = longitude || 73.8567;

  try {
    const systemPrompt = `You are RoadSoS, a context-aware emergency triage dispatch AI.
Analyze the user voice transcript (often in mixed English, Hindi, and Marathi like code-switching) of an accident.
Classify the parameters precisely and respond ONLY in valid JSON conforming exactly to the schema.

Classification guidelines:
- Severity: CRITICAL (conscious state compromised, major bleeding, no breathing, unconscious), HIGH (injuries, active crash with fire, multiple cars), MEDIUM (minor pain, single vehicle off-road, flat tire with mild scratch), LOW (breakdown, minor debris, conscious).
- Incident Type: ACCIDENT, INJURY, FIRE, UNCONSCIOUS, POLICE_NEEDED, AMBULANCE_NEEDED, AUTO_CRASH, UNKNOWN.
- Priority: AMBULANCE_FIRST, POLICE_FIRST, FIRE_FIRST, ALL, MEDICAL_ONLY.
- Language: HI, MR, EN, MIX.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Voice transcript: "${transcript}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incident_type: {
              type: Type.STRING,
              description: "Primary incident type"
            },
            severity: {
              type: Type.STRING,
              description: "Emergency tier level"
            },
            dispatch_priority: {
              type: Type.STRING,
              description: "Dispatched rescue priority order"
            },
            victims_count: {
              type: Type.INTEGER,
              description: "Suspected victims count"
            },
            breathing_confirmed: {
              type: Type.BOOLEAN,
              description: "Is the victim breathing"
            },
            fire_present: {
              type: Type.BOOLEAN,
              description: "Is active fire or smoke present at scene"
            },
            injury_keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Injury keywords found (e.g. pain, fracture, blood, head injury)"
            },
            location_hints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Landmarks, highway names, cities mentioned"
            },
            language_detected: {
              type: Type.STRING,
              description: "Language detected (HI, MR, EN, MIX)"
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence scoring from 0 to 1"
            },
            first_aid_instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Clear sequential actions to shout to bystander/victim"
            },
            urgency_reason: {
              type: Type.STRING,
              description: "Reasoning for the severity classification in english"
            }
          },
          required: [
            "incident_type",
            "severity",
            "dispatch_priority",
            "victims_count",
            "fire_present",
            "confidence",
            "first_aid_instructions",
            "urgency_reason"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No output text received from Gemini API");
    }

    const jsonParsed = JSON.parse(text);
    res.json({ success: true, data: jsonParsed });
  } catch (err: any) {
    console.error("AI Triage Model Error:", err);
    // Offline / API Fault Mode Fallback keyword analysis
    const t = transcript.toLowerCase();
    let type: any = "ACCIDENT";
    let severity: any = "HIGH";
    let priority: any = "AMBULANCE_FIRST";
    let instructions = ["Keep victim still.", "Apply pressure to active bleeders."];

    if (t.includes("behosh") || t.includes("unconscious") || t.includes("saans")) {
      type = "UNCONSCIOUS";
      severity = "CRITICAL";
      priority = "AMBULANCE_FIRST";
      instructions = ["Perform head-tilt chin-lift.", "Ensure airway is open.", "Prepare CPR if breathing ceases."];
    } else if (t.includes("aag") || t.includes("fire") || t.includes("dhuan") || t.includes("blast")) {
      type = "FIRE";
      severity = "HIGH";
      priority = "FIRE_FIRST";
      instructions = ["Evacuate at least 50m from vehicle.", "Do not inhale active smoke."];
    } else if (t.includes("chot") || t.includes("blood") || t.includes("blood") || t.includes("khoon")) {
      type = "INJURY";
      severity = "HIGH";
      priority = "AMBULANCE_FIRST";
      instructions = ["Apply clean pressure to wounds.", "Elevate bleeding limb."];
    }

    res.json({
      success: true,
      fallback: true,
      data: {
        incident_type: type,
        severity: severity,
        dispatch_priority: priority,
        victims_count: 1,
        breathing_confirmed: t.includes("saans Nahi") ? false : true,
        fire_present: t.includes("fire") || t.includes("aag"),
        injury_keywords: t.includes("khoon") ? ["bleeding"] : ["injuries"],
        location_hints: [],
        language_detected: "MIX",
        confidence: 0.85,
        first_aid_instructions: instructions,
        urgency_reason: "Keyword matches categorized active incident offline.",
      }
    });
  }
});

// 4. Create Incident (Triggers Automated Rank/Dispatch Pipeline)
app.post("/api/incidents", (req, res) => {
  const {
    incident_type,
    severity,
    latitude,
    longitude,
    voice_transcript,
    address_resolved,
    landmark,
    language_detected,
    is_iot_triggered,
    iot_acceleration_g,
    iot_speed_delta_kmh,
    injury_keywords,
    fire_present,
    breathing_confirmed,
    victims_count,
    photo_url
  } = req.body;

  const lat = latitude || 18.5204;
  const lng = longitude || 73.8567;

  // New incident entity
  const id = `inc-${Date.now()}`;
  const newIncident: Incident = {
    id,
    user_id: "user-victim-demo",
    incident_type: incident_type || "ACCIDENT",
    severity: severity || "HIGH",
    status: "REPORTED",
    dispatch_priority: severity === "CRITICAL" ? "AMBULANCE_FIRST" : "ALL",
    latitude: lat,
    longitude: lng,
    location_accuracy_m: 12,
    location_method: is_iot_triggered ? "IOT" : "GPS",
    address_resolved: address_resolved || "Pune-Mumbai Highway Corridor, near Baner",
    landmark: landmark || "Baner Overpass Bridge",
    voice_transcript: voice_transcript || "Simulated distress triggering Sos beacon",
    language_detected: language_detected || "EN",
    ai_confidence: 0.95,
    victims_count: victims_count || 1,
    breathing_confirmed: breathing_confirmed !== undefined ? breathing_confirmed : true,
    fire_present: fire_present || false,
    injury_keywords: injury_keywords || [],
    is_iot_triggered: is_iot_triggered || false,
    iot_acceleration_g,
    iot_speed_delta_kmh,
    photo_url: photo_url || null,
    photo_severity: severity || null,
    reported_at: new Date().toISOString(),
    dispatched_at: null,
    resolved_at: null,
  };

  dbInstance.addIncident(newIncident);

  // AUTOMATED RANKING PIPELINE
  // 1. Identify nearest verified Hospitals ordered by Haversine Distance
  const activeHospitals = dbInstance.getHospitals().filter((h) => h.is_active);
  const rankedHospitals = activeHospitals
    .map((h) => ({
      ...h,
      distance_km: getHaversineDistance(lat, lng, h.latitude, h.longitude),
      eta_min: Math.round(getHaversineDistance(lat, lng, h.latitude, h.longitude) * 2 + 3) // Estimate traffic speeds
    }))
    .sort((a, b) => a.distance_km - b.distance_km);

  // 2. Identify nearest Responders ordered by distance
  const activeResponders = dbInstance.getResponders().filter((r) => r.is_active && r.status === "AVAILABLE");
  const rankedResponders = activeResponders
    .map((r) => ({
      ...r,
      distance_km: getHaversineDistance(lat, lng, r.latitude, r.longitude),
      eta_min: Math.round(getHaversineDistance(lat, lng, r.latitude, r.longitude) * 1.8 + 2)
    }))
    .sort((a, b) => a.distance_km - b.distance_km);

  // 3. Execute Automated Dispatch (Select closest ambulance or unit)
  let allocatedResponder = null;
  let eta_min = 10;
  let distance_km = 4.5;
  let chosenHospital = rankedHospitals[0] || null;

  if (rankedResponders.length > 0) {
    const selected = rankedResponders[0];
    allocatedResponder = selected;
    eta_min = selected.eta_min;
    distance_km = selected.distance_km;

    // Transition responder status to Dispatched
    dbInstance.updateResponder(selected.id, {
      status: "DISPATCHED",
      last_activity: new Date().toISOString(),
    });

    // Create a Dispatch record
    const dispatchId = `disp-${Date.now()}`;
    const newDispatch: Dispatch = {
      id: dispatchId,
      incident_id: id,
      responder_id: selected.id,
      dispatched_by: null, // automatic dispatch system
      is_auto_dispatch: true,
      distance_km: selected.distance_km,
      estimated_eta_min: selected.eta_min,
      actual_eta_min: null,
      hospital_id: chosenHospital ? chosenHospital.id : null,
      dispatched_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(), // auto accepted in sandbox demo
      departed_at: new Date().toISOString(),
      arrived_at: null,
      patient_handover: null,
    };
    dbInstance.addDispatch(newDispatch);

    // Update incident state to DISPATCHED
    dbInstance.updateIncident(id, {
      status: "DISPATCHED",
      dispatched_at: new Date().toISOString(),
    });
  }

  // 4. Send Automated Pre-alerts to the hospital trauma ward
  if (chosenHospital) {
    const preAlert: HospitalPreAlert = {
      id: `alert-${Date.now()}`,
      incident_id: id,
      hospital_id: chosenHospital.id,
      eta_minutes: eta_min,
      incident_type: newIncident.incident_type,
      severity: newIncident.severity,
      victim_blood_group: "O_POS",
      victim_allergies: ["Penicillin"],
      injury_summary: (injury_keywords || []).join(", ") || `${newIncident.incident_type} trauma victim`,
      special_needs: fire_present ? "Burn unit preparedness required" : "Trauma bay alert triggered",
      sent_at: new Date().toISOString(),
      webhook_status: 200,
    };
    dbInstance.addHospitalPreAlert(preAlert);
  }

  // 5. Send Automated SMS alerts logs to Emergency Contacts
  const demoContacts = dbInstance.state.emergency_contacts;
  demoContacts.forEach((contact) => {
    const smsLog: NotificationLog = {
      id: `sms-${Date.now()}-${Math.round(Math.random() * 100)}`,
      incident_id: id,
      channel: "SMS",
      recipient: contact.phone,
      recipient_name: contact.name,
      message_body: `🚨 RoadSoS: ${newIncident.is_iot_triggered ? "AUTOMATED IOT CRASH DETECTED" : "EMERGENCY ALERT"} for your contact Ramesh Pawar. Location: Baner Highway, Pune (http://maps.google.com/?q=${lat},${lng}). Ambulance MH-14-EU-4720 dispatched, ETA: ${eta_min} mins.`,
      status: "DELIVERED",
      sent_at: new Date().toISOString(),
    };
    dbInstance.addNotification(smsLog);
  });

  res.json({
    success: true,
    incident_id: id,
    incident: newIncident,
    nearest_hospital: chosenHospital,
    allocated_responder: allocatedResponder,
    eta_min,
    distance_km,
  });
});

// Update Incident Status
app.patch("/api/incidents/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }

  const updated = dbInstance.updateIncident(id, {
    status,
    resolved_at: status === "RESOLVED" ? new Date().toISOString() : null,
  });

  if (!updated) {
    return res.status(404).json({ error: "Incident not found" });
  }

  // Also transition associated dispatches and responders
  const dispatches = dbInstance.getDispatches().filter((d) => d.incident_id === id);
  if (dispatches.length > 0) {
    const currentDispatch = dispatches[0];
    if (status === "ARRIVED") {
      dbInstance.updateDispatch(currentDispatch.id, { arrived_at: new Date().toISOString() });
      dbInstance.updateResponder(currentDispatch.responder_id, { status: "ON_SCENE" });
    } else if (status === "RESOLVED") {
      dbInstance.updateDispatch(currentDispatch.id, { patient_handover: new Date().toISOString() });
      dbInstance.updateResponder(currentDispatch.responder_id, { status: "AVAILABLE" });
    } else if (status === "CANCELLED" || status === "FALSE_ALARM") {
      dbInstance.updateResponder(currentDispatch.responder_id, { status: "AVAILABLE" });
    }
  }

  res.json({ success: true, incident: updated });
});

// PATCH /api/hospitals/:id - Update ICU beds availability or active status
app.patch("/api/hospitals/:id", (req, res) => {
  const { id } = req.params;
  const { icu_beds_available, is_active } = req.body;
  const updates: any = {};
  if (icu_beds_available !== undefined) {
    updates.icu_beds_available = parseInt(icu_beds_available, 10);
  }
  if (is_active !== undefined) {
    updates.is_active = is_active === true;
  }
  const updated = dbInstance.updateHospital(id, updates);
  if (!updated) {
    return res.status(404).json({ error: "Hospital not found" });
  }
  res.json({ success: true, hospital: updated });
});

// PATCH /api/responders/:id - Toggle status of active responders
app.patch("/api/responders/:id", (req, res) => {
  const { id } = req.params;
  const { status, driver_name, driver_phone } = req.body;
  const updates: any = {};
  if (status !== undefined) {
    updates.status = status;
  }
  if (driver_name !== undefined) {
    updates.driver_name = driver_name;
  }
  if (driver_phone !== undefined) {
    updates.driver_phone = driver_phone;
  }
  const updated = dbInstance.updateResponder(id, updates);
  if (!updated) {
    return res.status(404).json({ error: "Responder not found" });
  }
  res.json({ success: true, responder: updated });
});

// Seed Restore Endpoint (Reset DB to clean state)
app.post("/api/db/reset", (req, res) => {
  dbInstance.reset();
  res.json({ success: true, message: "Database resets and seeded values restored successfully" });
});

// Simulated GPS Track Path for Active Ambulance
app.get("/api/dispatches/:incident_id/track", (req, res) => {
  const { incident_id } = req.params;
  const activeDispatch = dbInstance.getDispatches().find((d) => d.incident_id === incident_id);
  if (!activeDispatch) {
    return res.status(404).json({ error: "No active dispatch associated with this incident" });
  }

  // Generate sequence of coordinate points from responder starting location to incident location to simulate movement
  const responder = dbInstance.getResponders().find((r) => r.id === activeDispatch.responder_id);
  const incident = dbInstance.getIncidents().find((i) => i.id === incident_id);

  if (!responder || !incident) {
    return res.status(404).json({ error: "Responder or Incident records could not be traced" });
  }

  // Create 10 steps of path interpolation
  const pathCoordinates = [];
  for (let i = 0; i <= 10; i++) {
    const ratio = i / 10;
    const lat = responder.latitude + (incident.latitude - responder.latitude) * ratio;
    const lng = responder.longitude + (incident.longitude - responder.longitude) * ratio;
    pathCoordinates.push({ lat, lng });
  }

  res.json({
    success: true,
    start: { lat: responder.latitude, lng: responder.longitude },
    end: { lat: incident.latitude, lng: incident.longitude },
    path: pathCoordinates,
  });
});

// ============================================================
// VITE CLIENT/SERVER HANDLERS
// ============================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RoadSoS Server Running] Pointing to: http://localhost:${PORT}`);
  });
}

startServer();
