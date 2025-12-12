# 🚀 PASO A PASO: Despliegue Completo

**Fecha**: 2025-12-12
**Base de datos**: MariaDB 11.4.9
**Branch**: `claude/add-project-selector-014vYU2HTF7qrsNfpCavnjph`

---

## ⚠️ ANTES DE EMPEZAR

✅ Asegúrate de que tienes:
- Acceso SSH al servidor
- Acceso a MariaDB
- Docker corriendo
- Scripts `install.sh` y `frontend_deploy.sh` en `/opt/m_a/`

---

## 📝 PASO 1: MIGRACIÓN DE BASE DE DATOS (⚠️ OBLIGATORIO PRIMERO)

**Desde tu servidor**, ejecuta:

```bash
# Opción A: Desde el archivo (después del git pull)
mysql -u tu_usuario -p hotel_screening < /opt/m_a/app/hotel-screening/migrations/002_update_project_states.sql

# Opción B: Directamente (ANTES del git pull)
mysql -u tu_usuario -p hotel_screening << 'EOF'
ALTER TABLE projects
MODIFY COLUMN estado ENUM(
    'draft',
    'y1_commercial',
    'y1_usali',
    'projection_2n',
    'finalized',
    'y1_validated',
    'projected',
    'exported'
) DEFAULT 'draft';
EOF
```

### Verificar la migración:

```bash
mysql -u tu_usuario -p -e "
USE hotel_screening;
SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hotel_screening'
  AND TABLE_NAME = 'projects'
  AND COLUMN_NAME = 'estado';
"
```

**Resultado esperado:**
```
ENUM('draft','y1_commercial','y1_usali','projection_2n','finalized','y1_validated','projected','exported')
```

✅ Si ves esto, la migración está correcta. **Continúa al siguiente paso.**

---

## 📥 PASO 2: GIT PULL

```bash
cd /opt/m_a/app

# Ver el estado actual
git status
git branch

# Hacer pull del branch con las mejoras
git fetch origin
git pull origin claude/add-project-selector-014vYU2HTF7qrsNfpCavnjph

# O si prefieres hacer merge a main (crear PR primero en GitHub)
```

### Verificar los cambios descargados:

```bash
# Ver los commits nuevos
git log --oneline -5

# Deberías ver:
# 1c8e88f Docs: Añadir guía específica...
# 0017c3e Feat: Añadir migración SQL...
# ef1411f Fix: Adaptar configuración...
# a963eef Fix: Configurar frontend...
# 1bc5a3d Feat: Implementar mejoras UI/UX...
```

✅ Si ves estos commits, el pull fue exitoso. **Continúa al siguiente paso.**

---

## 🐳 PASO 3: DESPLEGAR BACKEND

### 3.1 Verificar el .env del backend:

```bash
cat /opt/m_a/app/hotel-screening/backend/.env
```

**Debe contener:**
```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=hotel_screening
CORS_ORIGIN=*
```

⚠️ **IMPORTANTE**: Usa `DB_NAME` (no `DB_DATABASE`). El código ya lo usa correctamente.

### 3.2 Ejecutar el script de instalación:

```bash
cd /opt/m_a
./install.sh
```

**El script automáticamente:**
1. ✅ Actualiza el repositorio
2. ✅ Verifica que existe `backend/.env`
3. ✅ Construye la imagen Docker (con TypeScript → JavaScript)
4. ✅ Detiene el contenedor anterior
5. ✅ Arranca el nuevo contenedor

### 3.3 Verificar el backend:

```bash
# Ver logs del contenedor (buscar errores)
docker logs hotel-backend

# Deberías ver:
# [ENV] Configuration loaded: { PORT: 3001, DB_HOST: '...', ... }
# [DB] Connected to MySQL
# [SERVER] Backend listening on port 3001

# Verificar que está corriendo
docker ps | grep hotel-backend

# Probar endpoint
curl http://127.0.0.1:3001/v1/projects
# Debería devolver un JSON (puede estar vacío [])
```

✅ Si el backend responde, **continúa al siguiente paso.**

#### 🔴 Si hay errores:

```bash
# Ver logs completos
docker logs hotel-backend --tail 50

# Errores comunes:
# 1. "Missing required environment variable: DB_NAME"
#    → Verifica que el .env tiene DB_NAME (no DB_DATABASE)

# 2. "Error: connect ECONNREFUSED"
#    → Verifica las credenciales de MySQL en .env

# 3. "Cannot find module"
#    → El build de TypeScript falló. Ver logs del build:
docker logs hotel-backend | grep -A 5 "npm run build"
```

---

## 🎨 PASO 4: DESPLEGAR FRONTEND

