-- benchmark_import_example.sql
USE hotel_screening;

-- La tabla ya existe (occ_adr_benchmark_catalog).
-- Nueva estructura basada en ubicación geográfica (Comunidad Autónoma-Provincia-Zona-Mes)
-- Prepara un CSV con cabecera:
-- categoria,comunidad_autonoma,provincia,zona,mes,occ,adr,fuente
-- Ejemplo de filas (12 meses para cada combinación geográfica):
-- upscale,Andalucía,Málaga,Costa del Sol,1,0.22,105,STR_2024Q1
-- upscale,Andalucía,Málaga,Costa del Sol,2,0.25,110,STR_2024Q1
-- upscale,Andalucía,Málaga,Costa del Sol,3,0.30,125,STR_2024Q1
-- ... (hasta mes 12)

-- Opción A) Importación vía API
-- Usar el endpoint POST /v1/benchmark/import con JSON:
-- {
--   "rows": [
--     {
--       "categoria": "upscale",
--       "comunidad_autonoma": "Andalucía",
--       "provincia": "Málaga",
--       "zona": "Costa del Sol",
--       "mes": 1,
--       "occ": 0.22,
--       "adr": 105,
--       "fuente": "STR_2024Q1"
--     },
--     ...
--   ]
-- }

-- Opción B) LOAD DATA INFILE (servidor):
-- Asegúrate de tener los permisos y secure_file_priv configurado.
-- Cambia '/path/benchmark.csv' por tu ruta.

-- LOAD DATA INFILE '/path/benchmark.csv'
-- INTO TABLE occ_adr_benchmark_catalog
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n'
-- IGNORE 1 LINES
-- (categoria, comunidad_autonoma, provincia, zona, mes, occ, adr, fuente)
-- SET benchmark_id = CONCAT(comunidad_autonoma, '-', provincia, '-', REPLACE(zona, ' ', ''), '-', mes);

-- Opción C) LOAD DATA LOCAL INFILE (cliente):
-- mysql --local-infile=1 -u user -p
-- SET GLOBAL local_infile=1;
-- LOAD DATA LOCAL INFILE '/path/benchmark.csv'
-- INTO TABLE occ_adr_benchmark_catalog
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n'
-- IGNORE 1 LINES
-- (categoria, comunidad_autonoma, provincia, zona, mes, occ, adr, fuente)
-- SET benchmark_id = CONCAT(comunidad_autonoma, '-', provincia, '-', REPLACE(zona, ' ', ''), '-', mes);

-- NOTA IMPORTANTE:
-- - Cada combinación de Comunidad Autónoma-Provincia-Zona debe tener EXACTAMENTE 12 filas (meses 1-12)
-- - El campo 'mes' debe ser INT (1-12), NO texto
-- - La nueva estructura NO usa 'anio_base' - solo se proyecta año 1
