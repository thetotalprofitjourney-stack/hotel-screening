# Instrucciones para Migración 005

## Agregar columna fee_pct_total_rev a operator_contracts

### Opción 1: MySQL desde línea de comandos (recomendado)

```bash
mysql -u tu_usuario -p hotel_screening
```

Luego ejecuta:

```sql
USE hotel_screening;

-- Verificar si la columna ya existe
SHOW COLUMNS FROM operator_contracts LIKE 'fee_pct_total_rev';

-- Si NO existe, ejecutar:
ALTER TABLE operator_contracts
ADD COLUMN fee_pct_total_rev DECIMAL(6,4) NULL
AFTER fee_base_anual
COMMENT 'Fee como % sobre Total Revenue (0-1, ej: 0.05 = 5%)';

-- Verificar que se creó correctamente
DESCRIBE operator_contracts;
```

### Opción 2: Ejecutar archivo de migración

```bash
mysql -u tu_usuario -p hotel_screening < migrations/005_add_fee_pct_total_rev.sql
```

### Opción 3: SQL directo (una sola línea)

```bash
mysql -u tu_usuario -p hotel_screening -e "ALTER TABLE operator_contracts ADD COLUMN IF NOT EXISTS fee_pct_total_rev DECIMAL(6,4) NULL AFTER fee_base_anual COMMENT 'Fee como % sobre Total Revenue (0-1, ej: 0.05 = 5%)';"
```

### Verificación

Después de ejecutar la migración, verifica que la columna existe:

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hotel_screening'
  AND TABLE_NAME = 'operator_contracts'
  AND COLUMN_NAME = 'fee_pct_total_rev';
```

Deberías ver:

```
+-------------------+-------------+-------------+------------------------------------------------------+
| COLUMN_NAME       | COLUMN_TYPE | IS_NULLABLE | COLUMN_COMMENT                                       |
+-------------------+-------------+-------------+------------------------------------------------------+
| fee_pct_total_rev | decimal(6,4)| YES         | Fee como % sobre Total Revenue (0-1, ej: 0.05 = 5%) |
+-------------------+-------------+-------------+------------------------------------------------------+
```

## ¿Qué hace esta columna?

- **Nombre**: `fee_pct_total_rev`
- **Tipo**: `DECIMAL(6,4)` - Permite valores de 0.0000 a 99.9999
- **Nullable**: Sí (puede ser NULL)
- **Función**: Almacena el porcentaje de fee sobre Total Revenue como decimal
  - Ejemplo: 5% se guarda como 0.0500
  - Ejemplo: 2.5% se guarda como 0.0250

Este fee se suma con `fee_base_anual` para permitir contratos mixtos:
- **Fee Total** = Fee Base Anual + (Fee % Total Rev × Total Revenue) + Fee GOP + Fee Incentivo
