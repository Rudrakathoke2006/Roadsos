-- ============================================================
-- RoadSoS PostgreSQL 16 + PostGIS Database Schema
-- Voice-First AI Emergency Triage & Smart Dispatch Platform
-- Filename: db.sql (Project Root)
-- ============================================================

-- Enable foundational spatial and capability extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ENUMS DEFINITION
-- ============================================================

-- Incident classification tags
CREATE TYPE incident_type AS ENUM (
    'ACCIDENT', 'INJURY', 'FIRE', 'UNCONSCIOUS', 
    'POLICE_NEEDED', 'AMBULANCE_NEEDED', 'AUTO_CRASH', 'UNKNOWN'
);

-- Emergency triaged severity levels
CREATE TYPE severity_level AS ENUM (
    'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
);

-- Lifecycle statuses of an active emergency incident
CREATE TYPE incident_status AS ENUM (
    'REPORTED', 'TRIAGED', 'DISPATCHED', 'EN_ROUTE', 
    'ARRIVED', 'RESOLVED', 'CANCELLED', 'FALSE_ALARM'
);

-- Responder service designations
CREATE TYPE responder_type AS ENUM (
    'AMBULANCE_ALS', 'AMBULANCE_BLS', 'POLICE', 'FIRE', 
    'TRAFFIC_POLICE', 'VOLUNTEER_FIRST_RESPONDER'
);

-- Operational statuses of emergency responders
CREATE TYPE responder_status AS ENUM (
    'AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 
    'RETURNING', 'OFFLINE', 'MAINTENANCE'
);

-- Hospital trauma capabilities
CREATE TYPE hospital_trauma_level AS ENUM (
    'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'CLINIC'
);

-- Communication channels for emergency broadcast
CREATE TYPE notification_channel AS ENUM (
    'SMS', 'FCM_PUSH', 'WEBHOOK', 'WHATSAPP', 'VOICE_CALL'
);

-- Status indicator for dispatcher notification delivery
CREATE TYPE notification_status AS ENUM (
    'PENDING', 'SENT', 'DELIVERED', 'FAILED'
);

-- Dispatch prioritization hierarchy
CREATE TYPE dispatch_priority AS ENUM (
    'AMBULANCE_FIRST', 'POLICE_FIRST', 'FIRE_FIRST', 'ALL', 'MEDICAL_ONLY'
);

-- Patient blood groups
CREATE TYPE blood_group AS ENUM (
    'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN'
);

-- Supported languages
CREATE TYPE language_code AS ENUM (
    'HI', 'MR', 'EN', 'TA', 'TE', 'KN', 'MIX'
);

-- Platform access roles
CREATE TYPE user_role AS ENUM (
    'VICTIM', 'ADMIN', 'HOSPITAL_STAFF', 'DISPATCHER', 'DRIVER', 'VOLUNTEER', 'SUPER_ADMIN'
);

-- ============================================================
-- CORE PLATFORM TABLES
-- ============================================================

-- 1. TABLE: users
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone               VARCHAR(15) UNIQUE NOT NULL, -- Format: +91XXXXXXXXXX
    name                VARCHAR(100),
    email               VARCHAR(200) UNIQUE,
    role                user_role NOT NULL DEFAULT 'VICTIM',
    blood_group         blood_group DEFAULT 'UNKNOWN',
    allergies           TEXT[] DEFAULT '{}',
    medical_conditions  TEXT[] DEFAULT '{}',
    current_medications TEXT[] DEFAULT '{}',
    preferred_language  language_code DEFAULT 'HI',
    is_cpr_certified    BOOLEAN DEFAULT FALSE,
    is_volunteer_active BOOLEAN DEFAULT FALSE,
    fcm_token           TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    is_verified         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_volunteer_active ON users(is_volunteer_active) WHERE is_volunteer_active = TRUE;

-- 2. TABLE: emergency_contacts
CREATE TABLE emergency_contacts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    phone        VARCHAR(15) NOT NULL,
    relationship VARCHAR(50),
    priority     INT DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- 3. TABLE: hospitals
