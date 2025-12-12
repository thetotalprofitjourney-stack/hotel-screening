-- Añadir columna de días editables a la tabla y1_commercial
ALTER TABLE y1_commercial
ADD COLUMN y1_mes_dias TINYINT NOT NULL DEFAULT 30 AFTER mes;

-- Actualizar los días existentes con los valores correctos según el mes
-- Asumiendo año no bisiesto (365 días)
UPDATE y1_commercial SET y1_mes_dias = 31 WHERE mes IN (1, 3, 5, 7, 8, 10, 12);
UPDATE y1_commercial SET y1_mes_dias = 30 WHERE mes IN (4, 6, 9, 11);
UPDATE y1_commercial SET y1_mes_dias = 28 WHERE mes = 2;
