import fs from "fs";
import path from "path";

// Define strict TypeScript types mirroring the schema.sql definition
export interface DBUser {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: "VICTIM" | "ADMIN" | "HOSPITAL_STAFF" | "DISPATCHER" | "DRIVER" | "VOLUNTEER" | "SUPER_ADMIN";
  blood_group: string;
  allergies: string[];
  medical_conditions: string[];
  current_medications: string[];
  preferred_language: "HI" | "MR" | "EN";
  is_cpr_certified: boolean;
  is_volunteer_active: boolean;
  fcm_token: string | null;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
}

export interface Hospital {
  id: string;
  name: string;
  short_name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  phone_emergency: string;
  phone_main: string;
  email: string;
  webhook_url: string;
  trauma_level: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "CLINIC";
  has_icu: boolean;
  icu_beds_total: number;
  icu_beds_available: number;
  has_trauma_bay: boolean;
  is_govt: boolean;
  is_active: boolean;
}

export interface Responder {
  id: string;
  responder_type: "AMBULANCE_ALS" | "AMBULANCE_BLS" | "POLICE" | "FIRE" | "TRAFFIC_POLICE";
  call_sign: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  hospital_id: string | null;
  latitude: number;
  longitude: number;
  status: "AVAILABLE" | "DISPATCHED" | "EN_ROUTE" | "ON_SCENE" | "OFFLINE";
  is_als: boolean;
  is_active: boolean;
  last_activity: string;
}

export interface Incident {
  id: string;
  user_id: string | null;
  incident_type: "ACCIDENT" | "INJURY" | "FIRE" | "UNCONSCIOUS" | "POLICE_NEEDED" | "AMBULANCE_NEEDED" | "UNKNOWN" | "AUTO_CRASH";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "REPORTED" | "TRIAGED" | "DISPATCHED" | "EN_ROUTE" | "ARRIVED" | "RESOLVED" | "CANCELLED" | "FALSE_ALARM";
  dispatch_priority: "AMBULANCE_FIRST" | "POLICE_FIRST" | "FIRE_FIRST" | "ALL" | "MEDICAL_ONLY";
  latitude: number;
  longitude: number;
  location_accuracy_m: number;
  location_method: "GPS" | "LBS" | "MANUAL" | "IOT";
  address_resolved: string;
  landmark: string;
  voice_transcript: string | null;
  language_detected: "HI" | "MR" | "EN" | "MIX" | null;
  ai_confidence: number;
  victims_count: number;
  breathing_confirmed: boolean | null;
  fire_present: boolean;
  injury_keywords: string[];
  is_iot_triggered: boolean;
  iot_acceleration_g?: number;
  iot_speed_delta_kmh?: number;
  iot_device_id?: string;
  photo_url: string | null;
  photo_severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  reported_at: string;
  dispatched_at: string | null;
  resolved_at: string | null;
}

export interface Dispatch {
  id: string;
  incident_id: string;
  responder_id: string;
  dispatched_by: string | null;
  is_auto_dispatch: boolean;
  distance_km: number;
  estimated_eta_min: number;
  actual_eta_min: number | null;
  hospital_id: string | null;
  dispatched_at: string;
  accepted_at: string | null;
  departed_at: string | null;
  arrived_at: string | null;
  patient_handover: string | null;
}

export interface NotificationLog {
  id: string;
  incident_id: string | null;
  channel: "SMS" | "FCM_PUSH" | "WEBHOOK" | "WHATSAPP";
  recipient: string;
  recipient_name: string;
  message_body: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  sent_at: string;
}

export interface HospitalPreAlert {
  id: string;
  incident_id: string;
  hospital_id: string;
  eta_minutes: number;
  incident_type: string;
  severity: string;
  victim_blood_group: string;
  victim_allergies: string[];
  injury_summary: string;
  special_needs: string;
  sent_at: string;
  webhook_status: number;
}

