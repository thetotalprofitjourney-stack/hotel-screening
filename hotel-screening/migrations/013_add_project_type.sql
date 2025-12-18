-- Migración: Añadir tipo de proyecto (operador vs inversión)
-- Fecha: 2025-12-18
-- Descripción: Añade campo project_type para diferenciar proyectos finalizados por operador vs inversión/banco

-- 1. Añadir columna project_type
ALTER TABLE projects
ADD COLUMN project_type ENUM('operador', 'inversión') DEFAULT NULL
COMMENT 'Tipo de finalización del proyecto: operador (finaliza en paso 3) o inversión (finaliza en paso 5)';

-- 2. Actualizar proyectos existentes finalizados como 'inversión' por defecto
-- (asumimos que los proyectos finalizados actuales son de inversión)
UPDATE projects
SET project_type = 'inversión'
WHERE estado = 'finalized' AND project_type IS NULL;

-- 3. Verificar el cambio
SELECT project_type, COUNT(*) as cantidad
FROM projects
GROUP BY project_type;

-- NOTAS:
-- - project_type es NULL para proyectos no finalizados
-- - Se establece cuando el usuario elige finalizar el proyecto (paso 3 o paso 5)
-- - 'operador': proyectos finalizados en paso 3 (solo USALI + FEES)
-- - 'inversión': proyectos finalizados en paso 5 (análisis completo con valoración)
