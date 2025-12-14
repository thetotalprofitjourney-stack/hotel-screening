-- Crear tabla para guardar escenarios personalizados del Análisis de Sensibilidad
CREATE TABLE IF NOT EXISTS sensitivity_scenarios (
  scenario_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  scenario_name VARCHAR(100) NOT NULL,
  adr_delta_pct DECIMAL(8,6) NOT NULL,    -- variación de ADR (ej. 0.02 = +2%, -0.03 = -3%)
  occ_delta_pp DECIMAL(8,4) NOT NULL,      -- variación de ocupación en pp (ej. 1.0 = +1pp, -2.0 = -2pp)
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ss_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  INDEX idx_ss_project (project_id)
) ENGINE=InnoDB;
