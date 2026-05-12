-- Brisanje svih starih podataka ukoliko je potrebno (otkomentarisati ako se želi prazna baza pre unosa)
-- TRUNCATE TABLE fuel_logs, vehicles, users RESTART IDENTITY CASCADE;

-- 1. Unos 10 novih korisnika (vozača)
INSERT INTO users (username, password, full_name, role) VALUES 
('vozac1', 'sifra123', 'Ana Antic', 'user'),
('vozac2', 'sifra123', 'Bojan Bogdanovic', 'user'),
('vozac3', 'sifra123', 'Vuk Vuckovic', 'user'),
('vozac4', 'sifra123', 'Goran Goranovic', 'user'),
('vozac5', 'sifra123', 'Dejan Dejanovic', 'user'),
('vozac6', 'sifra123', 'Djordje Djordjevic', 'user'),
('vozac7', 'sifra123', 'Zoran Zoranovic', 'user'),
('vozac8', 'sifra123', 'Ivan Ivanovic', 'user'),
('vozac9', 'sifra123', 'Jelena Jovanovic', 'user'),
('vozac10', 'sifra123', 'Katarina Kostic', 'user')
ON CONFLICT (username) DO NOTHING;

-- 2. Unos 10 novih vozila (svako vozilo vezujemo za jednog od prethodnih vozača)
-- Pretpostavljamo da su ID-jevi korisnika kreirani redom, pa ih povezujemo po podupitu
-- Napomena: ako su već postojali korisnici, ID-jevi će se razlikovati, ali ovo funkcioniše na čistoj bazi.
INSERT INTO vehicles (brand, model, plate, reg_exp, service, tires, user_id) VALUES 
('Toyota', 'Corolla', 'BG-001-AA', '2026-06-10', '2026-05-10', '2026-11-01', (SELECT id FROM users WHERE username = 'vozac1')),
('Skoda', 'Octavia', 'BG-002-BB', '2026-07-15', '2026-06-15', '2026-11-01', (SELECT id FROM users WHERE username = 'vozac2')),
('Fiat', 'Punto', 'NS-003-CC', '2026-08-20', '2026-07-20', '2026-11-01', (SELECT id FROM users WHERE username = 'vozac3')),
('Opel', 'Astra', 'NI-004-DD', '2026-09-25', '2026-08-25', '2026-11-01', (SELECT id FROM users WHERE username = 'vozac4')),
('Ford', 'Focus', 'KG-005-EE', '2026-10-30', '2026-09-30', '2026-11-01', (SELECT id FROM users WHERE username = 'vozac5')),
('Peugeot', '308', 'SU-006-FF', '2026-11-10', '2026-10-10', '2026-11-01', (SELECT id FROM users WHERE username = 'vozac6')),
('Renault', 'Megane', 'CA-007-GG', '2026-12-15', '2026-11-15', '2027-11-01', (SELECT id FROM users WHERE username = 'vozac7')),
('Hyundai', 'i30', 'KŠ-008-HH', '2027-01-20', '2026-12-20', '2027-11-01', (SELECT id FROM users WHERE username = 'vozac8')),
('Kia', 'Ceed', 'ZA-009-II', '2027-02-25', '2027-01-25', '2027-11-01', (SELECT id FROM users WHERE username = 'vozac9')),
('Dacia', 'Sandero', 'LE-010-JJ', '2027-03-30', '2027-02-28', '2027-11-01', (SELECT id FROM users WHERE username = 'vozac10'))
ON CONFLICT (plate) DO NOTHING;

-- 3. Unos 5 točenja za svako vozilo (ukupno 50 točenja)
-- Koristimo podupite da bismo preuzeli ID svake kreirane tablice (na osnovu registracije)
INSERT INTO fuel_logs (vehicle_id, km, liters, price, date) VALUES 
-- Vozilo 1 (BG-001-AA)
((SELECT id FROM vehicles WHERE plate = 'BG-001-AA'), 150000, 45.5, 9000.00, '2026-01-10'),
((SELECT id FROM vehicles WHERE plate = 'BG-001-AA'), 150600, 42.0, 8400.00, '2026-01-25'),
((SELECT id FROM vehicles WHERE plate = 'BG-001-AA'), 151250, 48.0, 9600.00, '2026-02-10'),
((SELECT id FROM vehicles WHERE plate = 'BG-001-AA'), 151800, 40.5, 8100.00, '2026-02-25'),
((SELECT id FROM vehicles WHERE plate = 'BG-001-AA'), 152400, 46.0, 9200.00, '2026-03-10'),

-- Vozilo 2 (BG-002-BB)
((SELECT id FROM vehicles WHERE plate = 'BG-002-BB'), 120000, 50.0, 10000.00, '2026-01-12'),
((SELECT id FROM vehicles WHERE plate = 'BG-002-BB'), 120550, 48.5, 9700.00, '2026-01-28'),
((SELECT id FROM vehicles WHERE plate = 'BG-002-BB'), 121100, 51.0, 10200.00, '2026-02-15'),
((SELECT id FROM vehicles WHERE plate = 'BG-002-BB'), 121700, 49.0, 9800.00, '2026-03-01'),
((SELECT id FROM vehicles WHERE plate = 'BG-002-BB'), 122250, 50.5, 10100.00, '2026-03-15'),

-- Vozilo 3 (NS-003-CC)
((SELECT id FROM vehicles WHERE plate = 'NS-003-CC'), 180000, 35.0, 7000.00, '2026-01-05'),
((SELECT id FROM vehicles WHERE plate = 'NS-003-CC'), 180400, 34.0, 6800.00, '2026-01-20'),
((SELECT id FROM vehicles WHERE plate = 'NS-003-CC'), 180850, 36.5, 7300.00, '2026-02-05'),
((SELECT id FROM vehicles WHERE plate = 'NS-003-CC'), 181300, 35.5, 7100.00, '2026-02-20'),
((SELECT id FROM vehicles WHERE plate = 'NS-003-CC'), 181750, 37.0, 7400.00, '2026-03-05'),

