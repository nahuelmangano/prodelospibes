# Prode Mundial Amigos

Aplicación web para jugar un prode del Mundial con amigos.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- Docker y Docker Compose

Los datos del Mundial se cargan desde `prisma/data`: grupos, equipos, fixture, estadios y planteles.

## Uso local

```bash
npm install
npm run db:reset
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Usuarios iniciales

- Admin: `admin` / `admin123`
- Jugadores: `apache`, `chueco`, `mati`, `rulo`, `nehu`, `nahu`, `nico` / `1234`

## Docker

```bash
docker compose up --build
```

El contenedor aplica migraciones y ejecuta el seed al iniciar.

## Sincronización automática de resultados

La app puede sincronizar resultados con la API gratuita `worldcup26.ir`.

Variables requeridas:

```env
CRON_SECRET="un-secret-para-el-cron"
WORLDCUP26_API_URL="https://worldcup26.ir"
```

El admin puede sincronizar desde el dashboard. Para automatizarlo desde la VPS:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio.com/api/cron/sync-results
```

El admin también puede sincronizar manualmente desde el dashboard.
