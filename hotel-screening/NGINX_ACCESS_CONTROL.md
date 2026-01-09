# 🔒 Control de Acceso Directo con Nginx

Esta guía explica cómo configurar nginx para controlar si los usuarios pueden acceder directamente a `https://ma.thetotalprofitjourney.com` o solo desde el embed de Kajabi.

## 🎯 Objetivo

- **Siempre permitir**: Acceso embebido desde Kajabi
- **Controlable**: Acceso directo a la web mediante variable de entorno

## 🔧 Configuración de Nginx

### Opción 1: Configuración con Variable de Entorno (Recomendada)

Esta solución usa una variable de entorno que se lee al iniciar nginx.

#### 1. Crear archivo de configuración

En tu servidor, crea o edita la configuración de nginx para el sitio:

```nginx
# /etc/nginx/conf.d/ma.thetotalprofitjourney.com.conf
# O en Plesk: Configuración adicional de nginx

# Definir la variable desde el entorno del sistema
# Esta variable se define antes de iniciar nginx
env ALLOW_DIRECT_ACCESS;

# Mapeo de la variable de entorno a una variable nginx
map $ALLOW_DIRECT_ACCESS $allow_direct {
    default "false";
    "true"  "true";
    "false" "false";
}

server {
    listen 443 ssl http2;
    server_name ma.thetotalprofitjourney.com;

    # Certificados SSL (ya configurados en Plesk)
    # ...

    # Root del frontend
    root /var/www/vhosts/thetotalprofitjourney.com/ma.thetotalprofitjourney.com;
    index index.html;

    # === CONTROL DE ACCESO ===

    # Variable para rastrear si el acceso está permitido
    set $access_allowed 0;

    # Dominios de Kajabi permitidos
    # Referer puede venir de:
    # - https://www.totalprofitjourney.com
    # - https://totalprofitjourney.mykajabi.com
    # - Cualquier subdirectorio de estos dominios

    if ($http_referer ~* "^https://(www\.)?totalprofitjourney\.(com|mykajabi\.com)") {
        set $access_allowed 1;
    }

    # Si se permite acceso directo, siempre permitir
    if ($allow_direct = "true") {
        set $access_allowed 1;
    }

    # Permitir siempre archivos estáticos embebidos (embed.js, iframe-height.js)
    # Estos archivos DEBEN ser accesibles para que el embed funcione
    location ~* ^/(embed\.js|iframe-height\.js)$ {
        add_header Cache-Control "public, max-age=3600";
        try_files $uri =404;
    }

    # Permitir siempre el API (el backend tiene su propia autenticación)
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;

        # Headers para el embed
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
    }

    # Control de acceso para el resto de la aplicación
    location / {
        # Si NO está permitido, retornar 403
        if ($access_allowed = 0) {
            return 403 "Acceso directo no permitido. Por favor accede desde la plataforma autorizada.";
        }

        # Si está permitido, servir la aplicación
        try_files $uri $uri/ /index.html;
    }

    # Headers de seguridad para permitir embedding
    add_header X-Frame-Options "ALLOW-FROM https://www.totalprofitjourney.com" always;
    add_header X-Frame-Options "ALLOW-FROM https://totalprofitjourney.mykajabi.com" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://www.totalprofitjourney.com https://totalprofitjourney.mykajabi.com" always;
}
```

#### 2. Configurar la variable de entorno

**Opción A: En systemd (Ubuntu/Debian moderno)**

Edita el archivo de servicio de nginx:

```bash
sudo systemctl edit nginx
```

Añade:

```ini
[Service]
Environment="ALLOW_DIRECT_ACCESS=false"
```

**Opción B: En /etc/default/nginx**

```bash
sudo nano /etc/default/nginx
```

Añade:

```bash
ALLOW_DIRECT_ACCESS=false
```

**Opción C: En /etc/environment (global)**

```bash
sudo nano /etc/environment
```

Añade:

```bash
ALLOW_DIRECT_ACCESS=false
```

