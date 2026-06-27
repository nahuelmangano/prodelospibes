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
RESULT_SYNC_DELAY_MINUTES="2"
RESULT_SYNC_POLL_SECONDS="60"
```

El admin puede sincronizar manualmente desde el dashboard.

En Docker Compose queda activo el servicio `result-sync`, que consulta la app cada 60 segundos. En cada pasada completa los cruces eliminatorios que la API ya tenga resueltos. Cuando la API informa que un partido terminó, la app programa la sincronización para 2 minutos después y recién ahí carga el resultado y recalcula los puntos.

El admin puede revisar el historial y el estado de las sincronizaciones manuales y automáticas en `/admin/syncs`.

Para automatizarlo sin Docker Compose, ejecutar periódicamente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio.com/api/cron/sync-due-results
```

El endpoint `/api/cron/sync-results` sigue disponible para forzar una sincronización completa.
