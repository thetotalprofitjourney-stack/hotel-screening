-- Migration 007: Fix decimal precision for returns metrics
-- Problem: DECIMAL(8,5) only allows 3 integer digits (max 999.99999)
-- Solution: Change to DECIMAL(12,4) to allow larger values (up to 99,999,999.9999)

USE hotel_screening;

ALTER TABLE returns
  MODIFY COLUMN irr_unlevered DECIMAL(12,4) NULL,
  MODIFY COLUMN moic_unlevered DECIMAL(12,4) NULL,
  MODIFY COLUMN yield_on_cost_y1 DECIMAL(12,4) NULL,
  MODIFY COLUMN irr_levered DECIMAL(12,4) NULL,
  MODIFY COLUMN moic_levered DECIMAL(12,4) NULL;

-- Note: This fixes the "Out of range value" error when projects without financing
-- calculate returns, where unlevered and levered returns should be identical.
