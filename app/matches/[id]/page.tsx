import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { SubmitButton } from "@/components/actions";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { canEditPrediction, hasMatchStarted } from "@/lib/matches";
import { prisma } from "@/lib/prisma";
import { saveLiveResultAction, savePredictionAction, saveResultAction } from "../actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const matchId = Number(id);
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      stadium: true,
      predictions: {
        where: { playerId: user.id },
      },
    },
  });

  if (!match) notFound();

  const myPrediction = match.predictions.find((prediction) => prediction.playerId === user.id);
  const matchStarted = hasMatchStarted(match);
  const predictionEditable = canEditPrediction(match);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-lg border border-line bg-white p-6">
          <p className="text-sm font-semibold text-pitch">{match.stage}</p>
          <h1 className="mt-2 text-3xl font-bold">
            {match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}
          </h1>
          <p className="mt-2 text-gray-600">{formatDate(match.matchDate)}</p>
          {match.stadium ? (
            <p className="mt-1 text-gray-600">
              {match.stadium.name} · {match.stadium.city}
            </p>
          ) : null}
          <div className="mt-5 rounded-md bg-gray-50 px-4 py-3">
            <span className="text-sm text-gray-600">Resultado real</span>
            <p className="text-2xl font-bold">
              {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"}
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg font-bold">Mi predicción</h2>
            {!predictionEditable ? (
              <p className="mt-3 text-sm text-gray-600">
                {match.isFinished
                  ? "El partido ya finalizó. Las predicciones quedaron bloqueadas."
                  : "El partido ya empezó. Las predicciones quedaron bloqueadas."}
              </p>
            ) : (
              <form action={savePredictionAction} className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <input type="hidden" name="matchId" value={match.id} />
                <label className="block text-sm font-medium">
                  {match.homeTeam.name}
                  <input
                    name="homeScore"
                    type="number"
                    min="0"
                    defaultValue={myPrediction?.homeScore ?? 0}
                    className="mt-1 h-10 w-full rounded-md border border-line px-3"
                    required
                  />
                </label>
                <span className="pb-2 text-xl font-bold">-</span>
                <label className="block text-sm font-medium">
                  {match.awayTeam.name}
                  <input
                    name="awayScore"
                    type="number"
                    min="0"
                    defaultValue={myPrediction?.awayScore ?? 0}
                    className="mt-1 h-10 w-full rounded-md border border-line px-3"
                    required
                  />
                </label>
                <div className="col-span-3">
                  <SubmitButton>{myPrediction ? "Actualizar" : "Guardar"}</SubmitButton>
                </div>
              </form>
            )}
            {myPrediction ? (
              <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-sm">
                Tu predicción actual: <strong>{myPrediction.homeScore} - {myPrediction.awayScore}</strong>
                {match.isFinished ? <> · {myPrediction.points} puntos</> : null}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg font-bold">Estado</h2>
            <div className="mt-4 rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {myPrediction ? (
                <p>Tu predicción está cargada para este partido.</p>
              ) : (
                <p>Todavía no cargaste una predicción para este partido.</p>
              )}
              {matchStarted && !match.isFinished ? <p className="mt-2">El partido ya empezó y no admite cambios.</p> : null}
              <p className="mt-2">Las predicciones de otros jugadores no se muestran.</p>
            </div>
          </section>
        </div>

        {user.role === Role.ADMIN ? (
          <section className="mt-6 rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg font-bold">Cargar resultado</h2>
            <form action={saveLiveResultAction} className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3 md:max-w-md">
              <input type="hidden" name="matchId" value={match.id} />
              <label className="block text-sm font-medium">
                {match.homeTeam.name}
                <input
                  name="homeScore"
                  type="number"
                  min="0"
                  defaultValue={match.homeScore ?? 0}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3"
                  required
                />
              </label>
              <span className="pb-2 text-xl font-bold">-</span>
              <label className="block text-sm font-medium">
                {match.awayTeam.name}
                <input
                  name="awayScore"
                  type="number"
                  min="0"
                  defaultValue={match.awayScore ?? 0}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3"
                  required
                />
              </label>
              <div className="col-span-3">
                <SubmitButton>Actualizar marcador en vivo</SubmitButton>
              </div>
            </form>
            <form action={saveResultAction} className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-t border-line pt-4 md:max-w-md">
              <input type="hidden" name="matchId" value={match.id} />
              <label className="block text-sm font-medium">
                Final {match.homeTeam.name}
                <input
                  name="homeScore"
                  type="number"
                  min="0"
                  defaultValue={match.homeScore ?? 0}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3"
                  required
                />
              </label>
              <span className="pb-2 text-xl font-bold">-</span>
              <label className="block text-sm font-medium">
                Final {match.awayTeam.name}
                <input
                  name="awayScore"
                  type="number"
                  min="0"
                  defaultValue={match.awayScore ?? 0}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3"
                  required
                />
              </label>
              <div className="col-span-3">
                <SubmitButton className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60">
                  Cerrar partido y recalcular
                </SubmitButton>
              </div>
            </form>
          </section>
        ) : null}
      </main>
    </>
  );
}
