# Gestión de Taller OT

PWA de gestión de órdenes de trabajo (OT) para talleres mecánicos. Sin backend propio: usa Supabase para autenticación, base de datos y almacenamiento de fotos.

## Características

- 🛠️ Alta, consulta y finalización de órdenes de trabajo
- 📷 Fotografías del trabajo con compresión automática y galería
- 📱 Vista pública para clientes (`?id=<orden>` en la URL) con link por WhatsApp
- 🖨️ Impresión de órdenes (borrador y definitiva)
- 💾 Backup / restauración de datos en JSON
- 🔍 Búsqueda y paginación
- 📴 Instalable como PWA (manifest + service worker)

## Stack

- **Frontend**: HTML + Tailwind CSS (CDN) + JavaScript vanilla con ES modules nativos (sin build).
- **Backend**: [Supabase](https://supabase.com/) — Auth, tabla `work_orders` y bucket `photos`.
- **PWA**: `manifest.json` + `sw.js`.

## Estructura

```
index.html          → markup de la aplicación (único punto de entrada)
css/styles.css      → estilos propios
js/
  main.js           → entry point: importa e inicializa todos los módulos
  config.js         → credenciales de Supabase
  supabase.js       → cliente Supabase
  dom.js            → selectores DOM y helpers (escapeHtml, normalizeFotos, formatFecha)
  state.js          → estado global
  notify.js         → sistema de notificaciones
  auth.js           → login / registro / logout
  orders.js         → CRUD de órdenes, tabla, búsqueda, paginación
  photos.js         → compresión, subida y borrado de fotos
  share.js          → WhatsApp y lightbox
  publicView.js     → vista pública del cliente
  print.js          → impresión de órdenes
  backup.js         → backup / restore con validación de schema
manifest.json       → configuración de la PWA
sw.js               → service worker (cache offline)
```

## Requisitos

- Una cuenta y proyecto en Supabase con:
  - Tabla `work_orders`
  - Bucket de storage `photos` (público)
  - Auth de email habilitado
- Las credenciales se configuran en `js/config.js`.

## Ejecutar en local

Los ES modules requieren servirse por HTTP (no abrir `index.html` con doble clic):

```bash
cd OT2
python3 -m http.server 8080
# o con npx: npx serve .
```

Abrir http://localhost:8080

## Despliegue

La app es estática: se puede subir a cualquier hosting estático (Netlify, Vercel, Supabase Hosting, GitHub Pages). No requiere paso de build.

## Dashboard

El proyecto incluye un dashboard de estadísticas del taller (`dashboard.html`) con acceso restringido a administradores.

- **URL**: `https://jbevolo.github.io/OT2/dashboard.html` (y `http://localhost:8080/dashboard.html` en local).
- **Acceso**: solo usuarios cuyo email figure en la tabla supabase `admin_users`. El botón "Dashboard" del panel principal (`index.html`) enlaza a la página. Sin sesión pide login; con sesión pero sin permiso muestra "Acceso restringido".
- **Setup inicial**: ejecutar `supabase/dashboard.sql` en Supabase → SQL Editor (crea la tabla `admin_users` y la función RPC `is_dashboard_admin`).
- **Habilitar un usuario** (ejecutar en Supabase → SQL Editor o `psql`):

  ```sql
  INSERT INTO admin_users (email) VALUES ('correo@dominio.com');
  ```

- **Revocar acceso**:

  ```sql
  DELETE FROM admin_users WHERE email = 'correo@dominio.com';
  ```

> La tabla `admin_users` tiene RLS habilitado y sin privilegios para `anon`/`authenticated`; el dashboard solo consulta vía la función RPC.

## Licencia

Uso interno.