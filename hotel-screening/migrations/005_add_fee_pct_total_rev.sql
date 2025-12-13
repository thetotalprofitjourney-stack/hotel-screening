-- Migración 005: Agregar fee_pct_total_rev a operator_contracts
USE hotel_screening;

-- Agregar campo fee_pct_total_rev (Fee % sobre TOTAL REV)
ALTER TABLE operator_contracts
ADD COLUMN IF NOT EXISTS fee_pct_total_rev DECIMAL(6,4) NULL
AFTER fee_base_anual
COMMENT 'Fee como % sobre Total Revenue (0-1, ej: 0.05 = 5%)';
