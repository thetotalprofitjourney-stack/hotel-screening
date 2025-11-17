# Guía de Instalación - Hotel Screening

Esta guía te ayudará a instalar el proyecto **Hotel Screening** en tu servidor propio paso a paso.

## Requisitos Previos

### Software Necesario

1. **Node.js** - Versión 18 o superior
   ```bash
   # Verificar instalación
   node --version
   npm --version
   ```

2. **MySQL** - Versión 8.0 o superior
   ```bash
   # Verificar instalación
   mysql --version
   ```

3. **Git** - Para clonar el repositorio
   ```bash
   git --version
   ```

---

## Paso 1: Preparar el Servidor

### 1.1 Actualizar el Sistema (Ubuntu/Debian)

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Instalar Node.js (si no está instalado)

```bash
# Instalar NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recargar el shell
source ~/.bashrc

# Instalar Node.js 18
nvm install 18
nvm use 18
```

### 1.3 Instalar MySQL (si no está instalado)

```bash
sudo apt install mysql-server -y

# Iniciar el servicio
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar seguridad (ejecutar y seguir las instrucciones)
sudo mysql_secure_installation
```

---

## Paso 2: Clonar el Repositorio

```bash
# Navegar al directorio donde quieres instalar el proyecto
cd /var/www

# Clonar el repositorio
git clone https://github.com/thetotalprofitjourney-stack/hotel-screening.git

# Entrar al directorio del proyecto
cd hotel-screening/hotel-screening
```

---

## Paso 3: Configurar MySQL y Crear las Bases de Datos

### 3.1 Acceder a MySQL

```bash
sudo mysql -u root -p
```

### 3.2 Crear Usuario de Base de Datos (opcional pero recomendado)

```sql
-- Crear un usuario específico para la aplicación
CREATE USER 'hotel_user'@'localhost' IDENTIFIED BY 'tu_password_seguro_aqui';

-- Otorgar todos los privilegios
GRANT ALL PRIVILEGES ON hotel_screening.* TO 'hotel_user'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Salir de MySQL
EXIT;
```

### 3.3 Crear la Base de Datos y Tablas

```bash
# Ejecutar el schema principal (crea la base de datos y todas las tablas)
mysql -u hotel_user -p < schema.sql
```

Este script creará:
- La base de datos `hotel_screening`
- Todas las tablas necesarias
- Los índices optimizados
- Datos iniciales para `category_catalog`

### 3.4 Poblar Catálogos de Tamaños y Ratios USALI

```bash
# Ejecutar el seed de datos
mysql -u hotel_user -p < seed_sizes_and_ratios.sql
```

Este script poblará:
- Catálogo de tamaños de hoteles (`tamano_buckets_catalog`)
- Matriz de ratios USALI (`usali_ratios_matrix`) - 72 perfiles diferentes

### 3.5 Aplicar Migraciones

```bash
# Aplicar la migración de campos faltantes
mysql -u hotel_user -p hotel_screening < migrations/001_fix_missing_fields.sql
```

---

## Paso 4: Estructura de la Base de Datos Benchmark

### 4.1 Tabla `occ_adr_benchmark_catalog`

La tabla de benchmark tiene la siguiente estructura:

```sql
CREATE TABLE occ_adr_benchmark_catalog (
  benchmark_id      VARCHAR(80) PRIMARY KEY,    -- ID único (ej: UPSCALE_PALMA_2024)
  categoria         VARCHAR(32) NOT NULL,       -- economy|midscale|upper_midscale|upscale|upper_upscale|luxury
  mercado           VARCHAR(120) NOT NULL,      -- Código del mercado (ej: PALMA_ES, MADRID_ES)
  anio_base         INT NOT NULL,               -- Año de los datos (ej: 2024)
  mes               TINYINT NOT NULL,           -- Mes (1-12)
  occ               DECIMAL(6,4) NOT NULL,      -- Ocupación (0.0000 a 1.0000, ej: 0.7250 = 72.50%)
  adr               DECIMAL(12,2) NOT NULL,     -- ADR en euros (ej: 125.50)
  fuente            VARCHAR(160) NULL,          -- Fuente de datos (ej: STR_2024Q1)
  last_updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
```

