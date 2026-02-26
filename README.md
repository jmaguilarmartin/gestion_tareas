# Sistema de Gestion de Actividades - MVP

Sistema completo con Google Calendar, Sheets y Gmail.

## Instalacion

1. Instalar dependencias:
   ```
   npm install
   ```

2. Configurar Google Cloud (ver INSTRUCCIONES.md)

3. Crear archivo .env con tus credenciales

4. Obtener refresh token:
   ```
   npm run get-token
   ```

5. Iniciar servidor de desarrollo:
   ```
   npm run dev
   ```

## Archivos Backend Completos

✓ src/config/google-config.js
✓ src/services/sheets-service.js
✓ src/services/calendar-service.js
✓ src/services/gmail-service.js
✓ src/utils/email-templates.js
✓ netlify/functions/actividades-crear.js
✓ netlify/functions/actividades-listar.js
✓ netlify/functions/actividades-actualizar.js

## Pendiente: Archivos Frontend

Necesitas crear estos archivos con el codigo proporcionado:

- public/index.html
- public/styles.css
- public/app.js
- public/calendario.js

Solicita estos archivos individualmente para copiarlos.

## Deploy

```
netlify deploy --prod
```
