Migraciones de Base de Datos
Este directorio contiene las migraciones SQL que deben ejecutarse en orden.

Orden de ejecución
Instalación inicial:

../schema.sql - Crear todas las tablas
../seed_sizes_and_ratios.sql - Poblar catálogos de tamaños y ratios
Migraciones:

001_fix_missing_fields.sql - Agregar campos faltantes (rn, dept_profit, fees_indexacion_pct_anual)
Cómo ejecutar
# Desde el directorio migrations/
mysql -u tu_usuario -p hotel_screening < 001_fix_missing_fields.sql
Notas
Si ya tienes la base de datos creada previamente, ejecuta solo las migraciones que no hayas aplicado.
Cada migración es idempotente (usa IF NOT EXISTS y DROP VIEW IF EXISTS).
