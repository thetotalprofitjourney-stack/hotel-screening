-- Migración: Agregar dept_total y und_total a usali_annual
-- Para fusionar vistas resumida/detallada en Paso 3

ALTER TABLE usali_annual
  ADD COLUMN dept_total DECIMAL(16,2) NULL AFTER dept_profit,
  ADD COLUMN und_total DECIMAL(16,2) NULL AFTER gop;

-- Actualizar registros existentes calculando dept_total = operating_revenue - dept_profit
UPDATE usali_annual
SET dept_total = operating_revenue - dept_profit
WHERE dept_total IS NULL;

-- Actualizar und_total = dept_profit - gop
UPDATE usali_annual
SET und_total = dept_profit - gop
WHERE und_total IS NULL;

-- Hacer campos NOT NULL después de poblarlos
ALTER TABLE usali_annual
  MODIFY COLUMN dept_total DECIMAL(16,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN und_total DECIMAL(16,2) NOT NULL DEFAULT 0;
