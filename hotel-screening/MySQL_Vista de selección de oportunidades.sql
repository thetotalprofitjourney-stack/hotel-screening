USE hotel_screening;

-- Vista con KPIs para comparar proyectos del screening (sin capex anual)
DROP VIEW IF EXISTS vw_selector_projects;
CREATE VIEW vw_selector_projects AS
SELECT
  p.project_id, p.nombre, p.rol, p.owner_email, p.comunidad_autonoma, p.provincia, p.zona, p.segmento, p.categoria, p.habitaciones, p.horizonte,
  p.estado, p.project_type, p.created_at,
  ft.precio_compra, IFNULL(ft.capex_inicial,0) AS capex_inicial, ft.ltv, ft.interes, ft.plazo_anios, ft.tipo_amortizacion,
  IFNULL(ps.coste_tx_compra_pct,0) AS coste_tx_compra_pct,
  -- Y1 (ya calculado previamente con /y1/calc)
  ua1.operating_revenue   AS y1_operating_revenue,
  ua1.gop                 AS y1_gop,
  ua1.ebitda              AS y1_ebitda,
  ua1.ffe                 AS y1_ffe,
  ua1.ebitda_less_ffe     AS y1_noi,                -- proxy NOI
  ua1.ebitda_margin       AS y1_ebitda_margin,
  -- Deuda Y1 (si hay financiación)
  d1.cuota                AS y1_debt_service,
  d1.intereses            AS y1_interest,
  d1.amortizacion         AS y1_amort,
  (ua1.ebitda / NULLIF(d1.cuota,0)) AS y1_dscr,
  -- Métricas de precio
  (ft.precio_compra / NULLIF(p.habitaciones,0)) AS price_per_key,
  -- Cap rate Y1 (con NOI = EBITDA-FF&E)
  (ua1.ebitda_less_ffe / NULLIF(ft.precio_compra,0)) AS y1_noi_cap_rate,
  -- Yield on Cost Y1 = NOI Y1 / (precio+capex_inicial+costes_compra)
  (ua1.ebitda_less_ffe / NULLIF( (ft.precio_compra + IFNULL(ft.capex_inicial,0)) * (1 + IFNULL(ps.coste_tx_compra_pct,0)) ,0)) AS y1_yield_on_cost,
  -- Retornos (si ya ejecutaste /valuation-and-returns)
  r.irr_levered, r.moic_levered, r.irr_unlevered, r.moic_unlevered,
  -- FEES totales y FEES por key (habitación)
  fees_totals.total_fees,
  (fees_totals.total_fees / NULLIF(p.habitaciones, 0)) AS fees_per_key,
  -- Equity = Base de inversión * (1 - LTV)
  ((ft.precio_compra + IFNULL(ft.capex_inicial,0)) * (1 + IFNULL(ps.coste_tx_compra_pct,0)) * (1 - IFNULL(ft.ltv,0))) AS equity
FROM projects p
LEFT JOIN financing_terms        ft  ON ft.project_id = p.project_id
LEFT JOIN project_settings       ps  ON ps.project_id = p.project_id
LEFT JOIN usali_annual           ua1 ON ua1.project_id = p.project_id AND ua1.anio = 1
LEFT JOIN debt_schedule_annual   d1  ON d1.project_id  = p.project_id AND d1.anio = 1
LEFT JOIN returns                r   ON r.project_id   = p.project_id
LEFT JOIN (
  SELECT project_id,
         SUM(fees) AS total_fees
  FROM usali_annual
  GROUP BY project_id
) fees_totals ON fees_totals.project_id = p.project_id;
