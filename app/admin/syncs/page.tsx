import { AutoResultSyncStatus, ResultSyncSource } from "@prisma/client";
import { AlertCircle, CheckCircle2, Clock3, MousePointerClick, Timer } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function durationMs(startedAt: Date, finishedAt: Date) {
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}

function StatusBadge({ status }: { status: AutoResultSyncStatus }) {
  if (status === AutoResultSyncStatus.SUCCESS) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        OK
      </span>
    );
  }

  if (status === AutoResultSyncStatus.ERROR) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        <AlertCircle className="h-4 w-4" />
        Error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
      <Clock3 className="h-4 w-4" />
      Programada
    </span>
  );
}

function SourceBadge({ source }: { source: ResultSyncSource }) {
  if (source === ResultSyncSource.MANUAL) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
        <MousePointerClick className="h-4 w-4" />
        Manual
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
      <Timer className="h-4 w-4" />
      Automática
    </span>
  );
}

export default async function AdminSyncsPage() {
  const user = await requireAdmin();
  const logs = await prisma.autoResultSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Sincronizaciones</h1>
          <p className="mt-2 text-gray-600">Últimas ejecuciones manuales y automáticas del sincronizador de resultados.</p>
        </div>

        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="border-b border-line px-4 py-3 font-semibold">Estado</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Origen</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Inicio</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Duración</th>
                  <th className="border-b border-line px-4 py-3 text-center font-semibold">Programados</th>
                  <th className="border-b border-line px-4 py-3 text-center font-semibold">Vencidos</th>
                  <th className="border-b border-line px-4 py-3 text-center font-semibold">Actualizados</th>
                  <th className="border-b border-line px-4 py-3 text-center font-semibold">Fixtures</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <SourceBadge source={log.source} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(log.startedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{durationMs(log.startedAt, log.finishedAt)} ms</td>
                    <td className="px-4 py-3 text-center font-semibold">{log.scheduled}</td>
                    <td className="px-4 py-3 text-center font-semibold">{log.dueMatches}</td>
                    <td className="px-4 py-3 text-center font-semibold">{log.finishedMatches}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{log.fixtures}</td>
                    <td className="min-w-72 px-4 py-3 text-gray-700">
                      {log.errorMessage ? (
                        <span className="text-red-700">{log.errorMessage}</span>
                      ) : (
                        <span>
                          Vinculados: {log.linked} · Omitidos: {log.skipped} · Ya programados: {log.alreadyScheduled}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-600">Todavía no hay sincronizaciones registradas.</p>
          ) : null}
        </section>
      </main>
    </>
  );
}
