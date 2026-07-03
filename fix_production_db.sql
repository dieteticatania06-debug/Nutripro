-- Script corrector para la base de datos de producción D1
-- Añade las columnas faltantes que causan el error 500 al listar usuarios
ALTER TABLE profiles ADD COLUMN plan TEXT;
ALTER TABLE profiles ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';