#### 3. Recargar nginx

```bash
sudo nginx -t  # Verificar configuración
sudo systemctl restart nginx
```

---

### Opción 2: Configuración Simple con Archivo de Flag

Si no puedes usar variables de entorno con nginx, usa un archivo de flag:

```nginx
# /etc/nginx/conf.d/ma.thetotalprofitjourney.com.conf

geo $allow_direct {
    default 0;
    # Este archivo se crea/elimina para controlar el acceso
    # Si existe: permite acceso directo
    # Si NO existe: solo permite desde Kajabi
    include /etc/nginx/allow_direct_access.conf;
}

server {
    # ... resto de la configuración igual que arriba
}
```

**Crear archivo para PERMITIR acceso directo:**

```bash
# En /etc/nginx/allow_direct_access.conf
echo "default 1;" | sudo tee /etc/nginx/allow_direct_access.conf
sudo nginx -s reload
```

**Eliminar archivo para BLOQUEAR acceso directo:**

```bash
sudo rm /etc/nginx/allow_direct_access.conf
sudo nginx -s reload
```

---

## 📋 Configuración en Plesk

Si usas Plesk, la configuración es más sencilla:

1. Ve a **Sitios Web y Dominios**
2. Selecciona **ma.thetotalprofitjourney.com**
3. Haz clic en **Configuración de Apache y nginx**
4. En la sección **Directivas adicionales de nginx**, pega la configuración de arriba (solo el contenido dentro del bloque `location`)

---

## 🧪 Pruebas

### Probar con acceso BLOQUEADO (ALLOW_DIRECT_ACCESS=false)

```bash
# Acceso directo → debe retornar 403
curl -I https://ma.thetotalprofitjourney.com/

# Acceso desde Kajabi → debe retornar 200
curl -I -H "Referer: https://www.totalprofitjourney.com/page" https://ma.thetotalprofitjourney.com/

# Archivos embed siempre accesibles → debe retornar 200
curl -I https://ma.thetotalprofitjourney.com/embed.js

# API siempre accesible → debe retornar 200 o 401 (según autenticación)
curl -I https://ma.thetotalprofitjourney.com/api/v1/projects
```

### Probar con acceso PERMITIDO (ALLOW_DIRECT_ACCESS=true)

```bash
# Todos los accesos deben retornar 200
curl -I https://ma.thetotalprofitjourney.com/
curl -I -H "Referer: https://www.totalprofitjourney.com/page" https://ma.thetotalprofitjourney.com/
```

---

## 🔄 Cambiar el Estado del Acceso

### Bloquear acceso directo

```bash
# Opción systemd
sudo systemctl edit nginx
# Cambiar a: Environment="ALLOW_DIRECT_ACCESS=false"
sudo systemctl restart nginx

# Opción /etc/default/nginx
sudo sed -i 's/ALLOW_DIRECT_ACCESS=.*/ALLOW_DIRECT_ACCESS=false/' /etc/default/nginx
sudo systemctl restart nginx
```

### Permitir acceso directo

```bash
# Opción systemd
sudo systemctl edit nginx
# Cambiar a: Environment="ALLOW_DIRECT_ACCESS=true"
sudo systemctl restart nginx

# Opción /etc/default/nginx
sudo sed -i 's/ALLOW_DIRECT_ACCESS=.*/ALLOW_DIRECT_ACCESS=true/' /etc/default/nginx
sudo systemctl restart nginx
```

---

## ⚠️ Consideraciones Importantes

### 1. El Header Referer NO es 100% confiable

- Algunos navegadores/extensiones bloquean el Referer
- Usuarios con privacidad estricta pueden tener Referer vacío
- **Impacto**: Algunos usuarios legítimos desde Kajabi podrían ser bloqueados

**Solución**: Si detectas problemas, considera combinar con:
- Parámetro URL secreto: `?access_token=XXX`
- Cookie de sesión establecida por Kajabi
- IP whitelisting (si Kajabi tiene IPs fijas)

