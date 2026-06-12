import Link from "next/link";
import { Role } from "@prisma/client";
import { SubmitButton } from "@/components/actions";
import { Nav } from "@/components/nav";
import { SponsorCarousel } from "@/components/sponsor-carousel";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWorldCup26Games, isLiveWorldCup26Game, parseWorldCup26Score } from "@/lib/worldcup26";
import { syncResultsAction } from "./matches/actions";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

async function getLiveMatches() {
  try {
    const games = await fetchWorldCup26Games();
    return games
      .filter(isLiveWorldCup26Game)
      .map((game) => ({
        id: game.id,
        homeTeam: game.home_team_name_en,
        awayTeam: game.away_team_name_en,
        homeScore: parseWorldCup26Score(game.home_score) ?? 0,
        awayScore: parseWorldCup26Score(game.away_score) ?? 0,
        status: game.time_elapsed ?? "live",
      }));
  } catch (error) {
    console.error("No se pudieron cargar partidos en vivo.", error);
    return [];
  }
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [liveMatches, upcomingMatches, latestResults, ranking, myPredictions] = await Promise.all([
    getLiveMatches(),
    prisma.match.findMany({
      where: { isFinished: false },
      include: { homeTeam: true, awayTeam: true, stadium: true },
      orderBy: { matchDate: "asc" },
      take: 5,
    }),
    prisma.match.findMany({
      where: { isFinished: true },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchDate: "desc" },
      take: 5,
    }),
    prisma.user.findMany({
      where: { role: "PLAYER" },
      include: { predictions: true },
      orderBy: { name: "asc" },
    }),
    prisma.prediction.findMany({
      where: { playerId: user.id },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { matchDate: "asc" } },
      take: 6,
    }),
  ]);

  const rankingRows = ranking
    .map((player) => ({
      id: player.id,
      name: player.name,
      points: player.predictions.reduce((total, prediction) => total + prediction.points, 0),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8">
          <h1 className="text-3xl font-bold">Hola, {user.name}</h1>
          <p className="mt-2 text-gray-600">Estos son los partidos, resultados y posiciones del prode.</p>
          {user.role === Role.ADMIN ? (
            <form action={syncResultsAction} className="mt-4">
              <SubmitButton className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60">
                Sincronizar resultados
              </SubmitButton>
            </form>
          ) : null}
        </section>

        <section className="mb-8 rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-lg font-bold">Avalado por</h2>
          <SponsorCarousel />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-lg border border-line bg-white p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-bold">En vivo</h2>
              {liveMatches.length > 0 ? (
                <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold uppercase text-red-700">Live</span>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {liveMatches.map((match) => (
                <div key={match.id} className="rounded-md border border-red-100 bg-red-50/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-red-700">{match.status}</span>
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {match.homeScore} - {match.awayScore}
                  </p>
                </div>
              ))}
              {liveMatches.length === 0 ? <p className="text-sm text-gray-600">No hay partidos en vivo ahora.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Próximos partidos</h2>
              <Link href="/matches" className="text-sm font-semibold text-pitch hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="grid gap-2 rounded-md border border-gray-200 p-3 hover:border-pitch sm:grid-cols-[1fr_auto]"
                >
                  <span className="font-semibold">
                    {match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatDate(match.matchDate)}
                    {match.stadium ? ` · ${match.stadium.city}` : ""}
                  </span>
                </Link>
              ))}
              {upcomingMatches.length === 0 ? <p className="text-sm text-gray-600">No hay partidos pendientes.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Ranking general</h2>
            <ol className="space-y-2">
              {rankingRows.map((row, index) => (
                <li key={row.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span>
                    <strong>{index + 1}.</strong> {row.name}
                  </span>
                  <span className="font-bold">{row.points} pts</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Últimos resultados</h2>
            <div className="space-y-3">
              {latestResults.map((match) => (
                <div key={match.id} className="rounded-md border border-gray-200 p-3">
                  <p className="font-semibold">
                    {match.homeTeam.name} {match.homeScore} - {match.awayScore} {match.awayTeam.name}
                  </p>
                  <p className="text-sm text-gray-600">{match.stage}</p>
                </div>
              ))}
              {latestResults.length === 0 ? <p className="text-sm text-gray-600">Todavía no hay resultados cargados.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Mis predicciones</h2>
            <div className="space-y-3">
              {myPredictions.map((prediction) => (
                <Link key={prediction.id} href={`/matches/${prediction.matchId}`} className="block rounded-md border border-gray-200 p-3 hover:border-pitch">
                  <p className="font-semibold">
                    {prediction.match.homeTeam.name} {prediction.homeScore} - {prediction.awayScore} {prediction.match.awayTeam.name}
                  </p>
                  <p className="text-sm text-gray-600">{prediction.points} puntos</p>
                </Link>
              ))}
              {myPredictions.length === 0 ? <p className="text-sm text-gray-600">Todavía no cargaste predicciones.</p> : null}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
