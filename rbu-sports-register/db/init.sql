-- RBU Sports Facility Usage & Issuance Register DB Initialization
-- Enabling PostgreSQL Extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Admin / Staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'STAFF', -- ADMIN, STAFF, SUPER_ADMIN
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Students Table (Borrowers / Bookers)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    branch VARCHAR(100),
    year_of_study INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sports Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- INDOOR, OUTDOOR, ACCESSORY
    total_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    condition VARCHAR(50) DEFAULT 'GOOD', -- EXCELLENT, GOOD, WEAK, DAMAGED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Issuances Table (Tracking borrows)
CREATE TABLE IF NOT EXISTS issuances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    issued_by_user_id UUID NOT NULL REFERENCES users(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    return_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ISSUED', -- ISSUED, RETURNED, OVERDUE
    qr_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Facility Bookings Table (Ground, Nets, Court bookings)
CREATE TABLE IF NOT EXISTS facility_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    facility_name VARCHAR(100) NOT NULL, -- Football Ground, Cricket Nets, Shuttle Court, Table Tennis
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'BOOKED', -- BOOKED, COMPLETED, CANCELLED
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by_user_id UUID REFERENCES users(id)
);

-- Initial Database Seeding
-- Admin Password hash for 'admin123' (computed via standard bcrypt)
-- Hashed password: $2b$12$Z0t2Tcl1Vb0e608X9oYpLu00Lp9GByb4k2.tBqUj1v5U3E6t/h7iW (or similar, FastAPI uses passlib library)
-- Let's insert a default super admin user (hashed password of "rbuadmin123")
INSERT INTO users (id, name, email, hashed_password, role) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Super Admin', 'admin@rbu.edu.in', '$2b$12$R9h/lIPzNezYat7z9A8z0eaQ6TqM08e7IasYjDcoQ4/w4t4u07K/C', 'SUPER_ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Initial Students Seeding
INSERT INTO students (id, name, roll_number, email, phone, branch, year_of_study) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Aryan Sharma', 'RBU2023CS001', 'aryan.sharma@rbu.edu.in', '9876543210', 'Computer Science', 3),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Sneha Patel', 'RBU2023EC015', 'sneha.patel@rbu.edu.in', '9876543211', 'Electronics', 3),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Rohan Verma', 'RBU2024ME045', 'rohan.verma@rbu.edu.in', '9876543212', 'Mechanical', 2)
ON CONFLICT (roll_number) DO NOTHING;

-- Initial Equipment Seeding
INSERT INTO equipment (id, name, category, total_quantity, available_quantity, condition) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Cricket Bat (English Willow)', 'OUTDOOR', 10, 10, 'EXCELLENT'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'Leather Cricket Balls', 'OUTDOOR', 30, 30, 'GOOD'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'Basketball (Spalding)', 'INDOOR', 15, 15, 'GOOD'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'Badminton Racket (YONEX)', 'INDOOR', 12, 12, 'EXCELLENT'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'Shuttlecocks (YONEX Tube)', 'ACCESSORY', 40, 40, 'GOOD'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'Football (Nivia)', 'OUTDOOR', 20, 20, 'GOOD')
ON CONFLICT DO NOTHING;