### 4.2 Descripción de Columnas

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `benchmark_id` | VARCHAR(80) | ID único generado automáticamente | `UPSCALE_PALMA_2024` |
| `categoria` | VARCHAR(32) | Categoría del hotel (debe existir en `category_catalog`) | `upscale` |
| `mercado` | VARCHAR(120) | Código normalizado del mercado/ciudad | `PALMA_ES` |
| `anio_base` | INT | Año de referencia de los datos | `2024` |
| `mes` | TINYINT | Mes (1=Enero, 12=Diciembre) | `6` |
| `occ` | DECIMAL(6,4) | Ocupación decimal (0-1) | `0.7250` (72.50%) |
| `adr` | DECIMAL(12,2) | Tarifa diaria promedio en euros | `125.50` |
| `fuente` | VARCHAR(160) | Fuente de los datos (opcional) | `STR_2024Q1` |
| `last_updated_at` | DATETIME(3) | Fecha de última actualización | `2024-01-15 10:30:00.000` |

### 4.3 Categorías Válidas

Las categorías válidas son (definidas en `category_catalog`):

- `economy` - Economy (2*)
- `midscale` - Midscale (3*)
- `upper_midscale` - Upper Midscale (3* superior)
- `upscale` - Upscale (4*)
- `upper_upscale` - Upper Upscale (4* superior)
- `luxury` - Luxury (5*)

### 4.4 Ejemplo de Datos de Benchmark

```sql
-- Ejemplo de inserción manual
INSERT INTO occ_adr_benchmark_catalog
(benchmark_id, categoria, mercado, anio_base, mes, occ, adr, fuente)
VALUES
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 1, 0.2200, 105.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 2, 0.2800, 110.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 3, 0.4500, 115.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 4, 0.6200, 130.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 5, 0.7500, 145.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 6, 0.8200, 165.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 7, 0.9100, 185.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 8, 0.9300, 195.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 9, 0.8100, 170.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 10, 0.6500, 140.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 11, 0.3800, 115.00, 'STR_2024Q1'),
('UPSCALE_PALMA_2024', 'upscale', 'PALMA_ES', 2024, 12, 0.2500, 100.00, 'STR_2024Q1');
```

### 4.5 Importar Datos desde CSV

Si tienes un archivo CSV con datos de benchmark, puedes importarlo así:

#### Formato del CSV

Crear un archivo `benchmark_data.csv`:

```csv
categoria,mercado,anio_base,mes,occ,adr,fuente
upscale,PALMA_ES,2024,1,0.22,105.00,STR_2024Q1
upscale,PALMA_ES,2024,2,0.28,110.00,STR_2024Q1
upscale,PALMA_ES,2024,3,0.45,115.00,STR_2024Q1
```

#### Importar el CSV

```sql
-- Opción 1: Usando LOAD DATA LOCAL INFILE (desde cliente)
mysql --local-infile=1 -u hotel_user -p

-- Dentro de MySQL:
SET GLOBAL local_infile=1;

LOAD DATA LOCAL INFILE '/ruta/a/benchmark_data.csv'
INTO TABLE occ_adr_benchmark_catalog
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(categoria, mercado, anio_base, mes, occ, adr, fuente)
SET benchmark_id = CONCAT(UPPER(REPLACE(categoria,'_','')), '_', mercado, '_', anio_base);
```

---

## Paso 5: Configurar el Backend

### 5.1 Navegar al directorio del backend

```bash
cd /var/www/hotel-screening/hotel-screening/backend
```

### 5.2 Instalar dependencias

```bash
npm install
```

### 5.3 Crear archivo de configuración

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env
```

### 5.4 Configurar las variables de entorno

Editar el archivo `.env`:

```env
# Server Configuration
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=hotel_user
DB_PASSWORD=tu_password_seguro_aqui
DB_NAME=hotel_screening

# CORS Configuration
CORS_ORIGIN=http://tu-dominio.com:5173
```

**IMPORTANTE**: Cambia:
- `DB_USER` - Usuario de MySQL que creaste
- `DB_PASSWORD` - Contraseña del usuario
- `CORS_ORIGIN` - Dominio de tu frontend (o `http://localhost:5173` para desarrollo)

### 5.5 Compilar el backend (para producción)

```bash
npm run build
```

