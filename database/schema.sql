-- ============================================================
-- RoadSoS Database Schema
-- PostgreSQL 16 + PostGIS
-- Run: psql -U postgres -d roadsos -f schema.sql
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for fuzzy search

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE incident_type AS ENUM (
    'ACCIDENT', 'INJURY', 'FIRE', 'UNCONSCIOUS',
    'POLICE_NEEDED', 'AMBULANCE_NEEDED', 'AUTO_CRASH', 'UNKNOWN'
);

CREATE TYPE severity_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TYPE incident_status AS ENUM (
    'REPORTED', 'TRIAGED', 'DISPATCHED', 'EN_ROUTE',
    'ARRIVED', 'RESOLVED', 'CANCELLED', 'FALSE_ALARM'
);

CREATE TYPE responder_type AS ENUM (
    'AMBULANCE_ALS', 'AMBULANCE_BLS', 'POLICE', 'FIRE',
    'TRAFFIC_POLICE', 'VOLUNTEER_FIRST_RESPONDER'
);

CREATE TYPE responder_status AS ENUM (
    'AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE',
    'RETURNING', 'OFFLINE', 'MAINTENANCE'
);

CREATE TYPE hospital_trauma_level AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'CLINIC');

CREATE TYPE notification_channel AS ENUM ('SMS', 'FCM_PUSH', 'WEBHOOK', 'WHATSAPP', 'VOICE_CALL');

CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

CREATE TYPE dispatch_priority AS ENUM ('AMBULANCE_FIRST', 'POLICE_FIRST', 'FIRE_FIRST', 'ALL', 'MEDICAL_ONLY');

CREATE TYPE blood_group AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN');

CREATE TYPE language_code AS ENUM ('HI', 'MR', 'EN', 'TA', 'TE', 'KN', 'MIX');

CREATE TYPE user_role AS ENUM ('VICTIM', 'ADMIN', 'HOSPITAL_STAFF', 'DISPATCHER', 'DRIVER', 'VOLUNTEER', 'SUPER_ADMIN');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone               VARCHAR(15) UNIQUE NOT NULL,           -- +91XXXXXXXXXX
    name                VARCHAR(100),
    email               VARCHAR(200) UNIQUE,
    role                user_role NOT NULL DEFAULT 'VICTIM',
    blood_group         blood_group DEFAULT 'UNKNOWN',
    allergies           TEXT[],                                -- array of allergy strings
    medical_conditions  TEXT[],                                -- chronic conditions
    current_medications TEXT[],
    preferred_language  language_code DEFAULT 'HI',
    is_cpr_certified    BOOLEAN DEFAULT FALSE,
    is_volunteer_active BOOLEAN DEFAULT FALSE,
    fcm_token           TEXT,                                  -- Firebase Cloud Messaging token
    is_active           BOOLEAN DEFAULT TRUE,
    is_verified         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_volunteer ON users(is_volunteer_active) WHERE is_volunteer_active = TRUE;

-- ============================================================
-- TABLE: emergency_contacts
-- ============================================================
CREATE TABLE emergency_contacts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    phone        VARCHAR(15) NOT NULL,
    relationship VARCHAR(50),                                  -- spouse, parent, friend
    priority     INT DEFAULT 1,                                -- 1=first to notify
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

