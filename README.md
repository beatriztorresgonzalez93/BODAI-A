<img width="1159" height="240" alt="VINCÉ" src="https://github.com/user-attachments/assets/f219c44d-e7ee-45f1-a7b6-50b051669932" />

# Boda web (`boda-web`)

Sitio de boda con **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS** y datos en **MongoDB Atlas**. Las fotos de invitados pueden guardarse en **Cloudinary** para no llenar la base de datos.

## Contenido del sitio (pestañas)

| Sección         | Descripción                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Inicio**      | Cabecera, fecha y cuenta atrás                                                                                                     |
| **Historia**    | Textos configurables                                                                                                               |
| **Gran día**    | Fecha, ceremonia, ubicación (con enlace a Google Maps), dress code e itinerario                                                    |
| **RSVP**        | Confirmación con número de asistentes, acompañantes (nombre, niño/a, menú infantil), alergias y autobús                            |
| **Viajeros**    | Bloque de hotel recomendado (imagen, dirección, teléfono, web, mapa)                                                               |
| **Música**      | Formulario para sugerir una canción (una por persona); lista pública solo con título/artista/Spotify, sin mostrar quién la propuso |
| **Fotos**       | Subida de imágenes (comprimidas en cliente) y galería                                                                              |
| **Área novios** | Panel privado: RSVPs, canciones (con nombre del invitado), fotos con descarga individual o ZIP                                     |

Los textos del evento (nombres, fechas, hotel, direcciones, etc.) se centralizan en `src/lib/wedding-config.ts`.

## Requisitos

- **Node.js** 20 o superior
- Cuenta **MongoDB Atlas**
- (Opcional) **Cloudinary** para almacenar fotos fuera de Mongo
- (Opcional) **Vercel** u otro hosting compatible con Next.js

## Configuración local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar variables de entorno:

   ```bash
   copy .env.example .env
   ```

   En macOS/Linux: `cp .env.example .env`

3. Completar al menos:

   | Variable                                 | Uso                                     |
   | ---------------------------------------- | --------------------------------------- |
   | `MONGODB_URI`                            | Cadena de conexión Atlas                |
   | `MONGODB_DB_NAME`                        | Nombre de la base de datos              |
   | `ADMIN_USER`                             | Usuario del panel novios                |
   | `ADMIN_PASSWORD` o `ADMIN_PASSWORD_HASH` | Acceso al panel                         |
   | `ADMIN_SESSION_SECRET`                   | Secreto para firmar la cookie de sesión |

4. **Fotos con Cloudinary** (recomendado si Atlas tiene poco espacio): define las tres variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. Opcional: `CLOUDINARY_FOLDER` (por defecto `boda-fotos`). No hace falta crear un _upload preset_; la subida es por API desde el servidor. Sin estas variables, las fotos se guardan en Mongo como imagen en base64 (ocupa mucho más).

5. **MongoDB Atlas — acceso de red** (si ves errores 500 o `tlsv1 alert internal error` en la terminal):
   - En [MongoDB Atlas](https://cloud.mongodb.com) → tu proyecto → **Network Access** → **Add IP Address**.
   - Para desarrollo en casa: **Allow Access from Anywhere** (`0.0.0.0/0`) o añade tu IP actual.
   - Comprueba que el cluster no esté **pausado** (Database → Resume si aplica).
   - Copia la cadena de conexión desde **Database → Connect → Drivers** y pégala en `MONGODB_URI` del `.env` (formato `mongodb+srv://...` recomendado por Atlas).
   - Tras cambiar `.env`, reinicia `npm run dev`.

## Ejecutar en local

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Otros scripts: `npm run build`, `npm run start`, `npm run lint`.

## API (rutas principales)

| Método         | Ruta                              | Notas                                                                                                                                                     |
| -------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`         | `/api/rsvp`                       | Body: `name`, `guestCount`, `companions[]`, `allergies`, `needsBus`. Colección `rsvps`.                                                                   |
| `GET` / `POST` | `/api/songs`                      | POST: `guestName`, `songTitleArtist`, `spotifyUrl`. Una canción por `guestName` (índice único). Colección `songs`.                                        |
| `GET` / `POST` | `/api/photos`                     | POST: `guestName` + `photoDataUrl` y/o URL externa. Con Cloudinary activo, respuesta incluye `storage: "cloudinary"` \| `"database"`. Colección `photos`. |
| `POST`         | `/api/admin/login`                | Body: `username`, `password`.                                                                                                                             |
| `POST`         | `/api/admin/logout`               |                                                                                                                                                           |
| `GET`          | `/api/admin/session`              |                                                                                                                                                           |
| `GET`          | `/api/admin/overview`             | RSVPs, canciones y metadatos de fotos (requiere sesión).                                                                                                  |
| `GET`          | `/api/admin/photos/[id]/download` | Descarga de una foto (requiere sesión).                                                                                                                   |
| `GET`          | `/api/admin/photos/download-zip`  | ZIP con las fotos (requiere sesión).                                                                                                                      |

## Despliegue (p. ej. Vercel)

1. Repositorio en GitHub y proyecto importado en Vercel.
2. **Settings → Environment Variables**: copia **las mismas** que en tu `.env` local y actívalas en **Production** y **Preview** (si despliegas la rama `version-empresa`, usa Preview o Production según el dominio que compartas):
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `ADMIN_USER`
   - `ADMIN_PASSWORD` (o `ADMIN_PASSWORD_HASH`)
   - `ADMIN_SESSION_SECRET`
   - (Recomendado para fotos) `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Tras añadir variables, haz **Redeploy** (Deployments → ⋯ → Redeploy).
4. En **MongoDB Atlas → Network Access**, permite **`0.0.0.0/0`** (o Vercel no podrá conectar y verás error 500 en `/api/songs`, `/api/photos`, seating, etc.).
5. Diagnóstico: abre `https://tu-dominio.vercel.app/api/health` — debe devolver `"ok": true`. Si `dbError` aparece, revisa URI y Atlas.
6. No subas `.env` al repositorio; usa los secretos del panel del hosting.

## Contraseña del panel en hash (opcional)

Para no guardar la contraseña en texto plano:

```bash
node -e "const { randomBytes, scryptSync } = require('crypto'); const p='TU_PASSWORD'; const s=randomBytes(16).toString('hex'); const h=scryptSync(p,s,64).toString('hex'); console.log(`scrypt$${s}$${h}`);"
```

Guarda el resultado en `ADMIN_PASSWORD_HASH` (y no uses `ADMIN_PASSWORD` a la vez).

## Windows y rutas con `&`

Si la carpeta del proyecto incluye `&` (por ejemplo `BODAI&A`), algunos scripts de npm pueden fallar. En PowerShell:

```powershell
$env:npm_config_script_shell='powershell.exe'
```

Ejecuta `npm install` y `npm run dev` desde la carpeta del proyecto (`boda-web`).