-- Vozilo 4 (NI-004-DD)
((SELECT id FROM vehicles WHERE plate = 'NI-004-DD'), 110000, 45.0, 9000.00, '2026-01-08'),
((SELECT id FROM vehicles WHERE plate = 'NI-004-DD'), 110500, 42.5, 8500.00, '2026-01-22'),
((SELECT id FROM vehicles WHERE plate = 'NI-004-DD'), 111100, 46.0, 9200.00, '2026-02-12'),
((SELECT id FROM vehicles WHERE plate = 'NI-004-DD'), 111600, 44.0, 8800.00, '2026-02-28'),
((SELECT id FROM vehicles WHERE plate = 'NI-004-DD'), 112150, 45.5, 9100.00, '2026-03-12'),

-- Vozilo 5 (KG-005-EE)
((SELECT id FROM vehicles WHERE plate = 'KG-005-EE'), 95000, 40.0, 8000.00, '2026-01-15'),
((SELECT id FROM vehicles WHERE plate = 'KG-005-EE'), 95500, 38.5, 7700.00, '2026-01-30'),
((SELECT id FROM vehicles WHERE plate = 'KG-005-EE'), 96000, 41.0, 8200.00, '2026-02-14'),
((SELECT id FROM vehicles WHERE plate = 'KG-005-EE'), 96550, 39.5, 7900.00, '2026-03-02'),
((SELECT id FROM vehicles WHERE plate = 'KG-005-EE'), 97100, 40.5, 8100.00, '2026-03-18'),

-- Vozilo 6 (SU-006-FF)
((SELECT id FROM vehicles WHERE plate = 'SU-006-FF'), 135000, 48.0, 9600.00, '2026-01-09'),
((SELECT id FROM vehicles WHERE plate = 'SU-006-FF'), 135600, 47.5, 9500.00, '2026-01-26'),
((SELECT id FROM vehicles WHERE plate = 'SU-006-FF'), 136200, 50.0, 10000.00, '2026-02-11'),
((SELECT id FROM vehicles WHERE plate = 'SU-006-FF'), 136750, 49.0, 9800.00, '2026-02-26'),
((SELECT id FROM vehicles WHERE plate = 'SU-006-FF'), 137350, 48.5, 9700.00, '2026-03-14'),

-- Vozilo 7 (CA-007-GG)
((SELECT id FROM vehicles WHERE plate = 'CA-007-GG'), 85000, 55.0, 11000.00, '2026-01-11'),
((SELECT id FROM vehicles WHERE plate = 'CA-007-GG'), 85650, 53.5, 10700.00, '2026-01-27'),
((SELECT id FROM vehicles WHERE plate = 'CA-007-GG'), 86300, 56.0, 11200.00, '2026-02-13'),
((SELECT id FROM vehicles WHERE plate = 'CA-007-GG'), 86900, 54.5, 10900.00, '2026-03-04'),
((SELECT id FROM vehicles WHERE plate = 'CA-007-GG'), 87500, 55.5, 11100.00, '2026-03-20'),

-- Vozilo 8 (KŠ-008-HH)
((SELECT id FROM vehicles WHERE plate = 'KŠ-008-HH'), 105000, 42.0, 8400.00, '2026-01-07'),
((SELECT id FROM vehicles WHERE plate = 'KŠ-008-HH'), 105550, 41.5, 8300.00, '2026-01-23'),
((SELECT id FROM vehicles WHERE plate = 'KŠ-008-HH'), 106100, 43.0, 8600.00, '2026-02-09'),
((SELECT id FROM vehicles WHERE plate = 'KŠ-008-HH'), 106650, 40.5, 8100.00, '2026-02-24'),
((SELECT id FROM vehicles WHERE plate = 'KŠ-008-HH'), 107200, 42.5, 8500.00, '2026-03-11'),

-- Vozilo 9 (ZA-009-II)
((SELECT id FROM vehicles WHERE plate = 'ZA-009-II'), 145000, 46.5, 9300.00, '2026-01-14'),
((SELECT id FROM vehicles WHERE plate = 'ZA-009-II'), 145600, 45.0, 9000.00, '2026-01-29'),
((SELECT id FROM vehicles WHERE plate = 'ZA-009-II'), 146200, 47.0, 9400.00, '2026-02-16'),
((SELECT id FROM vehicles WHERE plate = 'ZA-009-II'), 146800, 46.0, 9200.00, '2026-03-03'),
((SELECT id FROM vehicles WHERE plate = 'ZA-009-II'), 147400, 45.5, 9100.00, '2026-03-17'),

-- Vozilo 10 (LE-010-JJ)
((SELECT id FROM vehicles WHERE plate = 'LE-010-JJ'), 125000, 38.0, 7600.00, '2026-01-06'),
((SELECT id FROM vehicles WHERE plate = 'LE-010-JJ'), 125450, 37.5, 7500.00, '2026-01-21'),
((SELECT id FROM vehicles WHERE plate = 'LE-010-JJ'), 125900, 39.0, 7800.00, '2026-02-08'),
((SELECT id FROM vehicles WHERE plate = 'LE-010-JJ'), 126350, 38.5, 7700.00, '2026-02-23'),
((SELECT id FROM vehicles WHERE plate = 'LE-010-JJ'), 126800, 37.0, 7400.00, '2026-03-09');
