-- Migration: Add gop_ajustado field to operator_contracts
-- Date: 2025-12-13
-- Description: Adds gop_ajustado boolean field to allow selection between GOP and GOP Adjusted (minus FF&E)

ALTER TABLE operator_contracts
ADD COLUMN gop_ajustado BOOLEAN NOT NULL DEFAULT FALSE
AFTER fee_hurdle_gop_margin;
