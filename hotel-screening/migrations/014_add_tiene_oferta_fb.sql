-- Migración 014: Añadir campo tiene_oferta_fb a la tabla projects
-- Fecha: 2025-12-18
-- Descripción: Añade un campo booleano para indicar si el hotel tiene oferta de F&B
--              Por defecto es TRUE (Sí) para todos los proyectos existentes

-- Añadir columna tiene_oferta_fb con valor por defecto TRUE
ALTER TABLE projects
ADD COLUMN tiene_oferta_fb BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica si el hotel tiene oferta de F&B (restaurante, bar, etc.)';

-- Actualizar proyectos existentes para que tengan oferta_fb = TRUE
UPDATE projects SET tiene_oferta_fb = TRUE WHERE tiene_oferta_fb IS NULL;
