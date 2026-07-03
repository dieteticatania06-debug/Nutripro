-- Script para actualizar la contraseña del Administrador en produccion
UPDATE users SET password_hash = 'b5e91fe58de0ea48dc68d6346f95a8b3:ea174b323ae33f1863c75bf4ed82ad84f1ee05d543a5fe1e4f2422784237b8d1', email_verified = 1 WHERE email = 'dieteticatania06@gmail.com';
