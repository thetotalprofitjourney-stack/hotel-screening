-- Proyectos de un email (Pantalla 1)
SELECT project_id, nombre, rol, ubicacion, segmento, categoria, horizonte, estado
FROM projects
WHERE owner_email = 'usuario@dominio.com'
ORDER BY updated_at DESC;

-- Resolver bucket de tamaño para 130 keys (en app lo harás en código)
SELECT tamano_bucket_id
FROM tamano_buckets_catalog
WHERE min_keys <= 130 AND (max_keys IS NULL OR 130 <= max_keys)
LIMIT 1;

-- Ratios USALI para segmento+categoria+tamaño
SELECT * FROM usali_ratios_matrix
WHERE segmento='urbano' AND categoria='upscale' AND tamano_bucket_id='S3_101_150';

-- Benchmark Y1 (12 filas) para categoria+mercado+anio
SELECT mes, occ, adr
FROM occ_adr_benchmark_catalog
WHERE categoria='upscale' AND mercado='PALMA_ES' AND anio_base=2024
ORDER BY mes;
