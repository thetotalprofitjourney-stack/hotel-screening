-- Migración 001: Correcciones de campos faltantes
USE hotel_screening;

-- 1. Agregar campo fees_indexacion_pct_anual en operator_contracts
ALTER TABLE operator_contracts
ADD COLUMN IF NOT EXISTS fees_indexacion_pct_anual DECIMAL(6,4) NULL DEFAULT 0.020
COMMENT 'Indexación anual del fee base (ej: 0.02 = 2% inflación)';

-- 2. Agregar dept_profit a usali_annual
ALTER TABLE usali_annual
ADD COLUMN IF NOT EXISTS dept_profit DECIMAL(16,2) NOT NULL DEFAULT 0
AFTER operating_revenue;

-- 3. Agregar rn (roomnights) a usali_annual
ALTER TABLE usali_annual
ADD COLUMN IF NOT EXISTS rn INT NOT NULL DEFAULT 0
AFTER anio;

-- 4. Actualizar vista del selector
DROP VIEW IF EXISTS vw_selector_projects;
CREATE VIEW vw_selector_projects AS
SELECT
  p.project_id, p.nombre, p.rol, p.owner_email, p.ubicacion,
  p.segmento, p.categoria, p.habitaciones, p.horizonte,
  ft.precio_compra, IFNULL(ft.capex_inicial,0) AS capex_inicial,
  ft.ltv, ft.interes, ft.plazo_anios, ft.tipo_amortizacion,
  IFNULL(ps.coste_tx_compra_pct,0) AS coste_tx_compra_pct,
  -- Y1 metrics
  ua1.operating_revenue AS y1_operating_revenue,
  ua1.dept_profit AS y1_dept_profit,
  ua1.gop AS y1_gop,
  ua1.ebitda AS y1_ebitda,
  ua1.ffe AS y1_ffe,
  ua1.ebitda_less_ffe AS y1_noi,
  ua1.ebitda_margin AS y1_ebitda_margin,
  -- Debt metrics
  d1.cuota AS y1_debt_service,
  d1.intereses AS y1_interest,
  d1.amortizacion AS y1_amort,
  (ua1.ebitda / NULLIF(d1.cuota,0)) AS y1_dscr,
  -- Valuation metrics
  (ft.precio_compra / NULLIF(p.habitaciones,0)) AS price_per_key,
  (ua1.ebitda_less_ffe / NULLIF(ft.precio_compra,0)) AS y1_noi_cap_rate,
  (ua1.ebitda_less_ffe / NULLIF((ft.precio_compra + IFNULL(ft.capex_inicial,0)) * (1 + IFNULL(ps.coste_tx_compra_pct,0)),0)) AS y1_yield_on_cost,
  -- Returns
  r.irr_levered, r.moic_levered, r.irr_unlevered, r.moic_unlevered
FROM projects p
LEFT JOIN financing_terms ft ON ft.project_id = p.project_id
LEFT JOIN project_settings ps ON ps.project_id = p.project_id
LEFT JOIN usali_annual ua1 ON ua1.project_id = p.project_id AND ua1.anio = 1
LEFT JOIN debt_schedule_annual d1 ON d1.project_id = p.project_id AND d1.anio = 1
LEFT JOIN returns r ON r.project_id = p.project_id;
