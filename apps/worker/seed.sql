-- Seed data for NutriPro
-- Admin User (email: dieteticatania06@gmail.com)
INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified, created_at, updated_at)
VALUES ('a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1', 'dieteticatania06@gmail.com', '940a5f83270452ee3dc20146189cfae5:ec4e4a4e4b52369c494c029fb20090ce7c1698e5cda17ee94379b8194b39e240', 'admin', 1, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');

-- Admin Profile
INSERT OR IGNORE INTO profiles (id, user_id, first_name, last_name, phone, birth_date, gender, height, weight, goal, allergies, observations, avatar_url, created_at, updated_at)
VALUES ('0a0a0a0a-0a0a-40a0-0a0a-0a0a0a0a0a0a', 'a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1', 'Admin', 'NutriPro', '+34600111222', '1985-05-15', 'male', 178, 75, 'Asesorar a clientes', NULL, NULL, NULL, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