CREATE TABLE hospitals (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(200) NOT NULL,
    short_name           VARCHAR(50),
    location             GEOMETRY(Point, 4326) NOT NULL, -- Point geometry using SRID 4326
    address              TEXT,
    city                 VARCHAR(100),
    state                VARCHAR(100),
    phone_emergency      VARCHAR(15),
    phone_main           VARCHAR(15),
    email                VARCHAR(200),
    webhook_url          TEXT,
    trauma_level         hospital_trauma_level NOT NULL DEFAULT 'LEVEL_2',
    has_icu              BOOLEAN DEFAULT TRUE,
    icu_beds_total       INT DEFAULT 0,
    icu_beds_available   INT DEFAULT 0,
    has_trauma_bay       BOOLEAN DEFAULT TRUE,
    has_burn_unit        BOOLEAN DEFAULT FALSE,
    has_cath_lab         BOOLEAN DEFAULT FALSE,
    is_govt              BOOLEAN DEFAULT FALSE,
    is_verified          BOOLEAN DEFAULT FALSE,
    is_active            BOOLEAN DEFAULT TRUE,
    is_24x7              BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hospitals_location ON hospitals USING GIST(location);
CREATE INDEX idx_hospitals_trauma_level ON hospitals(trauma_level);
CREATE INDEX idx_hospitals_is_active ON hospitals(is_active) WHERE is_active = TRUE;

-- 4. TABLE: responders
CREATE TABLE responders (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    responder_type    responder_type NOT NULL,
    call_sign         VARCHAR(50) UNIQUE NOT NULL, -- e.g. "PCMC-AMB-ALS-47"
    vehicle_number    VARCHAR(20),
    driver_name       VARCHAR(100),
    driver_phone      VARCHAR(15),
    hospital_id       UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    current_location  GEOMETRY(Point, 4326),
    last_location_at  TIMESTAMPTZ,
    status            responder_status NOT NULL DEFAULT 'OFFLINE',
    fcm_token         TEXT,
    is_als            BOOLEAN DEFAULT FALSE,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responders_location ON responders USING GIST(current_location);
CREATE INDEX idx_responders_status ON responders(status);
CREATE INDEX idx_responders_type ON responders(responder_type);
CREATE INDEX idx_responders_available ON responders(status) WHERE status = 'AVAILABLE';

-- 5. TABLE: incidents (emergency report records)
CREATE TABLE incidents (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID REFERENCES users(id) ON DELETE SET NULL, -- reporter
    incident_type         incident_type NOT NULL DEFAULT 'ACCIDENT',
    severity              severity_level NOT NULL DEFAULT 'HIGH',
    status                incident_status NOT NULL DEFAULT 'REPORTED',
    dispatch_priority     dispatch_priority NOT NULL DEFAULT 'AMBULANCE_FIRST',
    location              GEOMETRY(Point, 4326) NOT NULL,
    location_accuracy_m   FLOAT,
    location_method       VARCHAR(20) DEFAULT 'GPS', -- GPS, IOT, CELL_TRIANGULATION, etc.
    address_resolved      TEXT,
    landmark              TEXT,
    voice_transcript      TEXT,
    language_detected     language_code DEFAULT 'HI',
    ai_confidence         FLOAT DEFAULT 1.0,
    ai_raw_response       JSONB,
    victims_count         INT DEFAULT 1,
    breathing_confirmed   BOOLEAN DEFAULT TRUE,
    fire_present          BOOLEAN DEFAULT FALSE,
    injury_keywords       TEXT[] DEFAULT '{}',
    is_iot_triggered      BOOLEAN DEFAULT FALSE,
    iot_acceleration_g    FLOAT,
    iot_speed_delta_kmh   FLOAT,
    iot_vehicle_angle_deg FLOAT,
    iot_device_id         VARCHAR(100),
    photo_url             TEXT,
    photo_severity        severity_level,
    first_aid_given       BOOLEAN DEFAULT FALSE,
    first_aid_by          VARCHAR(100),
    reported_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at         TIMESTAMPTZ,
    resolved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at DESC);

-- 6. TABLE: dispatches
CREATE TABLE dispatches (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id       UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    responder_id      UUID NOT NULL REFERENCES responders(id) ON DELETE RESTRICT,
    dispatched_by     UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if engine automated dispatch
    is_auto_dispatch  BOOLEAN DEFAULT TRUE,
    route_polyline    TEXT,
    distance_km       FLOAT,
    estimated_eta_min FLOAT,
    actual_eta_min    FLOAT,
    hospital_id       UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    dispatched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at       TIMESTAMPTZ,
    departed_at       TIMESTAMPTZ,
    arrived_at        TIMESTAMPTZ,
    patient_handover  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispatches_incident ON dispatches(incident_id);
CREATE INDEX idx_dispatches_responder ON dispatches(responder_id);

-- 7. TABLE: notification_logs
CREATE TABLE notification_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id    UUID REFERENCES incidents(id) ON DELETE SET NULL,
    channel        notification_channel NOT NULL DEFAULT 'SMS',
    recipient      VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(100),
    message_body   TEXT NOT NULL,
    status         notification_status NOT NULL DEFAULT 'PENDING',
    sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_details  TEXT
);

CREATE INDEX idx_notification_logs_incident ON notification_logs(incident_id);
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient);

-- 8. TABLE: hospital_pre_alerts
CREATE TABLE hospital_pre_alerts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    hospital_id         UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    eta_minutes         INT NOT NULL,
    incident_type       incident_type NOT NULL,
    severity            severity_level NOT NULL,
    victim_blood_group  blood_group DEFAULT 'UNKNOWN',
    victim_allergies    TEXT[] DEFAULT '{}',
    injury_summary      TEXT,
    special_needs       TEXT,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    webhook_status      INT DEFAULT 200,
    webhook_response    TEXT
);

