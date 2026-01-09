# Embedding Hotel Screening en Kajabi

Este documento explica cómo incrustar la aplicación Hotel Screening (https://ma.thetotalprofitjourney.com) dentro de Kajabi usando iframes.

## Archivos necesarios

La implementación consta de dos archivos JavaScript:

### 1. `embed.js` (Para Kajabi)
**Ubicación:** `/hotel-screening/frontend/public/embed.js`
**URL pública:** `https://ma.thetotalprofitjourney.com/embed.js`

Este script se incluye en Kajabi y crea los iframes que cargan la aplicación.

### 2. `iframe-height.js` (Para la aplicación)
**Ubicación:** `/hotel-screening/frontend/public/iframe-height.js`
**Incluido en:** `index.html` de la aplicación

Este script se ejecuta dentro del iframe y comunica la altura del contenido al padre mediante `postMessage`.

## Configuración en Kajabi

### Paso 1: Incluir el script de embed

En el código personalizado de tu página de Kajabi, añade el siguiente script en el `<head>` o al final del `<body>`:

```html
<script src="https://ma.thetotalprofitjourney.com/embed.js"></script>
```

### Paso 2: Definir información del usuario (opcional pero recomendado)

Antes de cargar el script de embed, puedes definir una variable global `MA` con la información del usuario de Kajabi:

```html
<script>
  var MA = {
    user: {
      email: '{{member_email}}',           // Variable de Kajabi para el email del usuario
      kajabiUserId: '{{member_id}}'        // Variable de Kajabi para el ID del usuario
    }
  };
</script>
<script src="https://ma.thetotalprofitjourney.com/embed.js"></script>
```

**Nota:** Reemplaza `{{member_email}}` y `{{member_id}}` con las variables Liquid correctas de Kajabi.

### Paso 3: Crear el contenedor del iframe

Añade un `<div>` con la clase `ma-hotel-screening` donde quieres que aparezca la aplicación:

```html
<div class="ma-hotel-screening"></div>
```

### Ejemplo completo

```html
<!-- Definir información del usuario -->
<script>
  var MA = {
    user: {
      email: '{{member_email}}',
      kajabiUserId: '{{member_id}}'
    }
  };
</script>

<!-- Cargar el script de embed -->
<script src="https://ma.thetotalprofitjourney.com/embed.js"></script>

<!-- Contenedor donde se incrustará la aplicación -->
<div class="ma-hotel-screening"></div>
```

## Cómo funciona

1. **Creación del iframe:** El script `embed.js` busca todos los elementos con la clase `ma-hotel-screening` y crea un iframe dentro de cada uno.

2. **Autenticación automática:** Si se proporciona la información del usuario a través de la variable `MA`, el embed pasará el email y el ID de usuario como parámetros en la URL del iframe. La aplicación leerá estos parámetros y autenticará al usuario automáticamente sin mostrar el popup de login.

3. **Ajuste dinámico de altura:** El iframe ajusta automáticamente su altura según el contenido de la aplicación:
   - `iframe-height.js` (dentro del iframe) detecta cambios en la altura del contenido
   - Envía mensajes `postMessage` al padre con la nueva altura
   - `embed.js` (en Kajabi) escucha estos mensajes y ajusta la altura del contenedor

4. **Sin scroll interno:** El iframe está configurado para no tener scroll interno. Todo el scroll se maneja a nivel de la página de Kajabi, proporcionando una experiencia fluida.

## Configuración de producción

### Headers HTTP necesarios

Para que la aplicación pueda ser incrustada en un iframe, el servidor web debe enviar los siguientes headers:

```
Content-Security-Policy: frame-ancestors *
```

**Desarrollo:** Estos headers ya están configurados en `vite.config.ts` para el servidor de desarrollo.

**Producción:** Debes configurar estos headers en tu servidor web (Nginx, Apache, etc.)

#### Ejemplo Nginx

```nginx
server {
    listen 443 ssl;
    server_name ma.thetotalprofitjourney.com;

    # Permitir iframe embedding
    add_header Content-Security-Policy "frame-ancestors *" always;

    # ... resto de la configuración
}
```

#### Ejemplo Apache

```apache
<VirtualHost *:443>
    ServerName ma.thetotalprofitjourney.com

    # Permitir iframe embedding
    Header always set Content-Security-Policy "frame-ancestors *"

    # ... resto de la configuración
</VirtualHost>
```

## Seguridad

### Restricción de dominios (opcional)

Si quieres restringir desde qué dominios se puede incrustar tu aplicación, modifica los siguientes archivos:

**1. `embed.js` (línea ~52):**
```javascript
if (event.origin !== 'https://ma.thetotalprofitjourney.com') {
    return;
}
```

**2. Header CSP en tu servidor web:**
```
Content-Security-Policy: frame-ancestors https://tu-sitio-kajabi.com
```

### Autenticación

La aplicación utiliza el email del usuario para autenticación. Cuando se pasa el email a través del iframe:

1. La aplicación envía una petición a `/v1/auth/init` con los headers:
   - `x-user-email`: Email del usuario
   - `x-kajabi-user-id`: ID del usuario en Kajabi (opcional)

2. El middleware `requireEmail` en el backend:
   - Crea el usuario automáticamente si no existe
   - Actualiza el `kajabi_user_id` si se proporciona
   - Asocia todas las peticiones subsiguientes con ese usuario

## Troubleshooting

### El iframe no se muestra

1. Verifica que el script `embed.js` se está cargando correctamente
2. Abre la consola del navegador y busca errores
3. Verifica que existe al menos un elemento con la clase `ma-hotel-screening`

### El iframe no ajusta su altura

1. Verifica que `iframe-height.js` está cargado en la aplicación
2. Abre la consola y verifica que no hay errores de CORS
3. Verifica que el origen del mensaje (`event.origin`) en `embed.js` coincide con tu dominio

### El usuario no se autentica automáticamente

1. Verifica que la variable `MA` está definida antes de cargar `embed.js`
2. Verifica que `MA.user.email` contiene un email válido
3. Abre las DevTools → Network y verifica que la petición a `/v1/auth/init` se está haciendo correctamente

### Errores de CORS

Si ves errores de CORS en la consola:

1. Verifica que el backend tiene CORS configurado correctamente en `server.ts`
2. Verifica que la variable de entorno `CORS_ORIGIN` está configurada apropiadamente
3. En desarrollo, puedes usar `CORS_ORIGIN=*` para permitir todos los orígenes

## Múltiples iframes en la misma página

Puedes tener múltiples instancias de la aplicación en la misma página de Kajabi:

```html
<script>
  var MA = {
    user: {
      email: '{{member_email}}',
      kajabiUserId: '{{member_id}}'
    }
  };
</script>
<script src="https://ma.thetotalprofitjourney.com/embed.js"></script>

<!-- Primer iframe -->
<div class="ma-hotel-screening"></div>

<!-- Segundo iframe -->
<div class="ma-hotel-screening"></div>
```

Cada div con la clase `ma-hotel-screening` se convertirá en un iframe independiente.

## Personalización

### Cambiar la clase del contenedor

Si quieres usar una clase diferente a `ma-hotel-screening`, edita la última línea de `embed.js`:

```javascript
// Cambiar '.ma-hotel-screening' por tu clase personalizada
insertIframes('.mi-clase-personalizada', url);
```

### Añadir parámetros adicionales a la URL

Si necesitas pasar parámetros adicionales al iframe, edita la sección de construcción de URL en `embed.js`:

```javascript
if (typeof MA !== 'undefined' && MA.user) {
    const params = new URLSearchParams();

    if (MA.user.email) {
        params.append('email', MA.user.email);
    }

    if (MA.user.kajabiUserId) {
        params.append('userid', MA.user.kajabiUserId);
    }

    // Añadir parámetros personalizados
    if (MA.customParam) {
        params.append('custom', MA.customParam);
    }

    if (params.toString()) {
        url += '?' + params.toString();
    }
}
```

## Soporte

Para problemas o preguntas sobre la implementación del embedding, contacta con el equipo de desarrollo.
