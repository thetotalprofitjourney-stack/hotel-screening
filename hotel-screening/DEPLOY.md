# 🚀 Guía de Despliegue - Hotel Screening

Esta guía explica cómo desplegar el proyecto en el entorno de producción con Nginx y Docker.

## 📋 Arquitectura de Producción

```
Usuario → HTTPS (ma.thetotalprofitjourney.com)
           ↓
       Nginx (Plesk)
           ↓
    ┌──────┴──────┐
    ↓             ↓
Frontend       Backend
(estático)   (Docker:3001)
  /            /api/
```

- **Frontend**: Archivos estáticos servidos por Nginx en `/var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/`
- **Backend**: Contenedor Docker escuchando en `127.0.0.1:3001`
- **Proxy**: Nginx redirige `/api/*` → `http://127.0.0.1:3001/*`

---

## 🔧 Configuración de Nginx

En tu configuración de Nginx (Plesk), asegúrate de tener:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
}
```

---

## 📦 Despliegue del Frontend

### 1. Build del Frontend

```bash
cd hotel-screening/frontend

# Instalar dependencias (solo la primera vez o si cambió package.json)
npm install

# Generar build de producción
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos.

### 2. Subir al Servidor

Copia el contenido de `dist/` a tu servidor:

```bash
# Desde tu máquina local (ajusta la ruta según tu servidor)
scp -r dist/* usuario@servidor:/var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/
```

O desde el servidor directamente:

```bash
# En el servidor
cd /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com/
rm -rf * # ⚠️ CUIDADO: Esto borra todo
# Luego sube los archivos del build
```

### 3. Verificar

Accede a `https://ma.thetotalprofitjourney.com/` y verifica que el frontend carga correctamente.

---

## 🐳 Despliegue del Backend (Docker)

### 1. Build de la Imagen Docker

```bash
cd hotel-screening/backend

# Crear imagen
docker build -t hotel-backend:latest .
```

### 2. Configurar Variables de Entorno

Crea/edita el archivo `.env` en la carpeta `backend/`:

```env
# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_DATABASE=hotel_screening

# Puerto del backend (debe ser 3001)
PORT=3001
```

### 3. Ejecutar Contenedor

**⚠️ Detener contenedor anterior si existe:**

```bash
# Ver contenedores corriendo
docker ps

# Detener y eliminar contenedor anterior
docker stop hotel-backend
docker rm hotel-backend
```

**Iniciar nuevo contenedor:**

```bash
docker run -d \
  --name hotel-backend \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  --env-file /ruta/a/backend/.env \
  hotel-backend:latest
```

### 4. Verificar Backend

```bash
# Ver logs del contenedor
docker logs hotel-backend

# Verificar que está escuchando
curl http://127.0.0.1:3001/v1/projects
```

---

## ✅ Checklist de Verificación Post-Despliegue

- [ ] El frontend carga en `https://ma.thetotalprofitjourney.com/`
- [ ] No hay errores en la consola del navegador (F12)
- [ ] Las peticiones van a `/api/...` (no a localhost)
- [ ] El backend responde correctamente (sin errores CORS)
- [ ] Los datos se cargan correctamente desde la base de datos
- [ ] Los valores de ocupación se muestran como porcentajes (ej: 81.5%)
- [ ] Los cálculos de revenue son correctos

---

## 🛠️ Troubleshooting

### Error: "Failed to fetch" o "Network error"

**Causa**: El backend no está corriendo o Nginx no está redirigiendo correctamente.

**Solución**:
```bash
# 1. Verificar que el backend está corriendo
docker ps | grep hotel-backend

# 2. Ver logs del backend
docker logs hotel-backend

# 3. Verificar que Nginx está activo
systemctl status nginx

# 4. Probar la conexión directa al backend
curl http://127.0.0.1:3001/v1/projects
```

### Error: CORS

**Causa**: La configuración de Nginx no está correcta.

**Solución**: Asegúrate de que las peticiones van a `/api/` (mismo dominio) en lugar de un dominio diferente. Si usas el mismo dominio, no hay problemas de CORS.

### Error: "Cannot read property of undefined"

**Causa**: La base de datos no tiene datos o la conexión falló.

**Solución**:
```bash
# Verificar variables de entorno del backend
docker exec hotel-backend env | grep DB_

# Verificar conexión a MySQL
docker logs hotel-backend | grep -i "mysql\|database"
```

---

## 🔄 Actualización Rápida (Deploy Incremental)

Cuando hagas cambios menores:

### Solo Frontend:
```bash
cd frontend
npm run build
# Subir dist/* al servidor
```

### Solo Backend:
```bash
cd backend
docker build -t hotel-backend:latest .
docker stop hotel-backend
docker rm hotel-backend
docker run -d --name hotel-backend --restart unless-stopped -p 127.0.0.1:3001:3001 --env-file .env hotel-backend:latest
```

---

## 📝 Notas Importantes

1. **No commitees archivos .env**: Los archivos `.env` y `.env.local` están en `.gitignore` por seguridad.

2. **Valores por defecto**: El frontend usa `/api` por defecto (producción). Para desarrollo local, crea `.env.local` con `VITE_API_URL=http://localhost:3001`.

3. **Ocupación y porcentajes**: Los valores de ocupación se guardan como decimales (0-1) en la BD pero se muestran como porcentajes (0-100) en el UI. Los cálculos internos siempre usan decimales.

4. **Estados del proyecto**: Los estados ahora reflejan el último paso validado:
   - `draft` → `y1_commercial` → `y1_usali` → `projection_2n` → `finalized`

---

## 🆘 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs de Nginx: `/var/log/nginx/error.log`
2. Revisa los logs del backend: `docker logs hotel-backend`
3. Verifica la consola del navegador (F12 → Network)
4. Comprueba que el puerto 3001 no esté siendo usado por otro proceso: `lsof -i :3001`
