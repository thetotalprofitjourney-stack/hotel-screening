-- schema.sql (VERSIÓN MEJORADA CON ÍNDICES OPTIMIZADOS)
CREATE DATABASE IF NOT EXISTS hotel_screening
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE hotel_screening;

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_ALL_TABLES';

-- CATALOGO DE CATEGORIAS (internacional)
CREATE TABLE category_catalog (
  category_code    VARCHAR(32) PRIMARY KEY,       -- economy|midscale|upper_midscale|upscale|upper_upscale|luxury
  display_label    VARCHAR(64) NOT NULL,
  stars_equivalent VARCHAR(32) NOT NULL,
  sort_order       TINYINT NOT NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

INSERT INTO category_catalog (category_code, display_label, stars_equivalent, sort_order)
VALUES
  ('economy','Economy','2*',1),
  ('midscale','Midscale','3*',2),
  ('upper_midscale','Upper Midscale','3* sup',3),
  ('upscale','Upscale','4*',4),
  ('upper_upscale','Upper Upscale','4* sup',5),
  ('luxury','Luxury','5*',6)
ON DUPLICATE KEY UPDATE display_label=VALUES(display_label);

-- USUARIOS (email ← Kajabi) y PROYECTOS
CREATE TABLE users (
  email           VARCHAR(320) PRIMARY KEY,
  kajabi_user_id  VARCHAR(64) UNIQUE NULL,
  full_name       VARCHAR(160) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE projects (
  project_id      CHAR(36) PRIMARY KEY,            -- UUID
  owner_email     VARCHAR(320) NOT NULL,           -- un email → N proyectos; un proyecto → 1 email
  rol             ENUM('inversor','operador','banco') NOT NULL,
  nombre          VARCHAR(200) NOT NULL,
  ubicacion       VARCHAR(120) NOT NULL,           -- mercado/ciudad normalizada (p.ej. PALMA_ES)
  segmento        ENUM('urbano','vacacional') NOT NULL,
  categoria       VARCHAR(32) NOT NULL,            -- FK a category_catalog.category_code
  habitaciones    INT NOT NULL,
  horizonte       INT NOT NULL DEFAULT 7,          -- 5/7/10
  moneda          CHAR(3) NOT NULL DEFAULT 'EUR',
  estado          ENUM('draft','y1_validated','projected','exported') NOT NULL DEFAULT 'draft',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_projects_user FOREIGN KEY (owner_email) REFERENCES users(email) ON DELETE CASCADE,
  CONSTRAINT fk_projects_category FOREIGN KEY (categoria) REFERENCES category_catalog(category_code) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_projects_owner ON projects(owner_email);
CREATE INDEX idx_projects_lookup ON projects(rol, ubicacion, segmento, categoria);
CREATE INDEX idx_projects_estado ON projects(estado, updated_at);

-- SETTINGS / SUPUESTOS DEL PROYECTO
CREATE TABLE project_settings (
  project_id            CHAR(36) PRIMARY KEY,
  ffe                   DECIMAL(6,4) NOT NULL DEFAULT 0.040, -- % sobre ingresos totales
  metodo_valoracion     ENUM('cap_rate','multiplo') NOT NULL DEFAULT 'cap_rate',
  cap_rate_salida       DECIMAL(6,4) NULL,
  multiplo_salida       DECIMAL(8,3) NULL,
  coste_tx_compra_pct   DECIMAL(6,4) NULL,
  coste_tx_venta_pct    DECIMAL(6,4) NULL DEFAULT 0.020,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ps_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- CONTRATO OPERADOR
CREATE TABLE operator_contracts (
  project_id              CHAR(36) PRIMARY KEY,
  operacion_tipo          ENUM('gestion_propia','operador') NOT NULL,
  fee_base_anual          DECIMAL(14,2) NULL,
  fee_pct_gop             DECIMAL(6,4) NULL,
  fee_incentive_pct       DECIMAL(6,4) NULL,
  fee_hurdle_gop_margin   DECIMAL(6,4) NULL,
  fees_indexacion_pct_anual DECIMAL(6,4) NULL DEFAULT 0.020,
  created_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_oc_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- FINANCIACION
CREATE TABLE financing_terms (
  project_id         CHAR(36) PRIMARY KEY,
  precio_compra      DECIMAL(16,2) NULL,
  capex_inicial      DECIMAL(16,2) NULL,
  ltv                DECIMAL(6,4) NULL,
  interes            DECIMAL(6,4) NULL,
  plazo_anios        INT NULL,
  tipo_amortizacion  ENUM('frances','bullet') NULL,
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ft_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- TAMAÑOS (BUCKETS)
CREATE TABLE tamano_buckets_catalog (
  tamano_bucket_id  VARCHAR(24) PRIMARY KEY,       -- S1_1_50, S2_51_100, ...
  min_keys          INT NOT NULL,
  max_keys          INT NULL,                       -- NULL => sin límite superior
  descripcion       VARCHAR(64) NOT NULL,
  orden             INT NOT NULL,
  last_updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT ux_tamano_range UNIQUE (min_keys, COALESCE(max_keys, 2147483647))
) ENGINE=InnoDB;

-- MATRIZ DE RATIOS USALI (por segmento + categoria + tamaño)
CREATE TABLE usali_ratios_matrix (
  perfil_id                VARCHAR(48) PRIMARY KEY,  -- ej: URB_UPSCALE_S3_101_150
  segmento                 ENUM('urbano','vacacional') NOT NULL,
  categoria                VARCHAR(32) NOT NULL,      -- FK a category_catalog
  tamano_bucket_id         VARCHAR(24) NOT NULL,      -- FK a tamano_buckets_catalog
  -- Mix ingresos
  ratio_fb_sobre_rooms     DECIMAL(6,4) NOT NULL,     -- r
  ratio_other_sobre_total  DECIMAL(6,4) NOT NULL,     -- a
  ratio_misc_sobre_total   DECIMAL(6,4) NOT NULL,     -- b
  -- Gastos departamentales
  dept_rooms_pct           DECIMAL(6,4) NOT NULL,     -- % s/Rooms
  dept_rooms_eur_por_rn    DECIMAL(10,2) NULL,        -- €/RN opcional
  fb_food_cost_pct         DECIMAL(6,4) NOT NULL,     -- % s/FB
  fb_labor_pct             DECIMAL(6,4) NOT NULL,     -- % s/FB
  fb_otros_pct             DECIMAL(6,4) NOT NULL,     -- % s/FB
  dept_other_pct           DECIMAL(6,4) NOT NULL,     -- % s/Other
  -- Undistributed (sobre Total Revenue)
  und_ag_pct               DECIMAL(6,4) NOT NULL,
  und_it_pct               DECIMAL(6,4) NOT NULL,
  und_sm_pct               DECIMAL(6,4) NOT NULL,
  und_pom_pct              DECIMAL(6,4) NOT NULL,
  und_eww_pct              DECIMAL(6,4) NOT NULL,
  version                  VARCHAR(16) NOT NULL,
  last_updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_urm_cat   FOREIGN KEY (categoria) REFERENCES category_catalog(category_code) ON DELETE RESTRICT,
  CONSTRAINT fk_urm_size  FOREIGN KEY (tamano_bucket_id) REFERENCES tamano_buckets_catalog(tamano_bucket_id) ON DELETE RESTRICT,
  CONSTRAINT chk_other_misc CHECK ((ratio_other_sobre_total + ratio_misc_sobre_total) < 1)
) ENGINE=InnoDB;
CREATE INDEX idx_urm_resolve ON usali_ratios_matrix(segmento, categoria, tamano_bucket_id);

-- BENCHMARK OCC/ADR (estructura SIN datos)
CREATE TABLE occ_adr_benchmark_catalog (
  benchmark_id      VARCHAR(80) PRIMARY KEY,  -- p.ej. UPSCALE_PALMA_2024
  categoria         VARCHAR(32) NOT NULL,     -- FK a category_catalog
  mercado           VARCHAR(120) NOT NULL,
  anio_base         INT NOT NULL,
  mes               TINYINT NOT NULL,         -- 1..12
  occ               DECIMAL(6,4) NOT NULL,    -- 0..1
  adr               DECIMAL(12,2) NOT NULL,   -- €
  fuente            VARCHAR(160) NULL,
  last_updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT ux_benchmark UNIQUE (categoria, mercado, anio_base, mes),
  CONSTRAINT fk_bench_cat FOREIGN KEY (categoria) REFERENCES category_catalog(category_code) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX idx_benchmark_lookup ON occ_adr_benchmark_catalog(categoria, mercado, anio_base);

-- Y1 COMERCIAL (validado)
CREATE TABLE y1_commercial (
  project_id         CHAR(36) NOT NULL,
  mes                TINYINT NOT NULL,
  y1_mes_occ         DECIMAL(6,4) NOT NULL,
  y1_mes_adr         DECIMAL(12,2) NOT NULL,
  y1_mes_rn          INT NOT NULL,
  y1_mes_rooms_rev   DECIMAL(16,2) NOT NULL,
  locked             TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, mes),
  CONSTRAINT fk_y1c_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- USALI Y1 (mensual)
CREATE TABLE usali_y1_monthly (
  project_id         CHAR(36) NOT NULL,
  mes                TINYINT NOT NULL,
  rooms              DECIMAL(16,2) NOT NULL,
  fb                 DECIMAL(16,2) NOT NULL,
  other_operated     DECIMAL(16,2) NOT NULL,
  misc_income        DECIMAL(16,2) NOT NULL,
  total_rev          DECIMAL(16,2) NOT NULL,
  dept_rooms         DECIMAL(16,2) NOT NULL,
  dept_fb            DECIMAL(16,2) NOT NULL,
  dept_other         DECIMAL(16,2) NOT NULL,
  dept_total         DECIMAL(16,2) NOT NULL,
  dept_profit        DECIMAL(16,2) NOT NULL,
  und_ag             DECIMAL(16,2) NOT NULL,
  und_it             DECIMAL(16,2) NOT NULL,
  und_sm             DECIMAL(16,2) NOT NULL,
  und_pom            DECIMAL(16,2) NOT NULL,
  und_eww            DECIMAL(16,2) NOT NULL,
  und_total          DECIMAL(16,2) NOT NULL,
  gop                DECIMAL(16,2) NOT NULL,
  fees_base          DECIMAL(16,2) NOT NULL,
  fees_variable      DECIMAL(16,2) NOT NULL,
  fees_incentive     DECIMAL(16,2) NOT NULL,
  fees_total         DECIMAL(16,2) NOT NULL,
  income_before_nonop DECIMAL(16,2) NOT NULL,
  nonop_total        DECIMAL(16,2) NOT NULL,
  ebitda             DECIMAL(16,2) NOT NULL,
  ffe_amount         DECIMAL(16,2) NOT NULL,
  ebitda_less_ffe    DECIMAL(16,2) NOT NULL,
  PRIMARY KEY (project_id, mes),
  CONSTRAINT fk_usali_y1m_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- USALI ANUAL (1..horizonte) - ⭐ MEJORADO CON ÍNDICES
CREATE TABLE usali_annual (
  project_id         CHAR(36) NOT NULL,
  anio               INT NOT NULL,
  operating_revenue  DECIMAL(16,2) NOT NULL,
  gop                DECIMAL(16,2) NOT NULL,
  fees               DECIMAL(16,2) NOT NULL,
  nonop              DECIMAL(16,2) NOT NULL,
  ebitda             DECIMAL(16,2) NOT NULL,
  ffe                DECIMAL(16,2) NOT NULL,
  ebitda_less_ffe    DECIMAL(16,2) NOT NULL,
  gop_margin         DECIMAL(6,4) NOT NULL,
  ebitda_margin      DECIMAL(6,4) NOT NULL,
  ebitda_less_ffe_margin DECIMAL(6,4) NOT NULL,
  PRIMARY KEY (project_id, anio),
  CONSTRAINT fk_usali_annual_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ⭐ NUEVO ÍNDICE para consultas de valoración
CREATE INDEX idx_usali_annual_lookup ON usali_annual(project_id, anio);

-- DEUDA / VALORACION / RETORNOS / NON-OP / AUDIT
CREATE TABLE debt_schedule_annual (
  project_id         CHAR(36) NOT NULL,
  anio               INT NOT NULL,
  intereses          DECIMAL(16,2) NOT NULL,
  amortizacion       DECIMAL(16,2) NOT NULL,
  cuota              DECIMAL(16,2) NOT NULL,
  saldo_final        DECIMAL(16,2) NOT NULL,
  PRIMARY KEY (project_id, anio),
  CONSTRAINT fk_debt_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ⭐ NUEVO ÍNDICE
CREATE INDEX idx_debt_schedule_lookup ON debt_schedule_annual(project_id, anio);

CREATE TABLE valuations (
  project_id         CHAR(36) PRIMARY KEY,
  valor_salida_bruto DECIMAL(18,2) NULL,
  valor_salida_neto  DECIMAL(18,2) NULL,
  ltv_salida         DECIMAL(6,4) NULL,
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_val_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE returns (
  project_id         CHAR(36) PRIMARY KEY,
  irr_unlevered      DECIMAL(8,5) NULL,
  moic_unlevered     DECIMAL(8,5) NULL,
  yield_on_cost_y1   DECIMAL(8,5) NULL,
  irr_levered        DECIMAL(8,5) NULL,
  moic_levered       DECIMAL(8,5) NULL,
  payback_anios      DECIMAL(8,3) NULL,
  fcfe_json          JSON NULL,
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ret_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE nonoperating_assumptions (
  project_id            CHAR(36) PRIMARY KEY,
  nonop_taxes_anual     DECIMAL(16,2) NOT NULL DEFAULT 0,
  nonop_insurance_anual DECIMAL(16,2) NOT NULL DEFAULT 0,
  nonop_rent_anual      DECIMAL(16,2) NOT NULL DEFAULT 0,
  nonop_other_anual     DECIMAL(16,2) NOT NULL DEFAULT 0,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_nonop_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  audit_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id        CHAR(36) NOT NULL,
  paso              VARCHAR(40) NOT NULL, -- p.ej. PASO_3_BENCHMARK
  user_email        VARCHAR(320) NOT NULL,
  payload_hash      CHAR(64) NULL,        -- sha256 opcional
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ⭐ NUEVO ÍNDICE para auditoría
CREATE INDEX idx_audit_project_date ON audit_logs(project_id, created_at);
CREATE INDEX idx_audit_user_date ON audit_logs(user_email, created_at);
