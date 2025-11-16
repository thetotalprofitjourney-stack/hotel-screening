-- seed_sizes_and_ratios.sql
USE hotel_screening;

-- 1) Buckets de tamaño
INSERT INTO tamano_buckets_catalog (tamano_bucket_id, min_keys, max_keys, descripcion, orden)
VALUES
 ('S1_1_50',     1,   50,  '1–50 keys',     1),
 ('S2_51_100',  51,  100,  '51–100 keys',   2),
 ('S3_101_150',101,  150,  '101–150 keys',  3),
 ('S4_151_250',151,  250,  '151–250 keys',  4),
 ('S5_251_400',251,  400,  '251–400 keys',  5),
 ('S6_401_MAX',401, NULL,  '401+ keys',     6)
ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion);

-- 2) Bases por (segmento × categoria internacional)
DROP TABLE IF EXISTS usali_ratios_base_type;
CREATE TABLE usali_ratios_base_type (
  segmento                 ENUM('urbano','vacacional') NOT NULL,
  categoria                VARCHAR(32) NOT NULL,
  r                        DECIMAL(6,4) NOT NULL,  -- F&B / Rooms
  a                        DECIMAL(6,4) NOT NULL,  -- Other / Total
  b                        DECIMAL(6,4) NOT NULL,  -- Misc / Total
  dept_rooms_pct           DECIMAL(6,4) NOT NULL,
  dept_rooms_eur_por_rn    DECIMAL(10,2) NULL,
  fb_food_cost_pct         DECIMAL(6,4) NOT NULL,
  fb_labor_pct             DECIMAL(6,4) NOT NULL,
  fb_otros_pct             DECIMAL(6,4) NOT NULL,
  dept_other_pct           DECIMAL(6,4) NOT NULL,
  und_ag_pct               DECIMAL(6,4) NOT NULL,
  und_it_pct               DECIMAL(6,4) NOT NULL,
  und_sm_pct               DECIMAL(6,4) NOT NULL,
  und_pom_pct              DECIMAL(6,4) NOT NULL,
  und_eww_pct              DECIMAL(6,4) NOT NULL,
  version                  VARCHAR(16) NOT NULL DEFAULT '2025Q3',
  PRIMARY KEY (segmento, categoria)
) ENGINE=InnoDB;

-- URBANO (economy→luxury)
INSERT INTO usali_ratios_base_type
(segmento,categoria,r,a,b,dept_rooms_pct,dept_rooms_eur_por_rn,fb_food_cost_pct,fb_labor_pct,fb_otros_pct,dept_other_pct,und_ag_pct,und_it_pct,und_sm_pct,und_pom_pct,und_eww_pct)
VALUES
('urbano','economy',        0.100,0.060,0.010, 0.230, NULL, 0.27,0.27,0.11, 0.28, 0.050,0.010,0.045,0.028,0.028),
('urbano','midscale',       0.150,0.070,0.010, 0.240, NULL, 0.28,0.28,0.12, 0.30, 0.055,0.010,0.050,0.030,0.030),
('urbano','upper_midscale', 0.195,0.065,0.010, 0.245, NULL, 0.29,0.30,0.12, 0.31, 0.058,0.010,0.052,0.031,0.031),
('urbano','upscale',        0.240,0.060,0.010, 0.250, NULL, 0.29,0.31,0.12, 0.32, 0.060,0.010,0.055,0.032,0.032),
('urbano','upper_upscale',  0.277,0.065,0.010, 0.260, NULL, 0.30,0.33,0.12, 0.34, 0.062,0.011,0.058,0.034,0.034),
('urbano','luxury',         0.314,0.070,0.010, 0.270, NULL, 0.31,0.35,0.12, 0.35, 0.065,0.012,0.060,0.035,0.035)
ON DUPLICATE KEY UPDATE r=VALUES(r);