```bash
cd /opt/m_a
./frontend_deploy.sh
```

**El script automáticamente:**
1. ✅ Ejecuta `npm install` en contenedor Node temporal
2. ✅ Ejecuta `npm run build` con `VITE_API_URL=/api`
3. ✅ Copia el build a `/var/www/vhosts/.../ma.thetotalprofitjourney.com/`

### Verificar el frontend:

```bash
# Ver archivos publicados
ls -la /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/

# Deberías ver:
# index.html
# assets/
# vite.svg (u otros assets)

# Ver fecha de actualización del index.html
stat /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/index.html
# Debería tener la fecha/hora actual
```

✅ Si los archivos están actualizados, **continúa al siguiente paso.**

---

## ✅ PASO 5: VERIFICACIÓN COMPLETA

### 5.1 Verificación en el Navegador

Abre en tu navegador:
```
https://ma.thetotalprofitjourney.com/
```

### 5.2 Consola del Navegador (F12)

**Abrir DevTools:**
- Chrome/Edge: `F12` o `Ctrl+Shift+I`
- Firefox: `F12` o `Ctrl+Shift+K`

**Ir a la pestaña "Network"** y recargar la página (`Ctrl+R`):

✅ **Verificar que NO hay errores:**
- ❌ Si ves: `ERR_INTERNET_DISCONNECTED` → El backend no está corriendo
- ❌ Si ves: `404 Not Found` → Nginx no está redirigiendo `/api/` correctamente
- ❌ Si ves: `CORS error` → Hay un problema de configuración (no debería pasar)

✅ **Verificar que las peticiones van a `/api/`:**
- Las peticiones deben aparecer como: `https://ma.thetotalprofitjourney.com/api/v1/projects`
- NO deben ir a `localhost`
- Status: `200 OK` (o `401`/`403` si hay problemas de autenticación)

### 5.3 Prueba del Flujo Completo

1. ✅ **Crear proyecto nuevo:**
   - Click en "Nuevo Proyecto"
   - Rellenar formulario (nombre, ubicación, habitaciones, etc.)
   - Guardar

2. ✅ **Paso 0 - Configuración:**
   - Verificar que los campos se guardan correctamente
   - Campos porcentuales se muestran como números enteros (ej: **65** para LTV, no 0.65)

3. ✅ **Paso 1 - Validación comercial Y1:**
   - Verificar que la **ocupación se muestra como porcentaje** (ej: **81.5**, no 0.815)
   - Los valores deben venir del benchmark (proyecto nuevo)
   - Editar un valor (ej: cambiar 81.5 a 85)
   - Click "Aceptar Y1 comercial"
   - **Estado del proyecto → `y1_commercial`**

4. ✅ **Cerrar y reabrir el proyecto:**
   - Volver a lista de proyectos
   - Abrir el mismo proyecto
   - **Los valores editados deben aparecer** (no volver al benchmark)
   - Ocupación sigue mostrándose como porcentaje

5. ✅ **Paso 2 - Cálculo USALI Y1:**
   - Click "Calcular USALI con ratios de mercado"
   - Cambiar a "Vista resumida"
   - Editar un valor (ej: cambiar Total Rev de un mes)
   - Click "Guardar USALI Y1"
   - **Verificar que NO se sobrescriben los cambios**
   - **Estado del proyecto → `y1_usali`**

6. ✅ **Paso 3 - Supuestos de Proyección:**
   - Verificar que los campos porcentuales se muestran como enteros:
     - ADR crecimiento: **5.0** (no 0.05)
     - Inflaciones: **2.0** (no 0.02)
     - Tope ocupación: **85.0** (no 0.85)
   - Probar insertar un **valor negativo** en inflación (debe funcionar)
   - Click "Proyectar 2..N"
   - **Estado del proyecto → `projection_2n`**

7. ✅ **Análisis completo:**
   - Click "Calcular deuda"
   - Click "Valorar & Retornos"
   - **Estado del proyecto → `finalized`**

8. ✅ **Navegación:**
   - Ir a página de "Selector"
   - Verificar que hay un **botón "← Volver"**
   - Click en el botón → debe volver a lista de proyectos

### 5.4 Verificación de Cálculos

**Ejemplo con ocupación al 81.5%:**

```
Ocupación en BD: 0.815
Ocupación en UI: 81.5 ✅

Cálculo de Roomnights:
- Habitaciones: 100
- Días (enero): 31
- Ocupación: 0.815 (decimal)
- Roomnights = 100 × 31 × 0.815 = 2,526.5 ≈ 2,527 ✅

Si ADR = 120€:
- Revenue = 2,527 × 120 = 303,240€ ✅
```

