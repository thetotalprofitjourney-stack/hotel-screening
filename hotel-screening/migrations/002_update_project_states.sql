-- Migración: Actualizar estados del proyecto
-- Fecha: 2025-12-11
-- Descripción: Añade nuevos estados para reflejar el progreso del proyecto

-- 1. Verificar la columna 'estado' actual
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = 'hotel_screening' AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'estado';

-- 2. Modificar la columna para incluir los nuevos estados
ALTER TABLE projects
MODIFY COLUMN estado ENUM(
    'draft',           -- Proyecto inicial sin datos
    'y1_commercial',   -- Y1 comercial aceptado (Paso 1)
    'y1_usali',        -- USALI Y1 guardado (Paso 2)
    'projection_2n',   -- Proyección años 2-N completada (Paso 3)
    'finalized',       -- Análisis completo ejecutado
    'y1_validated',    -- DEPRECADO: mantener por compatibilidad
    'projected',       -- DEPRECADO: mantener por compatibilidad
    'exported'         -- DEPRECADO: mantener por compatibilidad
) DEFAULT 'draft';

-- 3. Actualizar proyectos con estado 'y1_validated' al nuevo 'y1_commercial'
-- (Solo si quieres migrar datos existentes)
-- UPDATE projects SET estado = 'y1_commercial' WHERE estado = 'y1_validated';

-- 4. Verificar el cambio
SELECT estado, COUNT(*) as cantidad
FROM projects
GROUP BY estado;

-- NOTAS:
-- - Los estados deprecados (y1_validated, projected, exported) se mantienen
--   temporalmente para no romper proyectos existentes
-- - Si todos tus proyectos están en desarrollo, puedes ejecutar el UPDATE
--   para migrar de 'y1_validated' a 'y1_commercial'
-- - Los nuevos proyectos usarán automáticamente los nuevos estados
