# Web de Boda (Next.js + TypeScript + MongoDB)

Proyecto de ejemplo para una web de boda con los apartados:

- Nuestra historia
- El gran dia
- Confirma tu asistencia
- Para los viajeros
- Pon musica
- Sube tus fotos

Incluye backend/API dentro de Next.js y guardado en MongoDB Atlas.

## 1) Requisitos

- Node.js 20+
- Cuenta en MongoDB Atlas
- Cuenta en Vercel (para deploy)

## 2) Configuracion local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea `.env.local` a partir de `.env.example`.
3. Completa variables:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `ADMIN_USER`
   - `ADMIN_PASSWORD` (o `ADMIN_PASSWORD_HASH`)
   - `ADMIN_SESSION_SECRET`

## 3) Ejecutar en local

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## 4) Endpoints API incluidos

- `POST /api/rsvp`
  - Body: `{ name, guestCount, companions, allergies, needsBus }` (`companions`: `[{ name, isChild, kidsMenu }]` por cada acompañante si hay más de 1 persona)
  - Coleccion: `rsvps`
- `GET /api/songs`
  - Devuelve canciones para lista publica
- `POST /api/songs`
  - Body: `{ guestName, songTitleArtist, spotifyUrl }`
  - Coleccion: `songs`
  - Regla: una cancion por persona (indice unico en `guestName`)
- `GET /api/photos`
  - Devuelve fotos para galeria publica
- `POST /api/photos`
  - Body: `{ guestName, photoDataUrl }` o `{ guestName, photoUrl }`
  - Coleccion: `photos`
- `POST /api/admin/login`
  - Body: `{ username, password }`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/overview`
  - Requiere sesion admin
- `GET /api/admin/photos/:id/download`
  - Requiere sesion admin
- `GET /api/admin/photos/download-zip`
  - Requiere sesion admin
  - Descarga todas las fotos en un ZIP

## 5) Deploy en Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel.
3. En Vercel, configura variables de entorno:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `ADMIN_USER`
   - `ADMIN_PASSWORD` o `ADMIN_PASSWORD_HASH`
   - `ADMIN_SESSION_SECRET`
4. Deploy.

## Password hash recomendado

Si no quieres guardar la password admin en texto plano, puedes generar hash scrypt:

```bash
node -e "const { randomBytes, scryptSync } = require('crypto'); const p='TU_PASSWORD'; const s=randomBytes(16).toString('hex'); const h=scryptSync(p,s,64).toString('hex'); console.log(`scrypt$${s}$${h}`);"
```

Luego guarda ese valor en `ADMIN_PASSWORD_HASH`.

## Nota importante sobre Windows y esta ruta

Si el path contiene `&` (como `BODAI&A`), algunos scripts de npm pueden fallar.
Si ocurre, ejecuta en la terminal:

```powershell
$env:npm_config_script_shell='powershell.exe'
```