⚠️ **Si los cálculos están mal** (ej: Revenue = 30,324,000€), hay un bug de conversión.

---

## 🎉 RESULTADO ESPERADO

Si todo fue bien, deberías tener:

✅ Backend corriendo en Docker (puerto 3001)
✅ Frontend publicado en Nginx
✅ Peticiones van a `/api/` → redirigidas a `127.0.0.1:3001`
✅ Estados del proyecto correctos (y1_commercial, y1_usali, projection_2n, finalized)
✅ Ocupación se muestra como porcentaje (81.5)
✅ Cálculos de revenue correctos
✅ Ediciones se guardan y persisten
✅ Botón "Volver" en Selector funciona
✅ Valores negativos en inputs funcionan

---

## 🛠️ TROUBLESHOOTING

### Error: "Failed to fetch" en el navegador

**Causa**: El backend no está corriendo o Nginx no está redirigiendo.

**Solución**:
```bash
# 1. Verificar backend
docker ps | grep hotel-backend
docker logs hotel-backend

# 2. Verificar Nginx
systemctl status nginx

# 3. Verificar configuración Nginx en Plesk
# Debe tener:
# location /api/ {
#     proxy_pass http://127.0.0.1:3001/;
#     proxy_set_header Host $host;
#     proxy_set_header X-Forwarded-For $remote_addr;
#     proxy_set_header X-Forwarded-Proto https;
# }

# 4. Probar conexión directa al backend
curl http://127.0.0.1:3001/v1/projects
```

### Error: "Missing required environment variable: DB_NAME"

**Causa**: El archivo `.env` del backend no tiene la variable `DB_NAME`.

**Solución**:
```bash
# Editar .env
nano /opt/m_a/app/hotel-screening/backend/.env

# Asegurarse de que tiene:
DB_NAME=hotel_screening

# NO usar:
# DB_DATABASE=hotel_screening  ❌

# Reiniciar contenedor
docker restart hotel-backend
```

### Error: Los valores de ocupación siguen en decimal (0.815)

**Causa**: El código del frontend no se actualizó correctamente.

**Solución**:
```bash
# Verificar que el frontend tiene los cambios
cat /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/assets/index-*.js | grep -o "normalizeOcc"

# Si no encuentra nada, reconstruir frontend:
cd /opt/m_a
./frontend_deploy.sh

# Limpiar caché del navegador:
# Ctrl + Shift + R (Chrome/Firefox)
# O abrir en modo incógnito
```

### Error: Los cálculos de revenue están mal

**Causa**: El código no está normalizando correctamente la ocupación.

**Solución**:
```bash
# Ver logs del navegador (F12 → Console)
# Buscar warnings o errores

# Verificar que el frontend tiene la función normalizeOcc:
cat /opt/m_a/app/hotel-screening/frontend/src/components/MonthlyTable.tsx | grep -A 5 "normalizeOcc"

# Debería mostrar:
# const normalizeOcc = (occ: number): number => {
#   if (typeof occ !== 'number' || isNaN(occ)) return 0;
#   return occ > 1 ? occ / 100 : occ;
# };
```

---

## 📞 CONTACTO / SOPORTE

Si encuentras problemas que no puedes resolver:

1. **Ver logs del backend**:
   ```bash
   docker logs hotel-backend --tail 100
   ```

2. **Ver logs de Nginx**:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

3. **Ver consola del navegador**:
   - F12 → Console
   - F12 → Network

4. **Verificar estado de la BD**:
   ```bash
   mysql -u tu_usuario -p -e "
   USE hotel_screening;
   SELECT project_id, nombre, estado FROM projects;
   "
   ```

---

## ✅ CHECKLIST FINAL

Marca cada item cuando esté completado:

- [ ] Migración SQL ejecutada (estados actualizados)
- [ ] Git pull realizado (commit 1c8e88f visible)
- [ ] Backend desplegado (`docker ps` muestra `hotel-backend`)
- [ ] Backend responde (`curl http://127.0.0.1:3001/v1/projects`)
- [ ] Frontend publicado (archivos en `/var/www/vhosts/...`)
- [ ] Frontend carga en navegador (`https://ma.thetotalprofitjourney.com/`)
- [ ] Consola sin errores (F12 → Console)
- [ ] Peticiones van a `/api/` (F12 → Network)
- [ ] Ocupación se muestra como porcentaje (81.5)
- [ ] Cálculos de revenue correctos
- [ ] Ediciones se guardan correctamente
- [ ] Botón "Volver" en Selector funciona
- [ ] Estados del proyecto correctos

---

¡Listo! Si todos los items están marcados, el despliegue fue exitoso. 🎉
