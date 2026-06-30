import Link from "next/link";
import { Role } from "@prisma/client";
import { SubmitButton } from "@/components/actions";
import { Nav } from "@/components/nav";
import { SponsorCarousel } from "@/components/sponsor-carousel";
import { requireUser } from "@/lib/auth";
import { EspnLiveMatch, fetchEspnScoreboard } from "@/lib/espn-scoreboard";
import { canEditPrediction } from "@/lib/matches";
import { prisma } from "@/lib/prisma";
import { WorldCup26Game, fetchWorldCup26Games, isLiveWorldCup26Game, parseWorldCup26Score } from "@/lib/worldcup26";
import { savePredictionAction, syncResultsAction } from "./matches/actions";

export const dynamic = "force-dynamic";

type LiveMatch = {
  id: string;
  matchId?: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  prediction?: {
    homeScore: number;
    awayScore: number;
  };
};

type ExternalLiveMatch = LiveMatch & {
  fixtureId?: number;
  isLive: boolean;
  isFinished: boolean;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function normalizeTeamName(name: string | undefined) {
  const aliases: Record<string, string> = {
    "United States": "USA",
    "Bosnia and Herzegovina": "Bosnia & Herzegovina",
    "Congo DR": "DR Congo",
    "DR Congo": "DR Congo",
    "Democratic Republic of the Congo": "DR Congo",
    "Korea Republic": "South Korea",
    Czechia: "Czech Republic",
  };

  if (!name) return "Por definirse";
  return aliases[name] ?? name;
}

function normalizeTeamKey(name: string | undefined) {
  return normalizeTeamName(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function teamPairKey(homeTeam: string, awayTeam: string) {
  return `${normalizeTeamKey(homeTeam)}:${normalizeTeamKey(awayTeam)}`;
}

function isPlaceholderTeamName(name: string) {
  return /^\d+[A-L]$/.test(name) || /^\d+[A-L](?:\/[A-L])+$/.test(name) || /^[WL]\d+$/.test(name);
}

function gameToLiveMatch(game: WorldCup26Game): ExternalLiveMatch {
  const fixtureId = Number(game.id);

  return {
    id: game.id,
    fixtureId: Number.isFinite(fixtureId) ? fixtureId : undefined,
    homeTeam: normalizeTeamName(game.home_team_name_en ?? game.home_team_label),
    awayTeam: normalizeTeamName(game.away_team_name_en ?? game.away_team_label),
    homeScore: parseWorldCup26Score(game.home_score),
    awayScore: parseWorldCup26Score(game.away_score),
    status: game.time_elapsed ?? "live",
    isLive: isLiveWorldCup26Game(game),
    isFinished: game.finished.toUpperCase() === "TRUE" || game.time_elapsed === "finished",
  };
}

function espnToLiveMatch(match: EspnLiveMatch): ExternalLiveMatch {
  return {
    id: match.id,
    homeTeam: normalizeTeamName(match.homeTeam),
    awayTeam: normalizeTeamName(match.awayTeam),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    isLive: match.isLive,
    isFinished: match.isFinished,
  };
}

async function getApiGames(): Promise<WorldCup26Game[]> {
  try {
    return await fetchWorldCup26Games({ timeoutMs: 2500 });
  } catch (error) {
    console.warn("No se pudieron cargar partidos en vivo.", error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function getEspnMatches(): Promise<ExternalLiveMatch[]> {
  try {
    return (await fetchEspnScoreboard({ timeoutMs: 2500 })).map(espnToLiveMatch);
  } catch (error) {
    console.warn("No se pudieron cargar marcadores de ESPN.", error instanceof Error ? error.message : String(error));
    return [];
  }
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const liveFallbackStartedAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const [espnMatches, apiGames, localLiveMatches, upcomingMatches, latestResults, ranking, livePredictions, myPredictions] = await Promise.all([
    getEspnMatches(),
    getApiGames(),
    prisma.match.findMany({
      where: {
        isFinished: false,
        matchDate: {
          gte: liveFallbackStartedAfter,
          lte: now,
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { matchDate: "asc" },
      take: 8,
    }),
    prisma.match.findMany({
      where: {
        isFinished: false,
        matchDate: {
          gt: now,
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        stadium: true,
        predictions: {
          where: { playerId: user.id },
        },
      },
      orderBy: { matchDate: "asc" },
    }),
    prisma.match.findMany({
      where: { isFinished: true },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          include: { player: true },
          orderBy: { player: { name: "asc" } },
        },
      },
      orderBy: { matchDate: "desc" },
      take: 5,
    }),
    prisma.user.findMany({
      where: { role: "PLAYER" },
      include: { predictions: true },
      orderBy: { name: "asc" },
    }),
    prisma.prediction.findMany({
      where: {
        playerId: user.id,
        match: {
          isFinished: false,
          matchDate: {
            lte: now,
          },
        },
      },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { matchDate: "asc" } },
    }),
    prisma.prediction.findMany({
      where: { playerId: user.id },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { matchDate: "asc" } },
      take: 6,
    }),
  ]);

  const localLiveMatchesByTeamPair = new Map(localLiveMatches.map((match) => [teamPairKey(match.homeTeam.name, match.awayTeam.name), match]));
  const localMatches = [...localLiveMatches, ...upcomingMatches];
  const localMatchesByFixtureId = new Map(
    localMatches
      .filter((match) => match.apiFootballFixtureId !== null)
      .map((match) => [match.apiFootballFixtureId, match]),
  );
  const localMatchesByTeamPair = new Map(localMatches.map((match) => [teamPairKey(match.homeTeam.name, match.awayTeam.name), match]));
  const externalMatches = [...apiGames.map(gameToLiveMatch), ...espnMatches].map((match) => ({
    ...match,
    matchId:
      (match.fixtureId ? localMatchesByFixtureId.get(match.fixtureId)?.id : undefined) ??
      localMatchesByTeamPair.get(teamPairKey(match.homeTeam, match.awayTeam))?.id ??
      localLiveMatchesByTeamPair.get(teamPairKey(match.homeTeam, match.awayTeam))?.id,
  }));
  const externalMatchesByFixtureId = new Map(
    externalMatches
      .filter((match) => match.fixtureId !== undefined)
      .map((match) => [match.fixtureId, match]),
  );
  const externalMatchesByTeamPair = new Map(externalMatches.map((match) => [teamPairKey(match.homeTeam, match.awayTeam), match]));
  const externalMatchForLocalMatch = (match: (typeof localMatches)[number]) =>
    (match.apiFootballFixtureId ? externalMatchesByFixtureId.get(match.apiFootballFixtureId) : undefined) ??
    externalMatchesByTeamPair.get(teamPairKey(match.homeTeam.name, match.awayTeam.name));
  const externalTeamName = (localName: string, externalName: string | undefined) => {
    const externalKey = normalizeTeamKey(externalName);
    return externalName && externalKey !== "" && externalKey !== "por definirse" ? externalName : localName;
  };
  const externalLiveMatches = Array.from(
    new Map(externalMatches.filter((match) => match.isLive).map((match) => [teamPairKey(match.homeTeam, match.awayTeam), match])).values(),
  );
  const externalLiveTeamPairs = new Set(externalLiveMatches.map((match) => teamPairKey(match.homeTeam, match.awayTeam)));
  const resolvedLocalLiveSlots = new Set(
    localLiveMatches
      .filter((match) => !isPlaceholderTeamName(match.homeTeam.name) && !isPlaceholderTeamName(match.awayTeam.name))
      .map((match) => `${match.matchDate.toISOString()}:${match.stadiumId ?? "sin-sede"}`),
  );
  const liveMatches: LiveMatch[] = [
    ...externalLiveMatches,
    ...localLiveMatches
      .filter((match) => {
        const externalMatch = externalMatchForLocalMatch(match);
        const isPlaceholder = isPlaceholderTeamName(match.homeTeam.name) || isPlaceholderTeamName(match.awayTeam.name);
        const slotKey = `${match.matchDate.toISOString()}:${match.stadiumId ?? "sin-sede"}`;

        return (
          !externalMatch?.isFinished &&
          !externalMatch?.isLive &&
          (!isPlaceholder || !resolvedLocalLiveSlots.has(slotKey)) &&
          !externalLiveTeamPairs.has(teamPairKey(match.homeTeam.name, match.awayTeam.name))
        );
      })
      .map((match) => {
        const externalMatch = externalMatchForLocalMatch(match);

        return {
          id: String(match.id),
          matchId: match.id,
          homeTeam: externalTeamName(match.homeTeam.name, externalMatch?.homeTeam),
          awayTeam: externalTeamName(match.awayTeam.name, externalMatch?.awayTeam),
          homeScore: externalMatch?.homeScore ?? match.homeScore,
          awayScore: externalMatch?.awayScore ?? match.awayScore,
          status: externalMatch?.status ?? "En curso",
        };
      }),
  ];

  const rankingRows = ranking
    .map((player) => ({
      id: player.id,
      name: player.name,
      points: player.predictions.reduce((total, prediction) => total + prediction.points, 0),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const myPredictionsByMatchId = new Map(
    livePredictions.map((prediction) => [
      prediction.matchId,
      {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
      },
    ]),
  );
  const myPredictionsByTeamPair = new Map(
    livePredictions.map((prediction) => [
      teamPairKey(prediction.match.homeTeam.name, prediction.match.awayTeam.name),
      {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
      },
    ]),
  );

  const liveMatchesWithPredictions = liveMatches.map((match) => ({
    ...match,
    prediction: (match.matchId ? myPredictionsByMatchId.get(match.matchId) : undefined) ?? myPredictionsByTeamPair.get(teamPairKey(match.homeTeam, match.awayTeam)),
  }));
  const upcomingStage = upcomingMatches[0]?.stage;
  const upcomingMatchRows = upcomingMatches.map((match) => {
    const externalMatch = externalMatchForLocalMatch(match);
    const homeTeamName = externalTeamName(match.homeTeam.name, externalMatch?.homeTeam);
    const awayTeamName = externalTeamName(match.awayTeam.name, externalMatch?.awayTeam);
    const localPlaceholder = isPlaceholderTeamName(match.homeTeam.name) || isPlaceholderTeamName(match.awayTeam.name);
    const displayPlaceholder = isPlaceholderTeamName(homeTeamName) || isPlaceholderTeamName(awayTeamName);

    return {
      match,
      homeTeamName,
      awayTeamName,
      localPlaceholder,
      displayPlaceholder,
      slotKey: `${match.matchDate.toISOString()}:${match.stadiumId ?? "sin-sede"}`,
      pairKey: teamPairKey(homeTeamName, awayTeamName),
      hasPrediction: match.predictions.length > 0,
    };
  });
  const resolvedUpcomingSlots = new Set(upcomingMatchRows.filter((row) => !row.displayPlaceholder).map((row) => row.slotKey));
  const dedupedUpcomingMatches = Array.from(
    upcomingMatchRows
      .filter((row) => !upcomingStage || row.match.stage === upcomingStage)
      .filter((row) => !row.displayPlaceholder || !resolvedUpcomingSlots.has(row.slotKey))
      .reduce((rowsBySlotAndPair, row) => {
        const key = `${row.slotKey}:${row.pairKey}`;
        const previousRow = rowsBySlotAndPair.get(key);

        if (!previousRow || (row.hasPrediction && !previousRow.hasPrediction) || (!row.localPlaceholder && previousRow.localPlaceholder)) {
          rowsBySlotAndPair.set(key, row);
        }

        return rowsBySlotAndPair;
      }, new Map<string, (typeof upcomingMatchRows)[number]>())
      .values(),
  ).sort((a, b) => a.match.matchDate.getTime() - b.match.matchDate.getTime() || a.match.id - b.match.id);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-8">
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

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
          <section className="min-w-0 rounded-lg border border-line bg-white p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-bold">En vivo</h2>
              {liveMatches.length > 0 ? (
                <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold uppercase text-red-700">Live</span>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {liveMatchesWithPredictions.map((match) => (
                <div key={match.id} className="rounded-md border border-red-100 bg-red-50/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-red-700">{match.status}</span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                    <p className="text-2xl font-bold">
                      {match.homeScore ?? "-"} - {match.awayScore ?? "-"}
                    </p>
                    {match.prediction ? (
                      <p className="rounded-md bg-white px-3 py-2 text-sm text-gray-700">
                        Tu predicción para este partido fue{" "}
                        <strong>
                          {match.prediction.homeScore} - {match.prediction.awayScore}
                        </strong>
                      </p>
                    ) : (
                      <p className="rounded-md bg-white px-3 py-2 text-sm text-gray-600">No cargaste predicción para este partido.</p>
                    )}
                  </div>
                </div>
              ))}
              {liveMatches.length === 0 ? <p className="text-sm text-gray-600">No hay partidos en vivo ahora.</p> : null}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-line bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold leading-tight">Próximos partidos</h2>
              <Link href="/matches" className="text-sm font-semibold text-pitch hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {dedupedUpcomingMatches.map(({ match, homeTeamName, awayTeamName }) => {
                const myPrediction = match.predictions[0];
                const predictionEditable = canEditPrediction(match);

                return (
                  <details
                    key={match.id}
                    className="group overflow-hidden rounded-md border border-gray-200 bg-white transition focus-within:border-pitch open:border-pitch"
                  >
                    <summary className="grid cursor-pointer list-none gap-2 p-3 outline-none transition hover:bg-gray-50 sm:grid-cols-[minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="block break-words font-semibold">
                          {match.homeTeam.flagEmoji} {homeTeamName} vs {match.awayTeam.flagEmoji} {awayTeamName}
                        </span>
                        {myPrediction ? (
                          <span className="mt-1 block text-sm font-semibold text-pitch">
                            Pronóstico: {myPrediction.homeScore} - {myPrediction.awayScore}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm text-gray-600 sm:text-right">
                        {formatDate(match.matchDate)}
                        {match.stadium ? ` · ${match.stadium.city}` : ""}
                      </span>
                    </summary>

                    <div className="border-t border-gray-200 bg-gray-50 p-3">
                      <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="min-w-0 break-words">
                          <span className="block text-gray-600">Local</span>
                          <strong>{homeTeamName}</strong>
                        </p>
                        <p className="min-w-0 break-words">
                          <span className="block text-gray-600">Visitante</span>
                          <strong>{awayTeamName}</strong>
                        </p>
                      </div>

                      {!predictionEditable ? (
                        <p className="rounded-md bg-white px-3 py-2 text-sm text-gray-600">
                          {match.isFinished
                            ? "El partido ya finalizó. Las predicciones quedaron bloqueadas."
                            : "El partido ya empezó. Las predicciones quedaron bloqueadas."}
                        </p>
                      ) : (
                        <form action={savePredictionAction} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
                          <input type="hidden" name="matchId" value={match.id} />
                          <label className="block min-w-0 text-sm font-medium">
                            <span className="block truncate">{homeTeamName}</span>
                            <input
                              name="homeScore"
                              type="number"
                              min="0"
                              defaultValue={myPrediction?.homeScore ?? 0}
                              className="mt-1 h-10 w-full min-w-0 rounded-md border border-line bg-white px-2 text-center sm:px-3"
                              required
                            />
                          </label>
                          <span className="pb-2 text-xl font-bold">-</span>
                          <label className="block min-w-0 text-sm font-medium">
                            <span className="block truncate">{awayTeamName}</span>
                            <input
                              name="awayScore"
                              type="number"
                              min="0"
                              defaultValue={myPrediction?.awayScore ?? 0}
                              className="mt-1 h-10 w-full min-w-0 rounded-md border border-line bg-white px-2 text-center sm:px-3"
                              required
                            />
                          </label>
                          <div className="col-span-3">
                            <SubmitButton className="inline-flex h-10 w-full items-center justify-center rounded-md bg-pitch px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                              {myPrediction ? "Actualizar pronóstico" : "Guardar pronóstico"}
                            </SubmitButton>
                          </div>
                        </form>
                      )}
                    </div>
                  </details>
                );
              })}
              {dedupedUpcomingMatches.length === 0 ? <p className="text-sm text-gray-600">No hay partidos pendientes.</p> : null}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-line bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Ranking general</h2>
              <Link href="/ranking" className="text-sm font-semibold text-pitch hover:underline">
                Ver fecha a fecha
              </Link>
            </div>
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

          <section className="min-w-0 rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Últimos resultados</h2>
            <div className="space-y-3">
              {latestResults.map((match) => (
                <details
                  key={match.id}
                  className="group overflow-hidden rounded-md border border-gray-200 bg-white transition focus-within:border-pitch open:border-pitch"
                >
                  <summary className="cursor-pointer list-none p-3 outline-none transition hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                    <span className="block font-semibold">
                      {match.homeTeam.name} {match.homeScore} - {match.awayScore} {match.awayTeam.name}
                    </span>
                    <span className="text-sm text-gray-600">{match.stage}</span>
                  </summary>
                  <div className="border-t border-gray-200 bg-gray-50 p-3">
                    <h3 className="text-sm font-bold">Predicciones</h3>
                    <div className="mt-2 space-y-2">
                      {match.predictions.map((prediction) => (
                        <div key={prediction.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                          <span className="min-w-0 truncate font-medium">{prediction.player.name}</span>
                          <span className="shrink-0 font-semibold">
                            {prediction.homeScore} - {prediction.awayScore} · {prediction.points} pts
                          </span>
                        </div>
                      ))}
                      {match.predictions.length === 0 ? <p className="text-sm text-gray-600">Nadie cargó predicciones para este partido.</p> : null}
                    </div>
                  </div>
                </details>
              ))}
              {latestResults.length === 0 ? <p className="text-sm text-gray-600">Todavía no hay resultados cargados.</p> : null}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-line bg-white p-5">
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