export interface FirstAidProtocol {
  id: string;
  incident_type: string;
  severity: string;
  language: "HI" | "MR" | "EN";
  title: string;
  steps: string[];
  do_not: string[];
}

export interface DatabaseState {
  users: DBUser[];
  emergency_contacts: EmergencyContact[];
  hospitals: Hospital[];
  responders: Responder[];
  incidents: Incident[];
  dispatches: Dispatch[];
  notifications: NotificationLog[];
  hospital_pre_alerts: HospitalPreAlert[];
  first_aid_protocols: FirstAidProtocol[];
}

const DB_FILE_PATH = path.join(process.cwd(), "roadsos_db.json");

// Core Seeding Data
const initialUsers: DBUser[] = [
  {
    id: "user-victim-demo",
    phone: "+919876543210",
    name: "Ramesh Pawar",
    email: "ramesh.pawar@gmail.com",
    role: "VICTIM",
    blood_group: "O_POS",
    allergies: ["Penicillin", "Sulfa drugs"],
    medical_conditions: ["Hypertension"],
    current_medications: ["Amlodipine 5mg"],
    preferred_language: "HI",
    is_cpr_certified: false,
    is_volunteer_active: false,
    fcm_token: "fcm-demo-token-1",
    created_at: new Date().toISOString(),
  },
  {
    id: "user-driver-als",
    phone: "+919822334455",
    name: "Suresh Gaikwad",
    email: "suresh.g@roadsos.in",
    role: "DRIVER",
    blood_group: "B_POS",
    allergies: [],
    medical_conditions: [],
    current_medications: [],
    preferred_language: "MR",
    is_cpr_certified: true,
    is_volunteer_active: false,
    fcm_token: "fcm-demo-token-2",
    created_at: new Date().toISOString(),
  },
  {
    id: "user-driver-bls",
    phone: "+919811223344",
    name: "Abhishek Patil",
    email: "abhishek.p@roadsos.in",
    role: "DRIVER",
    blood_group: "A_POS",
    allergies: [],
    medical_conditions: [],
    current_medications: [],
    preferred_language: "HI",
    is_cpr_certified: true,
    is_volunteer_active: false,
    fcm_token: "fcm-demo-token-3",
    created_at: new Date().toISOString(),
  }
];

const initialEmergencyContacts: EmergencyContact[] = [
  {
    id: "contact-1",
    user_id: "user-victim-demo",
    name: "Sunita Pawar",
    phone: "+919876543211",
    relationship: "Spouse",
    priority: 1,
  },
  {
    id: "contact-2",
    user_id: "user-victim-demo",
    name: "Amit Pawar",
    phone: "+919876543212",
    relationship: "Brother",
    priority: 2,
  },
];

