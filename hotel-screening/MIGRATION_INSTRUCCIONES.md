# Instrucciones para Aplicar Mejoras de Finalización por Operador

## Resumen de Cambios

Esta actualización añade la funcionalidad para que los proyectos puedan finalizarse de dos maneras:
1. **Operador**: Finaliza en el paso 3 con enfoque en USALI y FEES
2. **Inversión/Banco**: Finaliza en el paso 5 con análisis completo (valoración y retornos)

## Pasos para Aplicar los Cambios

### 1. Migración de Base de Datos

Ejecutar la migración para añadir el campo `project_type` a la tabla `projects`:

```bash
cd backend
npm run migrate 013_add_project_type.sql
```

Esta migración:
- Añade la columna `project_type` ENUM('operador', 'inversión') a la tabla `projects`
- Marca los proyectos finalizados existentes como tipo 'inversión' por defecto

### 2. Actualizar Vista SQL del Selector

Ejecutar el script SQL para actualizar la vista del selector:

```bash
# Opción 1: Desde MySQL CLI
mysql -u root -p hotel_screening < "MySQL_Vista de selección de oportunidades.sql"

# Opción 2: Desde el backend con migración manual
cd backend
npm run migrate "../MySQL_Vista de selección de oportunidades.sql"
```

Esta vista actualizada incluye:
- Campo `project_type`
- Campo `estado`
- Campo `created_at`
- Columnas `total_fees` y `fees_per_rn` (FEES totales y FEES por room night)

### 3. Verificar los Cambios

Después de aplicar las migraciones, verificar:

```sql
-- Verificar que el campo project_type existe
DESC projects;

-- Verificar que la vista incluye los nuevos campos
DESC vw_selector_projects;

-- Verificar proyectos finalizados
SELECT project_id, nombre, estado, project_type FROM projects WHERE estado = 'finalized';
```

## Nuevas Funcionalidades

### 1. Modal de Finalización (Paso 3)

Después de guardar el paso 3, aparece un modal con dos opciones:
- **"SEGUIR CON DATOS DE INVERSIÓN"**: Continúa al paso 4 (flujo normal)
- **"FINALIZAR PROYECTO PARA EL OPERADOR"**: Finaliza el proyecto como tipo "operador"

### 2. Descarga de Documento Word para Operador

Los proyectos finalizados como "operador" pueden descargar un documento Word enfocado en:
- Resumen ejecutivo
- Estructura de fees del operador
- Resultados operativos proyectados (USALI)
- Análisis de fees por habitación y room night
- Fees anuales proyectados
- Conclusiones

### 3. Filtros y Columnas en el Selector

El Selector ahora incluye:
- **Filtro por tipo de proyecto**: Operador / Inversión/Banco
- **Nueva columna "Tipo"**: Muestra el tipo de proyecto (Operador / Inversión)
- **Nuevas columnas FEES**: FEES (€) y FEES (€/rn)
- **Manejo de valores faltantes**: Los proyectos de operador muestran "—" en Price/Key, Cap Rate, Yield on Cost, DSCR e IRR

### 4. Listado de Proyectos Actualizado

El listado de proyectos ahora muestra:
- **Nueva columna "Tipo"**: Identifica si el proyecto es de operador o inversión
- **Estados visuales**: Badges de color para identificar rápidamente el estado y tipo
- **Descarga inteligente**: El botón de descarga genera el documento apropiado según el tipo

## Endpoints Nuevos en el Backend

### POST /v1/projects/:id/finalize-operador
Finaliza un proyecto como tipo "operador" cuando está en estado `projection_2n` (paso 3 completado).

**Respuesta:**
```json
{
  "success": true,
  "message": "Proyecto finalizado como operador exitosamente"
}
```

### GET /v1/projects/:id/operador-data
Obtiene los datos necesarios para generar el documento Word del operador.

**Respuesta:**
```json
{
  "project": { ... },
  "operator": { ... },
  "settings": { ... },
  "annuals": [ ... ],
  "totals": {
    "operating_revenue": 0,
    "gop": 0,
    "fees": 0,
    "ebitda": 0,
    "rn": 0
  }
}
```

## Archivos Modificados

### Backend
- `migrations/013_add_project_type.sql` (NUEVO)
- `backend/src/routes/projects.ts`
- `backend/src/routes/selector.ts`
- `MySQL_Vista de selección de oportunidades.sql`

### Frontend
- `frontend/src/pages/ProjectList.tsx`
- `frontend/src/pages/Wizard.tsx`
- `frontend/src/pages/Selector.tsx`
- `frontend/src/utils/generateOperadorWordDocument.ts` (NUEVO)

## Notas Importantes

1. **Proyectos Existentes**: Los proyectos finalizados antes de esta actualización serán marcados automáticamente como tipo 'inversión'.

2. **Compatibilidad**: Los proyectos en estados anteriores a `projection_2n` no se ven afectados por estos cambios.

3. **Selector**: Solo muestra proyectos con estado `finalized`, independientemente del tipo.

4. **FEES en Proyectos de Inversión**: Los proyectos de inversión/banco también muestran FEES si tienen operador externo configurado (gestión propia = 0).

5. **Validación**: El endpoint de finalización como operador valida que el proyecto esté en estado `projection_2n` antes de permitir la finalización.

## Solución de Problemas

### Error: "Missing required environment variable: DB_HOST"
Asegúrate de tener un archivo `.env` en el directorio `backend/` con la configuración de base de datos. Puedes copiar `.env.example` como plantilla.

### Error: "Proyecto debe estar en estado projection_2n"
Esto significa que el proyecto no ha completado el paso 3. Asegúrate de guardar la proyección antes de intentar finalizar como operador.

### No aparece el modal después de guardar el paso 3
Verifica que el proyecto NO esté ya en estado `finalized`. El modal solo aparece para proyectos que aún no han sido finalizados.

## Próximos Pasos

1. Aplicar las migraciones en el entorno de desarrollo
2. Probar el flujo completo:
   - Crear un nuevo proyecto
   - Completar hasta el paso 3
   - Probar ambas opciones del modal (operador e inversión)
   - Verificar la descarga de documentos Word
   - Comprobar el Selector con filtros
3. Aplicar las migraciones en el entorno de producción
4. Documentar el flujo de usuario final

---

**Fecha de creación**: 2025-12-18
**Versión**: 1.0