-- VACACIONAL (más peso F&B)
INSERT INTO usali_ratios_base_type
(segmento,categoria,r,a,b,dept_rooms_pct,dept_rooms_eur_por_rn,fb_food_cost_pct,fb_labor_pct,fb_otros_pct,dept_other_pct,und_ag_pct,und_it_pct,und_sm_pct,und_pom_pct,und_eww_pct)
VALUES
('vacacional','economy',        0.300,0.070,0.015, 0.250, NULL, 0.29,0.30,0.12, 0.31, 0.052,0.010,0.050,0.033,0.032),
('vacacional','midscale',       0.385,0.080,0.020, 0.260, NULL, 0.30,0.32,0.12, 0.33, 0.055,0.010,0.055,0.035,0.035),
('vacacional','upper_midscale', 0.440,0.080,0.020, 0.265, NULL, 0.31,0.33,0.12, 0.34, 0.057,0.010,0.057,0.036,0.035),
('vacacional','upscale',        0.500,0.080,0.020, 0.270, NULL, 0.31,0.35,0.12, 0.35, 0.060,0.011,0.060,0.038,0.036),
('vacacional','upper_upscale',  0.550,0.090,0.020, 0.275, NULL, 0.32,0.36,0.12, 0.36, 0.063,0.011,0.063,0.039,0.037),
('vacacional','luxury',         0.600,0.100,0.020, 0.280, NULL, 0.32,0.36,0.12, 0.36, 0.065,0.012,0.065,0.040,0.038)
ON DUPLICATE KEY UPDATE r=VALUES(r);

-- 3) Multiplicadores por tamaño (economías de escala sencillas)
DROP TABLE IF EXISTS tamano_size_multipliers;
CREATE TABLE tamano_size_multipliers (
  tamano_bucket_id        VARCHAR(24) PRIMARY KEY,
  dept_rooms_pct_delta    DECIMAL(6,4) NOT NULL,
  und_all_delta           DECIMAL(6,4) NOT NULL,
  CONSTRAINT fk_tsm_bucket FOREIGN KEY (tamano_bucket_id) REFERENCES tamano_buckets_catalog(tamano_bucket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO tamano_size_multipliers (tamano_bucket_id, dept_rooms_pct_delta, und_all_delta)
VALUES
 ('S1_1_50',     0.010,  0.010),
 ('S2_51_100',   0.005,  0.005),
 ('S3_101_150',  0.000,  0.000),
 ('S4_151_250', -0.005, -0.003),
 ('S5_251_400', -0.010, -0.005),
 ('S6_401_MAX', -0.015, -0.007)
ON DUPLICATE KEY UPDATE dept_rooms_pct_delta=VALUES(dept_rooms_pct_delta);

-- 4) Generar la matriz final (72 filas)
DELETE FROM usali_ratios_matrix;

INSERT INTO usali_ratios_matrix
(perfil_id, segmento, categoria, tamano_bucket_id,
 ratio_fb_sobre_rooms, ratio_other_sobre_total, ratio_misc_sobre_total,
 dept_rooms_pct, dept_rooms_eur_por_rn, fb_food_cost_pct, fb_labor_pct, fb_otros_pct, dept_other_pct,
 und_ag_pct, und_it_pct, und_sm_pct, und_pom_pct, und_eww_pct,
 version)
SELECT
  CONCAT(UPPER(SUBSTRING(ubr.segmento,1,3)),'_', UPPER(REPLACE(ubr.categoria,'_','')), '_', tsm.tamano_bucket_id) AS perfil_id,
  ubr.segmento,
  ubr.categoria,
  tsm.tamano_bucket_id,
  ubr.r AS ratio_fb_sobre_rooms,
  ubr.a AS ratio_other_sobre_total,
  ubr.b AS ratio_misc_sobre_total,
  GREATEST(0, ubr.dept_rooms_pct + tsm.dept_rooms_pct_delta) AS dept_rooms_pct,
  ubr.dept_rooms_eur_por_rn,
  ubr.fb_food_cost_pct,
  ubr.fb_labor_pct,
  ubr.fb_otros_pct,
  ubr.dept_other_pct,
  GREATEST(0, ubr.und_ag_pct  + tsm.und_all_delta) AS und_ag_pct,
  GREATEST(0, ubr.und_it_pct  + tsm.und_all_delta) AS und_it_pct,
  GREATEST(0, ubr.und_sm_pct  + tsm.und_all_delta) AS und_sm_pct,
  GREATEST(0, ubr.und_pom_pct + tsm.und_all_delta) AS und_pom_pct,
  GREATEST(0, ubr.und_eww_pct + tsm.und_all_delta) AS und_eww_pct,
  ubr.version
FROM usali_ratios_base_type ubr
CROSS JOIN tamano_size_multipliers tsm;
