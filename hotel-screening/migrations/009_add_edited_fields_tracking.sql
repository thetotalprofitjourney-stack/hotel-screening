-- Crear tabla para rastrear campos editados manualmente por el usuario
CREATE TABLE IF NOT EXISTS edited_fields_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  step INT NOT NULL,                    -- 1, 2, o 3 (para los 3 pasos)
  campo VARCHAR(100) NOT NULL,          -- nombre del campo editado
  mes INT NULL,                         -- mes (1-12) si aplica (para step 1 y 2)
  anio INT NULL,                        -- año si aplica (para step 3)
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_efl_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  INDEX idx_efl_project_step (project_id, step)
) ENGINE=InnoDB;
