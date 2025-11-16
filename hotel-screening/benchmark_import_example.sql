-- benchmark_import_example.sql
USE hotel_screening;

-- La tabla ya existe (occ_adr_benchmark_catalog).
-- Prepara un CSV con cabecera:
-- categoria,mercado,anio_base,mes,occ,adr,fuente
-- Ejemplo de fila:
-- upscale,PALMA_ES,2024,1,0.22,105,STR_2024Q1

-- Opción A) LOAD DATA INFILE (servidor):
-- Asegúrate de tener los permisos y secure_file_priv configurado.
-- Cambia '/path/benchmark.csv' por tu ruta.

-- LOAD DATA INFILE '/path/benchmark.csv'
-- INTO TABLE occ_adr_benchmark_catalog
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n'
-- IGNORE 1 LINES
-- (categoria, mercado, anio_base, mes, occ, adr, fuente)
-- SET benchmark_id = CONCAT(UPPER(REPLACE(categoria,'_','')), '_', mercado, '_', anio_base);

-- Opción B) LOAD DATA LOCAL INFILE (cliente):
-- mysql --local-infile=1 -u user -p
-- SET GLOBAL local_infile=1;
-- LOAD DATA LOCAL INFILE '/path/benchmark.csv'
-- INTO TABLE occ_adr_benchmark_catalog
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n'
-- IGNORE 1 LINES
-- (categoria, mercado, anio_base, mes, occ, adr, fuente)
-- SET benchmark_id = CONCAT(UPPER(REPLACE(categoria,'_','')), '_', mercado, '_', anio_base);
