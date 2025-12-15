-- Migración 011: Crear tabla para almacenar supuestos de proyección
-- Esta tabla guarda los parámetros usados en el último cálculo de proyección
-- para poder recuperarlos cuando se vuelve a abrir el proyecto

CREATE TABLE IF NOT EXISTS projection_assumptions (
  project_id                    CHAR(36) PRIMARY KEY,
  adr_growth_pct                DECIMAL(8,6) NOT NULL DEFAULT 0.05,     -- Crecimiento ADR (ej: 0.05 = 5%)
  occ_delta_pp                  DECIMAL(8,4) NOT NULL DEFAULT 1.0,      -- Delta ocupación en puntos porcentuales
  occ_cap                       DECIMAL(6,4) NOT NULL DEFAULT 0.92,     -- Tope de ocupación (ej: 0.92 = 92%)
  cost_inflation_pct            DECIMAL(8,6) NOT NULL DEFAULT 0.02,     -- Inflación costes departamentales
  undistributed_inflation_pct   DECIMAL(8,6) NOT NULL DEFAULT 0.02,     -- Inflación undistributed
  nonop_inflation_pct           DECIMAL(8,6) NOT NULL DEFAULT 0.02,     -- Inflación non-operating
  created_at                    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pa_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Migrar datos existentes: establecer valores por defecto para proyectos que ya tienen proyección guardada
INSERT IGNORE INTO projection_assumptions (project_id, adr_growth_pct, occ_delta_pp, occ_cap, cost_inflation_pct, undistributed_inflation_pct, nonop_inflation_pct)
SELECT DISTINCT project_id, 0.05, 1.0, 0.92, 0.02, 0.02, 0.02
FROM usali_annual
WHERE anio >= 2;