---

## Paso 6: Configurar el Frontend

### 6.1 Navegar al directorio del frontend

```bash
cd /var/www/hotel-screening/hotel-screening/frontend
```

### 6.2 Instalar dependencias

```bash
npm install
```

### 6.3 Configurar la URL del backend

Editar el archivo de configuración del frontend (si existe) o crear una variable de entorno para la URL de la API.

### 6.4 Compilar el frontend (para producción)

```bash
npm run build
```

Esto generará los archivos estáticos en el directorio `dist/`.

---

## Paso 7: Ejecutar la Aplicación

### Modo Desarrollo

#### Backend

```bash
cd /var/www/hotel-screening/hotel-screening/backend
npm run dev
```

El backend estará corriendo en `http://localhost:3001`

#### Frontend

```bash
cd /var/www/hotel-screening/hotel-screening/frontend
npm run dev
```

El frontend estará corriendo en `http://localhost:5173`

### Modo Producción

Para ejecutar en producción, se recomienda usar un gestor de procesos como **PM2**.

#### Instalar PM2

```bash
sudo npm install -g pm2
```

#### Ejecutar el backend con PM2

```bash
cd /var/www/hotel-screening/hotel-screening/backend

# Iniciar el backend
pm2 start dist/server.js --name hotel-backend

# Guardar la configuración
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema
pm2 startup
```

#### Servir el frontend con Nginx

1. **Instalar Nginx**:

```bash
sudo apt install nginx -y
```

2. **Configurar Nginx**:

Crear un archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/hotel-screening
```

Contenido:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    root /var/www/hotel-screening/hotel-screening/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para el backend
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Activar el sitio**:

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/hotel-screening /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## Paso 8: Verificar la Instalación

### 8.1 Verificar la Base de Datos

```bash
mysql -u hotel_user -p -e "USE hotel_screening; SHOW TABLES;"
```

Deberías ver todas las tablas creadas.

### 8.2 Verificar el Backend

```bash
curl http://localhost:3001/health
```

Debería retornar un mensaje indicando que el servidor está funcionando.

### 8.3 Verificar el Frontend

Abre tu navegador y visita:
- Desarrollo: `http://localhost:5173`
- Producción: `http://tu-dominio.com`

---

## Paso 9: Configuración de Seguridad (Producción)

### 9.1 Configurar Firewall

```bash
# Permitir SSH
sudo ufw allow 22

# Permitir HTTP y HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Habilitar firewall
sudo ufw enable
```

### 9.2 Configurar SSL con Let's Encrypt (Opcional)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (ya configurado)
sudo certbot renew --dry-run
```

---

## Resumen de Comandos Rápidos

```bash
# 1. Clonar repositorio
git clone https://github.com/thetotalprofitjourney-stack/hotel-screening.git
cd hotel-screening/hotel-screening

# 2. Crear base de datos
mysql -u root -p < schema.sql
mysql -u root -p < seed_sizes_and_ratios.sql
mysql -u root -p hotel_screening < migrations/001_fix_missing_fields.sql

# 3. Backend
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run build

# 4. Frontend
cd ../frontend
npm install
npm run build

# 5. Iniciar con PM2
cd ../backend
pm2 start dist/server.js --name hotel-backend
pm2 save
```

---

## Solución de Problemas

### Error de Conexión a MySQL

- Verificar que MySQL esté corriendo: `sudo systemctl status mysql`
- Verificar credenciales en `.env`
- Verificar que el usuario tenga permisos: `SHOW GRANTS FOR 'hotel_user'@'localhost';`

### Error de Puertos en Uso

- Verificar qué proceso usa el puerto: `sudo lsof -i :3001`
- Cambiar el puerto en `.env` si es necesario

### Error de CORS

- Verificar que `CORS_ORIGIN` en `.env` coincida con la URL del frontend
- En desarrollo, usar `http://localhost:5173`

---

## Soporte

Para problemas o preguntas, revisar:
- El archivo `README.md` del proyecto
- Los logs del backend: `pm2 logs hotel-backend`
- Los logs de Nginx: `sudo tail -f /var/log/nginx/error.log`

---

**¡Instalación Completada!** Tu aplicación Hotel Screening debería estar funcionando correctamente.