CREATE INDEX idx_pre_alerts_hospital ON hospital_pre_alerts(hospital_id);
CREATE INDEX idx_pre_alerts_incident ON hospital_pre_alerts(incident_id);

-- 9. TABLE: first_aid_protocols
CREATE TABLE first_aid_protocols (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_type incident_type NOT NULL,
    severity      severity_level NOT NULL,
    language      language_code NOT NULL DEFAULT 'EN',
    title         VARCHAR(200) NOT NULL,
    steps         TEXT[] NOT NULL,
    do_not        TEXT[] NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_first_aid_protocols_match ON first_aid_protocols(incident_type, severity, language);

-- ============================================================
-- VIEWS DEFINITIONS FOR REPORTING AND DISPATCH METRICS
-- ============================================================

-- Active incidents summary with location coordinates extracted
CREATE OR REPLACE VIEW active_emergency_dashboard AS
SELECT 
    i.id AS incident_id,
    i.incident_type,
    i.severity,
    i.status AS incident_status,
    i.address_resolved,
    i.landmark,
    ST_Y(i.location) AS latitude,
    ST_X(i.location) AS longitude,
    i.breathing_confirmed,
    i.fire_present,
    i.victims_count,
    i.reported_at,
    d.responder_id,
    r.call_sign AS responder_call_sign,
    r.driver_name,
    r.driver_phone,
    r.status AS responder_status,
    d.distance_km,
    d.estimated_eta_min,
    h.name AS assigned_hospital,
    h.trauma_level AS hospital_trauma
FROM incidents i
LEFT JOIN dispatches d ON d.incident_id = i.id AND d.patient_handover IS NULL
LEFT JOIN responders r ON d.responder_id = r.id
LEFT JOIN hospitals h ON d.hospital_id = h.id
WHERE i.status NOT IN ('RESOLVED', 'CANCELLED', 'FALSE_ALARM')
ORDER BY 
    CASE i.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END,
    i.reported_at DESC;

-- Pre-alerts hospital timeline view
CREATE OR REPLACE VIEW hospital_emergency_board AS
SELECT 
    hpa.id AS pre_alert_id,
    h.id AS hospital_id,
    h.name AS hospital_name,
    hpa.incident_id,
    hpa.incident_type,
    hpa.severity,
    hpa.eta_minutes,
    hpa.victim_blood_group,
    hpa.victim_allergies,
    hpa.injury_summary,
    hpa.special_needs,
    hpa.sent_at
FROM hospital_pre_alerts hpa
JOIN hospitals h ON hpa.hospital_id = h.id
ORDER BY hpa.sent_at DESC;

-- ============================================================
-- IN-DATABASE TRIGGERS & PROCEDURAL UTILITIES
-- ============================================================

-- Automate updating a column's update timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply automatic update timestamp triggers
CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_hospitals_timestamp
    BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_responders_timestamp
    BEFORE UPDATE ON responders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_incidents_timestamp
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Automatically find nearby hospitals trauma bays using spatial indexes
CREATE OR REPLACE FUNCTION get_nearest_hospitals(
    p_incident_location GEOMETRY,
    p_limit INT DEFAULT 3
)
RETURNS TABLE (
    hospital_id UUID,
    name VARCHAR,
    distance_meters FLOAT,
    trauma_level hospital_trauma_level,
    beds_available INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id as hospital_id,
        hospitals.name,
        ST_Distance(location, p_incident_location, true) as distance_meters, -- true stands for spheroid distance (meters)
        hospitals.trauma_level,
        icu_beds_available as beds_available
    FROM hospitals
    WHERE is_active = TRUE
    ORDER BY location <-> p_incident_location -- K-Nearest Neighbor (KNN) spatial sort
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED DATA SETS
-- ============================================================

-- Core user profiles
INSERT INTO users (id, phone, name, email, role, blood_group, allergies, medical_conditions, preferred_language, is_cpr_certified, is_volunteer_active, is_verified) VALUES
('6b9074b6-dc7c-474c-ada8-7da1e847c134', '+919876543210', 'Ramesh Pawar', 'ramesh.pawar@gmail.com', 'VICTIM', 'O_POS', '{"Penicillin"}', '{"Hypertension"}', 'HI', FALSE, FALSE, TRUE),
('7c4d51fc-36ae-47b2-89b9-cbd26d17e5a1', '+919822334455', 'Suresh Gaikwad', 'suresh.g@roadsos.in', 'DRIVER', 'B_POS', '{}', '{}', 'MR', TRUE, FALSE, TRUE),
('de502df2-c1ee-48f5-a131-ab8bf30fe353', '+919811223344', 'Abhishek Patil', 'abhishek.p@roadsos.in', 'DRIVER', 'A_POS', '{}', '{}', 'HI', TRUE, FALSE, TRUE);

-- Emergency Contacts
INSERT INTO emergency_contacts (id, user_id, name, phone, relationship, priority) VALUES
('a59b66bb-b7fa-475c-bfa8-0bbdf42e0fc2', '6b9074b6-dc7c-474c-ada8-7da1e847c134', 'Sunita Pawar', '+919876543211', 'Spouse', 1),
('b84a123d-0d6c-48ae-932f-413be1a74291', '6b9074b6-dc7c-474c-ada8-7da1e847c134', 'Amit Pawar', '+919876543212', 'Brother', 2);

-- Key High Capability Trauma Hospitals (Pune Corridor)
INSERT INTO hospitals (id, name, short_name, location, address, city, state, phone_emergency, phone_main, email, webhook_url, trauma_level, has_icu, icu_beds_total, icu_beds_available, has_trauma_bay, is_govt, is_verified) VALUES
(
    '1a92ded1-4d14-41df-a567-0efc06bdf3b9', 
    'Sassoon General Hospital', 
    'Sassoon Trauma Center',
    ST_SetSRID(ST_MakePoint(73.8631, 18.5286), 4326), 
    'Near Pune Railway Station, Sangamvadi', 
    'Pune', 
    'Maharashtra', 
    '020-26128000', 
    '020-26126000', 
    'emergency@sassoonpune.gov.in', 
    'https://api.sassoonpune.gov.in/v1/pre-alerts', 
    'LEVEL_1', 
    TRUE, 
    120, 
    48, 
    TRUE, 
    TRUE, 
    TRUE
),
(
    '2b9bc314-e0b0-466d-9610-84cbdfbc1dfb', 
    'Ruby Hall Clinic (Trauma Hub)', 
    'Ruby Hall',
    ST_SetSRID(ST_MakePoint(73.8732, 18.5318), 4326), 
    '40, Sassoon Road, Sangamvadi', 
    'Pune', 
    'Maharashtra', 
    '020-66455100', 
    '020-66455000', 
    'emergency@rubyhall.com', 
    'https://api.rubyhall.com/trauma/receiver', 
    'LEVEL_1', 
    TRUE, 
    80, 
    12, 
    TRUE, 
    FALSE, 
    TRUE
),
(
    '3c0d8320-cf91-49e0-82d3-1cbfb9d03df6', 
    'Jupiter Hospital (Baner Highway)', 
    'Jupiter Baner',
    ST_SetSRID(ST_MakePoint(73.7801, 18.5583), 4326), 
    'Baner - Balewadi Road, Pune-Bangalore Highway', 
    'Pune', 
    'Maharashtra', 
    '020-27211112', 
    '020-27211111', 
    'trauma@jupiterhospital.com', 
    'https://pester.jupiterhospital.com/api/v1/roadsos', 
    'LEVEL_1', 
    TRUE, 
    90, 
    19, 
    TRUE, 
    FALSE, 
    TRUE
),
(
    '4df3d2e9-467b-4d44-be1f-6ffccbed524a', 
    'Sahyadri Super Speciality Hospital', 
    'Sahyadri Deccan',
    ST_SetSRID(ST_MakePoint(73.8412, 18.5134), 4326), 
    '30-C, Erandwane, Karve Road', 
    'Pune', 
    'Maharashtra', 
    '020-67213000', 
    '020-67215000', 
    'coordination@sahyadrihospital.com', 
    'https://hospitalapi.sahyadri.com/road-safety/sos', 
    'LEVEL_2', 
    TRUE, 
    50, 
    8, 
    TRUE, 
    FALSE, 
    TRUE
),
(
    '5faeab32-e090-48e2-a0cb-103bc4b09cfd', 
    'Lokmanya Hospital (Chinchwad Highway Hub)', 
    'Lokmanya Chinchwad',
    ST_SetSRID(ST_MakePoint(73.7912, 18.6367), 4326), 
    'Chinchwad Station, Old Pune-Mumbai Highway', 
    'PCMC', 
    'Maharashtra', 
    '020-27473333', 
    '020-30612000', 
    'icu@lokmanya.in', 
    'https://lokmanya.in/api/sos-catcher', 
    'LEVEL_1', 
    TRUE, 
    100, 
    34, 
    TRUE, 
    FALSE, 
    TRUE
);

-- Active emergency responders (Ambulances with coordinates)
INSERT INTO responders (id, responder_type, call_sign, vehicle_number, driver_name, driver_phone, hospital_id, current_location, status, is_als, is_active) VALUES
(
    'a1b1c2d3-e4f5-5678-abcd-ef0123456789', 
    'AMBULANCE_ALS', 
    'PCMC-AMB-ALS-47', 
    'MH-14-EU-4720', 
    'Vijay Gaikwad', 
    '+919876543110', 
    '5faeab32-e090-48e2-a0cb-103bc4b09cfd', 
    ST_SetSRID(ST_MakePoint(73.7710, 18.6180), 4326), 
    'AVAILABLE', 
    TRUE, 
    TRUE
),
(
    'b2c2d3e4-f5a6-6789-bcde-0123456789ab', 
    'AMBULANCE_BLS', 
    'PMC-AMB-BLS-12', 
    'MH-12-FY-9921', 
    'Sanjay Shinde', 
    '+919876543111', 
    '1a92ded1-4d14-41df-a567-0efc06bdf3b9', 
    ST_SetSRID(ST_MakePoint(73.8580, 18.5220), 4326), 
    'AVAILABLE', 
    FALSE, 
    TRUE
),
(
    'c3d3e4f5-a6b7-7890-cdef-123456789abc', 
    'AMBULANCE_ALS', 
    'JUPITER-AMB-ALS-05', 
    'MH-12-QW-1440', 
    'Amol Patil', 
    '+919876543112', 
    '3c0d8320-cf91-49e0-82d3-1cbfb9d03df6', 
    ST_SetSRID(ST_MakePoint(73.7915, 18.5520), 4326), 
    'AVAILABLE', 
    TRUE, 
    TRUE
),
(
    'd4e4f5a6-b7c8-8901-def0-23456789abcd', 
    'POLICE', 
    'POLICE-KATRAJ-01', 
    'MH-12-GP-1001', 
    'Inspector Vinay Kadam', 
    '+919876543113', 
    NULL, 
    ST_SetSRID(ST_MakePoint(73.8567, 18.4612), 4326), 
    'AVAILABLE', 
    FALSE, 
    TRUE
),
(
    'e5f5a6b7-c8d9-9012-ef01-3456789abcde', 
    'POLICE', 
    'POLICE-BANER-03', 
    'MH-12-GP-1003', 
    'Officer Sunita Koli', 
    '+919876543114', 
    NULL, 
    ST_SetSRID(ST_MakePoint(73.7850, 18.5620), 4326), 
    'AVAILABLE', 
    FALSE, 
    TRUE
);

-- First Aid Protocols Seed (English, Hindi, Marathi)
INSERT INTO first_aid_protocols (incident_type, severity, language, title, steps, do_not) VALUES
(
    'ACCIDENT', 
    'HIGH', 
    'HI', 
    'सड़क दुर्घटना प्राथमिक चिकित्सा (Road Accident First Aid)', 
    '{
        "1. सुरक्षित रहें: सबसे पहले दूसरों और अपनी सुरक्षा सुनिश्चित करें, वाहनों की गति से बचें।",
        "2. घायल को न हिलाएं: यदि रीढ़ या गर्दन में चोट की संभावना हो, तो उन्हें अनावश्यक रूप से न घुमाएं।",
        "3. सांस की जांच करें: सुनिश्चित करें कि घायल व्यक्ति सांस ले रहा है। यदि नहीं और आप CPR जानते हैं, तो तुरंत शुरू करें।",
        "4. रक्तस्राव रोकें: बहते खून वाले घाव पर साफ कपड़ा दबाकर रखें।",
        "5. सिर को सहारा दें: गर्दन या सिर को हिलने से बचाने के लिए सहारा दें।"
     }', 
    '{
        "घायल को पानी या भोजन न दें (यह उनके श्वसन तंत्र को अवरुद्ध कर सकता है)।",
        "यदि गर्दन मुड़ी हुई हो, तो सीधे खींचने की कोशिश न करें।",
        "बिना सुरक्षा के मोटरसाइकिल सवार का हेलमेट न निकालें जब तक जीवन संकट में न हो।"
     }'
),
(
    'ACCIDENT', 
    'HIGH', 
    'MR', 
    'अपघात प्रथमोपचार मार्गदर्शन (Accident First Aid Guide)', 
    '{
        "१. स्वतः सुरक्षित व्हा: रस्त्यावरील इतर वाहनांकडून धोका होणार नाही याची खात्री करा।",
        "२. रुग्णाला हलवू नका: मानेला किंवा पाठीच्या कण्याला इजा झाली असल्यास हालचाल टाळा।",
        "३. रक्तस्त्राव थांबवा: स्वच्छ कापडाने जखमेवर दाब देऊन रक्तस्त्राव नियंत्रित करा।",
        "४. श्वसन तपासा: छातीची हालचाल होत आहे का, श्वास सुरू आहे का ते तपासा।"
     }', 
    '{
        "बेहोश रुग्णाच्या तोंडात पाणी घालू नका।",
        "रुग्णाच्या गळ्यात शिरणारे कोणतेही बाह्य पदार्थ बळजबरीने काढण्याचा प्रयत्न करू नका।"
     }'
),
(
    'UNCONSCIOUS', 
    'CRITICAL', 
    'EN', 
    'Unconscious / Unresponsive Triage Steps', 
    '{
        "1. Check Responsiveness: Shake shoulders and shout ''Are you okay?''.",
        "2. Airway Check: Gently tilt head back, lift chin to ensure throat is clear of airway blockage.",
        "3. Look for Breathing: Observe chest movement for 10 seconds to confirm regular breathing.",
        "4. Recovery Position: If breathing but unconscious, roll patient on their side to prevent choking.",
        "5. Stop Bleeding: Maintain firm pressure with sterile pads on active arterial bleeders."
     }', 
    '{
        "Do NOT administer liquids or force water down an unconscious person''s throat.",
        "Do NOT leave the unconscious patient alone on their back."
     }'
);