const initialHospitals: Hospital[] = [
  {
    id: "hosp-sassoon",
    name: "Sassoon General Hospital",
    short_name: "Sassoon Trauma Center",
    latitude: 18.5286,
    longitude: 73.8631,
    address: "Near Pune Railway Station, Sangamvadi",
    city: "Pune",
    state: "Maharashtra",
    phone_emergency: "020-26128000",
    phone_main: "020-26126000",
    email: "emergency@sassoonpune.gov.in",
    webhook_url: "https://api.sassoonpune.gov.in/v1/pre-alerts",
    trauma_level: "LEVEL_1",
    has_icu: true,
    icu_beds_total: 120,
    icu_beds_available: 48,
    has_trauma_bay: true,
    is_govt: true,
    is_active: true,
  },
  {
    id: "hosp-ruby",
    name: "Ruby Hall Clinic (Trauma Hub)",
    short_name: "Ruby Hall",
    latitude: 18.5318,
    longitude: 73.8732,
    address: "40, Sassoon Road, Sangamvadi",
    city: "Pune",
    state: "Maharashtra",
    phone_emergency: "020-66455100",
    phone_main: "020-66455000",
    email: "emergency@rubyhall.com",
    webhook_url: "https://api.rubyhall.com/trauma/receiver",
    trauma_level: "LEVEL_1",
    has_icu: true,
    icu_beds_total: 80,
    icu_beds_available: 12,
    has_trauma_bay: true,
    is_govt: false,
    is_active: true,
  },
  {
    id: "hosp-jupiter",
    name: "Jupiter Hospital (Baner Highway)",
    short_name: "Jupiter Baner",
    latitude: 18.5583,
    longitude: 73.7801,
    address: "Baner - Balewadi Road, Pune-Bangalore Highway",
    city: "Pune",
    state: "Maharashtra",
    phone_emergency: "020-27211112",
    phone_main: "020-27211111",
    email: "trauma@jupiterhospital.com",
    webhook_url: "https://pester.jupiterhospital.com/api/v1/roadsos",
    trauma_level: "LEVEL_1",
    has_icu: true,
    icu_beds_total: 90,
    icu_beds_available: 19,
    has_trauma_bay: true,
    is_govt: false,
    is_active: true,
  },
  {
    id: "hosp-sahyadri",
    name: "Sahyadri Super Speciality Hospital",
    short_name: "Sahyadri Deccan",
    latitude: 18.5134,
    longitude: 73.8412,
    address: "30-C, Erandwane, Karve Road",
    city: "Pune",
    state: "Maharashtra",
    phone_emergency: "020-67213000",
    phone_main: "020-67215000",
    email: "coordination@sahyadrihospital.com",
    webhook_url: "https://hospitalapi.sahyadri.com/road-safety/sos",
    trauma_level: "LEVEL_2",
    has_icu: true,
    icu_beds_total: 50,
    icu_beds_available: 8,
    has_trauma_bay: true,
    is_govt: false,
    is_active: true,
  },
  {
    id: "hosp-chinchwad",
    name: "Lokmanya Hospital (Chinchwad Highway Hub)",
    short_name: "Lokmanya Chinchwad",
    latitude: 18.6367,
    longitude: 73.7912,
    address: "Chinchwad Station, Old Pune-Mumbai Highway",
    city: "PCMC",
    state: "Maharashtra",
    phone_emergency: "020-27473333",
    phone_main: "020-30612000",
    email: "icu@lokmanya.in",
    webhook_url: "https://lokmanya.in/api/sos-catcher",
    trauma_level: "LEVEL_1",
    has_icu: true,
    icu_beds_total: 100,
    icu_beds_available: 34,
    has_trauma_bay: true,
    is_govt: false,
    is_active: true,
  }
];

const initialResponders: Responder[] = [
  {
    id: "resp-amb-47",
    responder_type: "AMBULANCE_ALS",
    call_sign: "PCMC-AMB-ALS-47",
    vehicle_number: "MH-14-EU-4720",
    driver_name: "Vijay Gaikwad",
    driver_phone: "+919876543110",
    hospital_id: "hosp-chinchwad",
    latitude: 18.6180,
    longitude: 73.7710,
    status: "AVAILABLE",
    is_als: true,
    is_active: true,
    last_activity: new Date().toISOString(),
  },
  {
    id: "resp-amb-12",
    responder_type: "AMBULANCE_BLS",
    call_sign: "PMC-AMB-BLS-12",
    vehicle_number: "MH-12-FY-9921",
    driver_name: "Sanjay Shinde",
    driver_phone: "+919876543111",
    hospital_id: "hosp-sassoon",
    latitude: 18.5220,
    longitude: 73.8580,
    status: "AVAILABLE",
    is_als: false,
    is_active: true,
    last_activity: new Date().toISOString(),
  },
  {
    id: "resp-amb-baner",
    responder_type: "AMBULANCE_ALS",
    call_sign: "JUPITER-AMB-ALS-05",
    vehicle_number: "MH-12-QW-1440",
    driver_name: "Amol Patil",
    driver_phone: "+919876543112",
    hospital_id: "hosp-jupiter",
    latitude: 18.5520,
    longitude: 73.7915,
    status: "AVAILABLE",
    is_als: true,
    is_active: true,
    last_activity: new Date().toISOString(),
  },
  {
    id: "resp-police-katraj",
    responder_type: "POLICE",
    call_sign: "POLICE-KATRAJ-01",
    vehicle_number: "MH-12-GP-1001",
    driver_name: "Inspector Vinay Kadam",
    driver_phone: "+919876543113",
    hospital_id: null,
    latitude: 18.4612,
    longitude: 73.8567,
    status: "AVAILABLE",
    is_als: false,
    is_active: true,
    last_activity: new Date().toISOString(),
  },
  {
    id: "resp-police-baner",
    responder_type: "POLICE",
    call_sign: "POLICE-BANER-03",
    vehicle_number: "MH-12-GP-1003",
    driver_name: "Officer Sunita Koli",
    driver_phone: "+919876543114",
    hospital_id: null,
    latitude: 18.5620,
    longitude: 73.7850,
    status: "AVAILABLE",
    is_als: false,
    is_active: true,
    last_activity: new Date().toISOString(),
  }
];

