# Migración 007: Fix Returns Decimal Precision

## Problema

En proyectos **sin financiación** (LTV = 0%), al ejecutar el Paso 5 "Valorar & Retornos", se producía el siguiente error:

```
Error al valorar: HTTP 400: Out of range value for column 'moic_unlevered' at row 1
```

### Causa raíz

Los campos de retornos en la tabla `returns` estaban definidos como `DECIMAL(8,5)`:
- 8 dígitos totales
- 5 decimales
- **Solo 3 dígitos enteros** (rango: -999.99999 a 999.99999)

Cuando el MOIC (Multiple on Invested Capital) o IRR superaba 999.99999, MySQL rechazaba la inserción.

## Solución

Cambiar la precisión de los campos de retornos a `DECIMAL(12,4)`:
- 12 dígitos totales
- 4 decimales
- **8 dígitos enteros** (rango: -99,999,999.9999 a 99,999,999.9999)

Esto permite valores mucho más grandes sin pérdida significativa de precisión decimal.

## Campos modificados

- `irr_unlevered`: DECIMAL(8,5) → DECIMAL(12,4)
- `moic_unlevered`: DECIMAL(8,5) → DECIMAL(12,4)
- `yield_on_cost_y1`: DECIMAL(8,5) → DECIMAL(12,4)
- `irr_levered`: DECIMAL(8,5) → DECIMAL(12,4)
- `moic_levered`: DECIMAL(8,5) → DECIMAL(12,4)

## Cómo aplicar la migración

### Opción 1: Usando MySQL directamente

```bash
mysql -u tu_usuario -p hotel_screening < migrations/007_fix_returns_decimal_precision.sql
```

### Opción 2: En producción (Railway/otro hosting)

```bash
# Conectarse a la base de datos
mysql -u root -p -h [host] -P [puerto] hotel_screening

# Ejecutar los comandos ALTER TABLE manualmente
ALTER TABLE returns MODIFY COLUMN irr_unlevered DECIMAL(12,4) NULL;
ALTER TABLE returns MODIFY COLUMN moic_unlevered DECIMAL(12,4) NULL;
ALTER TABLE returns MODIFY COLUMN yield_on_cost_y1 DECIMAL(12,4) NULL;
ALTER TABLE returns MODIFY COLUMN irr_levered DECIMAL(12,4) NULL;
ALTER TABLE returns MODIFY COLUMN moic_levered DECIMAL(12,4) NULL;
```

## Verificación

Después de aplicar la migración, verifica que los tipos de datos se hayan actualizado:

```sql
DESCRIBE returns;
```

Deberías ver:

```
+------------------+--------------+------+-----+---------+-------+
| Field            | Type         | Null | Key | Default | Extra |
+------------------+--------------+------+-----+---------+-------+
| irr_unlevered    | decimal(12,4)| YES  |     | NULL    |       |
| moic_unlevered   | decimal(12,4)| YES  |     | NULL    |       |
| yield_on_cost_y1 | decimal(12,4)| YES  |     | NULL    |       |
| irr_levered      | decimal(12,4)| YES  |     | NULL    |       |
| moic_levered     | decimal(12,4)| YES  |     | NULL    |       |
+------------------+--------------+------+-----+---------+-------+
```

## Nota importante

**En proyectos sin financiación** (LTV = 0%, deuda = 0):
- Los retornos `levered` y `unlevered` **deben ser idénticos**
- Esto es correcto porque sin apalancamiento, ambos escenarios son el mismo
- Después de esta corrección, el cálculo funcionará correctamente

## Impacto

- ✅ Sin pérdida de datos (los valores existentes se mantienen)
- ✅ Compatible con versiones anteriores
- ✅ No afecta el rendimiento
- ✅ La migración es instantánea (tabla pequeña)
