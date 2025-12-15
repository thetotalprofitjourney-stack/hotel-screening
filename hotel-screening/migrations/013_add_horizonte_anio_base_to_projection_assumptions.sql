-- Migración 013: Agregar horizonte y anio_base a projection_assumptions
-- Estos campos son necesarios para reconstruir correctamente el documento Word
-- desde proyectos finalizados

ALTER TABLE projection_assumptions
  ADD COLUMN horizonte INT NOT NULL DEFAULT 7 AFTER project_id,
  ADD COLUMN anio_base INT NOT NULL DEFAULT 2024 AFTER horizonte;

-- Actualizar anio_base con el año actual para proyectos existentes
UPDATE projection_assumptions
SET anio_base = YEAR(CURDATE())
WHERE anio_base = 2024;