const initialFirstAidProtocols: FirstAidProtocol[] = [
  {
    id: "aid-acc-hi",
    incident_type: "ACCIDENT",
    severity: "HIGH",
    language: "HI",
    title: "सड़क दुर्घटना प्राथमिक चिकित्सा (Road Accident First Aid)",
    steps: [
      "1. सुरक्षित रहें: सबसे पहले दूसरों और अपनी सुरक्षा सुनिश्चित करें, वाहनों की गति से बचें।",
      "2. घायल को न हिलाएं: यदि रीढ़ या गर्दन में चोट की संभावना हो, तो उन्हें अनावश्यक रूप से न घुमाएं।",
      "3. सांस की जांच करें: सुनिश्चित करें कि घायल व्यक्ति सांस ले रहा है। यदि नहीं और आप CPR जानते हैं, तो तुरंत शुरू करें।",
      "4. रक्तस्राव रोकें: बहते खून वाले घाव पर साफ कपड़ा दबाकर रखें।",
      "5. सिर को सहारा दें: गर्दन या सिर को हिलने से बचाने के लिए सहारा दें।"
    ],
    do_not: [
      "घायल को पानी या भोजन न दें (यह उनके श्वसन तंत्र को अवरुद्ध कर सकता है)।",
      "यदि गर्दन मुड़ी हुई हो, तो सीधे खींचने की कोशिश न करें।",
      "बिना सुरक्षा के मोटरसाइकिल सवार का हेलमेट न निकालें जब तक जीवन संकट में न हो।"
    ]
  },
  {
    id: "aid-acc-mr",
    incident_type: "ACCIDENT",
    severity: "HIGH",
    language: "MR",
    title: "अपघात प्रथमोपचार मार्गदर्शन (Accident First Aid Guide)",
    steps: [
      "१. स्वतः सुरक्षित व्हा: रस्त्यावरील इतर वाहनांकडून धोका होणार नाही याची खात्री करा।",
      "२. रुग्णाला हलवू नका: मानेला किंवा पाठीच्या कण्याला इजा झाली असल्यास हालचाल टाळा।",
      "३. रक्तस्त्राव थांबवा: स्वच्छ कापडाने जखमेवर दाब देऊन रक्तस्त्राव नियंत्रित करा।",
      "४. श्वसन तपासा: छातीची हालचाल होत आहे का, श्वास सुरू आहे का ते तपासा।"
    ],
    do_not: [
      "बेहोश रुग्णाच्या तोंडात पाणी घालू नका।",
      "रुग्णाच्या गळ्यात शिरणारे कोणतेही बाह्य पदार्थ बळजबरीने काढण्याचा प्रयत्न करू नका।"
    ]
  },
  {
    id: "aid-uncon-en",
    incident_type: "UNCONSCIOUS",
    severity: "CRITICAL",
    language: "EN",
    title: "Unconscious / Unresponsive Triage Steps",
    steps: [
      "1. Check Responsiveness: Shake shoulders and shout 'Are you okay?'.",
      "2. Airway Check: Gently tilt head back, lift chin to ensure throat is clear of airway blockage.",
      "3. Look for Breathing: Observe chest movement for 10 seconds to confirm regular breathing.",
      "4. Recovery Position: If breathing but unconscious, roll patient on their side to prevent choking.",
      "5. Stop Bleeding: Maintain firm pressure with sterile pads on active arterial bleeders."
    ],
    do_not: [
      "Do NOT administer liquids or force water down an unconscious person's throat.",
      "Do NOT leave the unconscious patient alone on their back."
    ]
  }
];

