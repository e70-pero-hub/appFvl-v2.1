-- Kreiranje tabela za AppFvl-v2 (Mobile)

-- 0. Firme (Multi-tenancy)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO companies (name, slug) VALUES ('Default Company', 'default')
ON CONFLICT (slug) DO NOTHING;

-- 1. Korisnici (Zaposleni + Administratori spojeni)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'admin' ili 'user'
    company_id INTEGER NOT NULL REFERENCES companies(id)
);

-- 2. Vozila
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    plate VARCHAR(20) NOT NULL,
    reg_exp DATE NOT NULL,
    service DATE NOT NULL,
    tires DATE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    UNIQUE (company_id, plate)
);

-- 3. Točenja goriva
CREATE TABLE IF NOT EXISTS fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    km INTEGER NOT NULL,
    liters DECIMAL(10, 2) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    receipt_qr_data TEXT,
    receipt_image_path VARCHAR(255)
);

-- Početni podaci (Opciono)
INSERT INTO users (username, password, full_name, role, company_id) VALUES
('admin', 'admin123', 'Glavni Administrator', 'admin', (SELECT id FROM companies WHERE slug = 'default')),
('operater', 'gas123', 'Pera Operater', 'user', (SELECT id FROM companies WHERE slug = 'default'))
ON CONFLICT (username) DO NOTHING;

INSERT INTO vehicles (brand, model, plate, reg_exp, service, tires, user_id, company_id)
VALUES ('Volkswagen', 'Golf 8', 'BG-1234-AB', '2026-05-15', '2026-10-01', '2026-11-20', 1,
        (SELECT id FROM companies WHERE slug = 'default'));

-- 4. View za Izveštavanje
CREATE OR REPLACE VIEW admin_reports_view AS
SELECT
    fl.id AS log_id,
    fl.km,
    fl.liters,
    fl.price,
    fl.date AS fuel_date,
    fl.receipt_qr_data,
    fl.receipt_image_path,
    TO_CHAR(fl.date, 'YYYY-MM') AS month_year,
    v.id AS vehicle_id,
    v.plate,
    v.brand,
    v.model,
    u.id AS user_id,
    u.username,
    u.full_name,
    v.company_id
FROM fuel_logs fl
JOIN vehicles v ON fl.vehicle_id = v.id
JOIN users u ON v.user_id = u.id;
