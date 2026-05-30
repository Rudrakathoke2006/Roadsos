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

export interface DatabaseState {
  users: DBUser[];
  emergency_contacts: EmergencyContact[];
  hospitals: Hospital[];
  responders: Responder[];
  incidents: Incident[];
  dispatches: Dispatch[];
  notifications: NotificationLog[];
  hospital_pre_alerts: HospitalPreAlert[];
}