-- ============================================================
-- TABLE: hospitals
-- ============================================================
CREATE TABLE hospitals (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(200) NOT NULL,
    short_name           VARCHAR(50),
    location             GEOMETRY(POINT, 4326) NOT NULL,       -- PostGIS point (lng, lat)
    address              TEXT,
    city                 VARCHAR(100),
    state                VARCHAR(100),
    phone_emergency      VARCHAR(15),
    phone_main           VARCHAR(15),
    email                VARCHAR(200),
    webhook_url          TEXT,                                 -- REST endpoint for pre-alerts
    trauma_level         hospital_trauma_level DEFAULT 'LEVEL_2',
    has_icu              BOOLEAN DEFAULT TRUE,
    icu_beds_total        INT DEFAULT 0,
    icu_beds_available    INT DEFAULT 0,
    has_trauma_bay       BOOLEAN DEFAULT TRUE,
    has_burn_unit        BOOLEAN DEFAULT FALSE,
    has_cath_lab         BOOLEAN DEFAULT FALSE,
    is_govt              BOOLEAN DEFAULT FALSE,
    is_verified          BOOLEAN DEFAULT FALSE,
    is_active            BOOLEAN DEFAULT TRUE,
    is_24x7              BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hospitals_location ON hospitals USING GIST(location);
CREATE INDEX idx_hospitals_trauma ON hospitals(trauma_level);
CREATE INDEX idx_hospitals_active ON hospitals(is_active) WHERE is_active = TRUE;

-- ============================================================
-- TABLE: responders (ambulances, police, fire, volunteers)
-- ============================================================
CREATE TABLE responders (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    responder_type    responder_type NOT NULL,
    call_sign         VARCHAR(50) UNIQUE,                      -- e.g. "PCMC-AMB-47"
    vehicle_number    VARCHAR(20),
    driver_name       VARCHAR(100),
    driver_phone      VARCHAR(15),
    hospital_id       UUID REFERENCES hospitals(id),           -- for ambulances
    user_id           UUID REFERENCES users(id),               -- for volunteer responders
    current_location  GEOMETRY(POINT, 4326),
    last_location_at  TIMESTAMPTZ,
    status            responder_status DEFAULT 'OFFLINE',
    fcm_token         TEXT,
    is_als            BOOLEAN DEFAULT FALSE,                   -- Advanced Life Support
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_responders_location ON responders USING GIST(current_location);
CREATE INDEX idx_responders_status ON responders(status);
CREATE INDEX idx_responders_type ON responders(responder_type);
CREATE INDEX idx_responders_available ON responders(status) WHERE status = 'AVAILABLE';

-- ============================================================
-- TABLE: incidents
-- ============================================================
CREATE TABLE incidents (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID REFERENCES users(id),           -- reporter (nullable for IoT)
    incident_type         incident_type NOT NULL,
    severity              severity_level NOT NULL DEFAULT 'HIGH',
    status                incident_status NOT NULL DEFAULT 'REPORTED',
    dispatch_priority     dispatch_priority DEFAULT 'AMBULANCE_FIRST',

    -- Location
    location              GEOMETRY(POINT, 4326) NOT NULL,
    location_accuracy_m   FLOAT,                               -- GPS accuracy in meters
    location_method       VARCHAR(20) DEFAULT 'GPS',           -- GPS | LBS | MANUAL | IOT
    address_resolved      TEXT,                                -- human-readable address
    landmark              TEXT,                                -- nearest landmark

    -- AI Triage output
    voice_transcript      TEXT,                                -- raw STT output
    language_detected     language_code,
    ai_confidence         FLOAT,                               -- 0.0–1.0
    ai_raw_response       JSONB,                               -- full Claude API response
    victims_count         INT DEFAULT 1,
    breathing_confirmed   BOOLEAN,
    fire_present          BOOLEAN DEFAULT FALSE,
    injury_keywords       TEXT[],                              -- extracted injury terms

    -- IoT fields (for auto-detected crashes)
    is_iot_triggered      BOOLEAN DEFAULT FALSE,
    iot_acceleration_g    FLOAT,                               -- peak acceleration in g
    iot_speed_delta_kmh   FLOAT,
    iot_vehicle_angle_deg FLOAT,
    iot_device_id         VARCHAR(100),

    -- Photo severity
    photo_url             TEXT,
    photo_severity        severity_level,

    -- First aid
    first_aid_given       BOOLEAN DEFAULT FALSE,
    first_aid_by          VARCHAR(100),

    -- Timestamps
    reported_at           TIMESTAMPTZ DEFAULT NOW(),
    dispatched_at         TIMESTAMPTZ,
    resolved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_user ON incidents(user_id);
CREATE INDEX idx_incidents_reported ON incidents(reported_at DESC);
CREATE INDEX idx_incidents_severity ON incidents(severity);

-- ============================================================
-- TABLE: dispatches
-- ============================================================
CREATE TABLE dispatches (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id       UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    responder_id      UUID NOT NULL REFERENCES responders(id),
    dispatched_by     UUID REFERENCES users(id),               -- NULL = auto-dispatch
    is_auto_dispatch  BOOLEAN DEFAULT TRUE,

    -- Route
    route_polyline    TEXT,                                    -- encoded Google Maps polyline
    distance_km       FLOAT,
    estimated_eta_min FLOAT,
    actual_eta_min    FLOAT,

    -- Hospital assignment
    hospital_id       UUID REFERENCES hospitals(id),

    -- Timestamps
    dispatched_at     TIMESTAMPTZ DEFAULT NOW(),
    accepted_at       TIMESTAMPTZ,
    departed_at       TIMESTAMPTZ,
    arrived_at        TIMESTAMPTZ,
    patient_handover  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispatches_incident ON dispatches(incident_id);
CREATE INDEX idx_dispatches_responder ON dispatches(responder_id);
