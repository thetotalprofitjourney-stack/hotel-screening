# 🚀 Guía de Despliegue con Scripts de Automatización

Esta guía es específica para tu entorno de producción usando los scripts `install.sh` y `frontend_deploy.sh`.

---

## 📋 **Pre-requisitos**

✅ Git instalado
✅ Docker instalado
✅ Node 18+ disponible (para build del frontend)
✅ Acceso a `/opt/m_a/` en el servidor
✅ Dockerfile en `/opt/m_a/deploy/Dockerfile`

---

## 🗄️ **PASO 1: Ejecutar Migración SQL** (⚠️ OBLIGATORIO)

**ANTES** de hacer pull y desplegar, ejecuta la nueva migración en MySQL:

```bash
mysql -u tu_usuario -p hotel_screening < /opt/m_a/app/hotel-screening/migrations/002_update_project_states.sql
```

Esta migración añade los nuevos estados del proyecto:
- `y1_commercial` (Paso 1 completado)
- `y1_usali` (Paso 2 completado)
- `projection_2n` (Paso 3 completado)
- `finalized` (Análisis completo)

### Verificar la migración:

```sql
USE hotel_screening;

-- Verificar que los nuevos estados existen
SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hotel_screening'
  AND TABLE_NAME = 'projects'
  AND COLUMN_NAME = 'estado';

-- Debería mostrar:
-- ENUM('draft','y1_commercial','y1_usali','projection_2n','finalized','y1_validated','projected','exported')
```

---

## 🔄 **PASO 2: Hacer Pull de los Cambios**

Tu script `install.sh` ya hace esto automáticamente, pero si quieres hacerlo manualmente:

```bash
cd /opt/m_a/app
git pull origin claude/add-project-selector-014vYU2HTF7qrsNfpCavnjph
```

O si quieres hacer merge a main primero, crea un PR en GitHub y luego:

```bash
git checkout main
git pull origin main
```

---

## 🐳 **PASO 3: Desplegar Backend**

Ejecuta tu script de instalación:

```bash
cd /opt/m_a
./install.sh
```

Este script automáticamente:
1. ✅ Actualiza el repositorio (git pull)
2. ✅ Verifica que existe `backend/.env`
3. ✅ Construye la imagen Docker
4. ✅ Detiene el contenedor anterior
5. ✅ Arranca el nuevo contenedor

### Verificar Backend:

```bash
# Ver logs del contenedor
docker logs hotel-backend

# Verificar que está corriendo
docker ps | grep hotel-backend

# Probar endpoint
curl http://127.0.0.1:3001/v1/projects
```

---

## 🎨 **PASO 4: Desplegar Frontend**

Ejecuta tu script de build:

```bash
cd /opt/m_a
./frontend_deploy.sh
```

Este script automáticamente:
1. ✅ Hace npm install en un contenedor Node temporal
2. ✅ Ejecuta el build con `VITE_API_URL="/api"`
3. ✅ Hace rsync del build a `/var/www/vhosts/.../ma.thetotalprofitjourney.com/`

### Verificar Frontend:

```bash
# Verificar archivos publicados
ls -la /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/

# Debería mostrar:
# - index.html
# - assets/
# - favicon.ico (si existe)
```

---

## ✅ **PASO 5: Verificación Post-Despliegue**

### 1. Abrir en el navegador:
```
https://ma.thetotalprofitjourney.com/
```

### 2. Abrir consola del navegador (F12) y verificar:
- ✅ No hay errores en la consola
- ✅ Las peticiones van a `/api/...` (no localhost)
- ✅ El backend responde correctamente

### 3. Probar flujo completo:
1. ✅ Crear un proyecto nuevo
2. ✅ Entrar al Wizard (Paso 0)
3. ✅ Ver que la ocupación se muestra como porcentaje (ej: **81.5%**)
4. ✅ Aceptar Y1 comercial (Paso 1) → Estado: `y1_commercial`
5. ✅ Calcular USALI Y1 (Paso 2)
6. ✅ Editar valores en vista resumida
7. ✅ Guardar USALI Y1 → Estado: `y1_usali`
8. ✅ Proyectar años 2-N → Estado: `projection_2n`
9. ✅ Ejecutar análisis completo → Estado: `finalized`
10. ✅ Cerrar y reabrir el proyecto → Debe mostrar los datos guardados (no benchmark)

### 4. Verificar navegación:
- ✅ En página de Selector, hay botón "← Volver"
- ✅ Los inputs porcentuales se pueden editar como números enteros
- ✅ Se pueden insertar valores negativos en campos de inflación

---

## 🔧 **Dockerfile Recomendado**

Si `/opt/m_a/deploy/Dockerfile` no existe o necesita actualización, usa este:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY backend/package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código fuente
COPY backend/ ./

# Exponer puerto
EXPOSE 3001

# Variable de entorno por defecto (se sobrescribe con --env-file)
ENV PORT=3001

# Comando de inicio
CMD ["node", "src/index.js"]
```

### Notas sobre el Dockerfile:
- El backend usa **ES Modules** (`type: "module"` en package.json)
- Arranca con `node src/index.js` (no TypeScript compilado)
- El puerto 3001 se configura en `.env`
- Las variables de BD se pasan con `--env-file`

---

## 🛠️ **Troubleshooting**

### Error: "Cannot find module"
```bash
# Reconstruir la imagen sin caché
docker build --no-cache -f /opt/m_a/deploy/Dockerfile -t hotel-backend:latest /opt/m_a/app/hotel-screening/
```

### Error: "Error connecting to database"
```bash
# Verificar variables de entorno del contenedor
docker exec hotel-backend env | grep DB_

# Ver logs completos
docker logs hotel-backend --tail 100
```

### Error: "Port 3001 already in use"
```bash
# Ver qué está usando el puerto
lsof -i :3001

# Detener contenedor anterior
docker stop hotel-backend
docker rm hotel-backend
```

### Frontend no muestra cambios:
```bash
# Limpiar caché del navegador (Ctrl+Shift+R)
# O verificar que los archivos se copiaron correctamente
ls -la /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/

# Verificar fecha de modificación del index.html
stat /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/index.html
```

---

## 📊 **Resumen de Cambios Desplegados**

### ✅ Mejoras UI/UX:
1. Botón "Volver" en página de Selector
2. Sistema de estados corregido (refleja último paso validado)
3. Paso 1 muestra datos guardados (no siempre benchmark)
4. Paso 2 guarda correctamente las ediciones
5. Inputs porcentuales como números enteros (81 en lugar de 0.81)
6. Soporte para valores negativos en inputs

### ✅ Cambios Técnicos:
- Frontend usa `/api` por defecto (compatible con Nginx)
- Backend actualiza estados correctamente en cada paso
- Nuevos endpoints para cargar datos guardados
- Normalización automática de valores de ocupación
- Migración SQL para nuevos estados

---

## 📞 **Contacto**

Si encuentras algún problema durante el despliegue:
1. Revisa los logs del backend: `docker logs hotel-backend`
2. Revisa los logs de Nginx: `/var/log/nginx/error.log`
3. Verifica la consola del navegador (F12)
4. Comprueba la configuración de Nginx en Plesk

---

## 🎉 **¡Listo!**

Tu aplicación debería estar funcionando correctamente con todas las mejoras implementadas.