export class Database {
  public state: DatabaseState;

  public reset() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        fs.unlinkSync(DB_FILE_PATH);
      }
      this.state = {
        users: initialUsers,
        emergency_contacts: initialEmergencyContacts,
        hospitals: initialHospitals,
        responders: initialResponders,
        incidents: [],
        dispatches: [],
        notifications: [],
        hospital_pre_alerts: [],
        first_aid_protocols: initialFirstAidProtocols,
      };
      this.save();
    } catch (e) {
      console.error("Failed to reset database state:", e);
    }
  }

  constructor() {
    this.state = {
      users: initialUsers,
      emergency_contacts: initialEmergencyContacts,
      hospitals: initialHospitals,
      responders: initialResponders,
      incidents: [],
      dispatches: [],
      notifications: [],
      hospital_pre_alerts: [],
      first_aid_protocols: initialFirstAidProtocols,
    };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
        const loaded = JSON.parse(raw);
        this.state = {
          ...this.state,
          ...loaded,
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load database. Initializing empty/seeding", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save database state to file", e);
    }
  }

  // INCIDENTS
  public getIncidents() {
    return this.state.incidents;
  }

  public getRawState() {
    return this.state;
  }

  public addIncident(incident: Incident) {
    this.state.incidents.unshift(incident);
    this.save();
    return incident;
  }

  public updateIncident(id: string, updates: Partial<Incident>) {
    const idx = this.state.incidents.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.state.incidents[idx] = { ...this.state.incidents[idx], ...updates };
      this.save();
      return this.state.incidents[idx];
    }
    return null;
  }

  // DISPATCHES
  public getDispatches() {
    return this.state.dispatches;
  }

  public addDispatch(dispatch: Dispatch) {
    this.state.dispatches.push(dispatch);
    this.save();
    return dispatch;
  }

  public updateDispatch(id: string, updates: Partial<Dispatch>) {
    const idx = this.state.dispatches.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.state.dispatches[idx] = { ...this.state.dispatches[idx], ...updates };
      this.save();
      return this.state.dispatches[idx];
    }
    return null;
  }

  // RESPONDERS
  public getResponders() {
    return this.state.responders;
  }

  public updateResponder(id: string, updates: Partial<Responder>) {
    const idx = this.state.responders.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.state.responders[idx] = { ...this.state.responders[idx], ...updates };
      this.save();
      return this.state.responders[idx];
    }
    return null;
  }

  // HOSPITALS
  public getHospitals() {
    return this.state.hospitals;
  }

  public updateHospital(id: string, updates: Partial<Hospital>) {
    const idx = this.state.hospitals.findIndex((h) => h.id === id);
    if (idx !== -1) {
      this.state.hospitals[idx] = { ...this.state.hospitals[idx], ...updates };
      this.save();
      return this.state.hospitals[idx];
    }
    return null;
  }

  // NOTIFICATIONS
  public getNotifications() {
    return this.state.notifications;
  }

  public addNotification(log: NotificationLog) {
    this.state.notifications.unshift(log);
    this.save();
    return log;
  }

  // PRE-ALERTS
  public getHospitalPreAlerts() {
    return this.state.hospital_pre_alerts;
  }

  public addHospitalPreAlert(alert: HospitalPreAlert) {
    this.state.hospital_pre_alerts.unshift(alert);
    this.save();
    return alert;
  }

  // FIRST AID
  public getFirstAidProtocols() {
    return this.state.first_aid_protocols;
  }

  // SIMULATED POSTGRES QUERY RUNNER
  public query(sqlQuery: string): { columns: string[]; rows: any[] } {
    const normalized = sqlQuery.trim().replace(/\s+/g, " ");
    const matchSelect = normalized.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+LIMIT\s+(\d+))?;?$/i);

    if (!matchSelect) {
      if (normalized.toUpperCase().startsWith("SELECT")) {
        throw new Error("RoadSoS SQL Parser Error: Basic SELECT queries are supported in sandbox format (e.g. 'SELECT * FROM incidents WHERE severity = 'CRITICAL' LIMIT 5')");
      }
      throw new Error(`RoadSoS SQL Engine: Only SELECT queries are permitted for audit in the sandbox (e.g. 'SELECT * FROM hospitals')`);
    }

    const [, selectFields, tableName, whereClause, limitStr] = matchSelect;
    const tableKey = tableName.toLowerCase();

    // Verify table exists. Mapping SQL table names to state keys.
    const validTables = ["users", "emergency_contacts", "hospitals", "responders", "incidents", "dispatches", "notifications", "hospital_pre_alerts", "first_aid_protocols"];
    if (!validTables.includes(tableKey)) {
      throw new Error(`Relation '${tableKey}' does not exist in the database schemas defined in schema.sql`);
    }

    let sourceRows = (this.state as any)[tableKey] as any[];
    if (!sourceRows) {
      sourceRows = [];
    }

    // Process WHERE clause (simple conditions like column = 'value' or column = value)
    let filtered = [...sourceRows];
    if (whereClause) {
      const parts = whereClause.split(/\s+AND\s+/i);
      for (const part of parts) {
        const conditionMatch = part.match(/(\w+)\s*(=|!=|>|<|LIKE)\s*(.+)/i);
        if (conditionMatch) {
          const [, col, op, valRaw] = conditionMatch;
          let val = valRaw.trim().replace(/^['"]|['"]$/g, ""); // strip quotes
          
          filtered = filtered.filter((row) => {
            let rowVal = row[col];
            if (rowVal === undefined && col === "latitude" && tableKey === "hospitals") {
              rowVal = row.latitude;
            }
            if (rowVal === undefined) return false;

            // Simple conversions and comparisons
            if (typeof rowVal === "boolean") {
              const truthy = val.toLowerCase() === "true" || val === "1";
              return op === "=" ? rowVal === truthy : rowVal !== truthy;
            }

            if (op === "=") {
              return String(rowVal).toLowerCase() === val.toLowerCase();
            } else if (op === "!=") {
              return String(rowVal).toLowerCase() !== val.toLowerCase();
            } else if (op === "LIKE") {
              const regex = new RegExp(val.replace(/%/g, ".*"), "i");
              return regex.test(String(rowVal));
            }
            return false;
          });
        }
      }
    }

    // Apply Limit
    if (limitStr) {
      const limit = parseInt(limitStr, 10);
      filtered = filtered.slice(0, limit);
    }

    // Apply projection fields
    const fieldsToSelect = selectFields.trim().split(",").map((s) => s.trim());
    const isAsterisk = fieldsToSelect.length === 1 && fieldsToSelect[0] === "*";

    const rows = filtered.map((row) => {
      if (isAsterisk) {
        const cleanedRow = { ...row };
        // Simplify coordinates rendering for viewer if point geometry
        if (cleanedRow.latitude && cleanedRow.longitude) {
          cleanedRow.location_geom = `POINT(${cleanedRow.longitude} ${cleanedRow.latitude})`;
        }
        return cleanedRow;
      }
      const out: any = {};
      fieldsToSelect.forEach((f) => {
        out[f] = row[f];
      });
      return out;
    });

    const columns = rows.length > 0 ? Object.keys(rows[0]) : (isAsterisk ? ["id"] : fieldsToSelect);

    return { columns, rows };
  }
}

export const dbInstance = new Database();