### 2. Los archivos embed.js e iframe-height.js SIEMPRE deben ser accesibles

La configuración arriba los permite siempre, ya que Kajabi los necesita para cargar el iframe.

### 3. El API siempre es accesible

El backend ya tiene su propia autenticación (middleware authEmail), por lo que nginx no bloquea el API.

### 4. Caché y CDN

Si usas Cloudflare u otro CDN, asegúrate de que:
- Los headers `Referer` se pasen correctamente
- La configuración de caché no interfiera con las reglas de acceso

---

## 🎯 Flujo de Acceso

### Escenario 1: Usuario accede directamente (ALLOW_DIRECT_ACCESS=false)

```
Usuario → https://ma.thetotalprofitjourney.com
         ↓
      Nginx verifica:
      - Referer: (vacío o mismo dominio)
      - allow_direct: false
      - access_allowed: 0
         ↓
      → 403 Forbidden
```

### Escenario 2: Usuario accede desde Kajabi (ALLOW_DIRECT_ACCESS=false)

```
Usuario → Kajabi (www.totalprofitjourney.com)
         ↓
      <iframe src="https://ma.thetotalprofitjourney.com">
         ↓
      Nginx verifica:
      - Referer: https://www.totalprofitjourney.com/...
      - Coincide con patrón de Kajabi
      - access_allowed: 1
         ↓
      → 200 OK (sirve la aplicación)
```

### Escenario 3: Usuario accede directamente (ALLOW_DIRECT_ACCESS=true)

```
Usuario → https://ma.thetotalprofitjourney.com
         ↓
      Nginx verifica:
      - allow_direct: true
      - access_allowed: 1
         ↓
      → 200 OK (sirve la aplicación)
```

---

## 📚 Referencias

- [Nginx ngx_http_referer_module](http://nginx.org/en/docs/http/ngx_http_referer_module.html)
- [Nginx valid_referers directive](http://nginx.org/en/docs/http/ngx_http_referer_module.html#valid_referers)
- [Nginx if directive](http://nginx.org/en/docs/http/ngx_http_rewrite_module.html#if)

---

## 🆘 Troubleshooting

### Error: "403 Forbidden" desde Kajabi

**Causa**: El Referer no se está enviando correctamente o no coincide con el patrón.

**Solución**:
```bash
# Ver logs de nginx para inspeccionar el Referer
sudo tail -f /var/log/nginx/access.log | grep ma.thetotalprofitjourney.com

# Verificar el Referer exacto y ajustar el regex en nginx
```

### Error: Variable de entorno no se lee

**Causa**: Nginx no está cargando las variables de entorno del sistema.

**Solución**:
- Usa la Opción 2 (archivo de flag) en lugar de variables de entorno
- O configura nginx para cargar el archivo de entorno

### Error: Acceso directo sigue funcionando cuando debería estar bloqueado

**Causa**: La configuración nginx no se aplicó correctamente.

**Solución**:
```bash
# Verificar sintaxis
sudo nginx -t

# Recargar configuración
sudo systemctl reload nginx

# Si no funciona, reiniciar nginx
sudo systemctl restart nginx

# Verificar que la variable está configurada
sudo systemctl show nginx | grep Environment
```

---

## ✅ Resumen

Con esta configuración puedes:

1. **Controlar el acceso directo** mediante la variable `ALLOW_DIRECT_ACCESS`
2. **Siempre permitir** el acceso desde Kajabi (dominios whitelisted)
3. **Siempre permitir** los archivos necesarios para el embed (embed.js, iframe-height.js)
4. **Siempre permitir** el API (que tiene su propia autenticación)

**Cambiar de modo es tan simple como**:
```bash
# Bloquear acceso directo
ALLOW_DIRECT_ACCESS=false → reiniciar nginx

# Permitir acceso directo
ALLOW_DIRECT_ACCESS=true → reiniciar nginx
```
