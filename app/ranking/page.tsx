import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type RankingRow = {
  id: number;
  name: string;
  username: string;
  points: number;
  delta: number;
  position: number;
  prediction: string | null;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function teamPairKey(homeTeam: string, awayTeam: string) {
  return `${homeTeam.toLowerCase()}:${awayTeam.toLowerCase()}`;
}

function rankRows(rows: Omit<RankingRow, "position">[]): RankingRow[] {
  const sortedRows = [...rows].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "es"));
  let previousPoints: number | null = null;
  let previousPosition = 0;

  return sortedRows.map((row, index) => {
    const position = previousPoints === row.points ? previousPosition : index + 1;
    previousPoints = row.points;
    previousPosition = position;

    return { ...row, position };
  });
}

export default async function RankingPage() {
  const user = await requireUser();
  const [players, finishedMatches, allPredictions] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PLAYER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true },
    }),
    prisma.match.findMany({
      where: { isFinished: true },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          select: { playerId: true, homeScore: true, awayScore: true, points: true },
        },
      },
      orderBy: [{ matchDate: "asc" }, { id: "asc" }],
    }),
    prisma.prediction.findMany({
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
    }),
  ]);

  const predictionsByTeamPairAndPlayerId = new Map(
    allPredictions.map((prediction) => [
      `${teamPairKey(prediction.match.homeTeam.name, prediction.match.awayTeam.name)}:${prediction.playerId}`,
      prediction,
    ]),
  );
  const finishedMatchesByTeamPair = new Map<string, (typeof finishedMatches)[number]>();

  for (const match of finishedMatches) {
    const key = teamPairKey(match.homeTeam.name, match.awayTeam.name);
    const existingMatch = finishedMatchesByTeamPair.get(key);

    if (!existingMatch || match.predictions.length > existingMatch.predictions.length) {
      finishedMatchesByTeamPair.set(key, match);
    }
  }

  const totalsByPlayerId = new Map(players.map((player) => [player.id, 0]));
  const snapshots = Array.from(finishedMatchesByTeamPair.values()).map((match, index) => {
    const directPredictionsByPlayerId = new Map(match.predictions.map((prediction) => [prediction.playerId, prediction]));
    const matchTeamPairKey = teamPairKey(match.homeTeam.name, match.awayTeam.name);

    const rows = players.map((player) => {
      const prediction =
        directPredictionsByPlayerId.get(player.id) ??
        predictionsByTeamPairAndPlayerId.get(`${matchTeamPairKey}:${player.id}`) ??
        null;
      const delta =
        prediction && match.homeScore !== null && match.awayScore !== null
          ? calculatePoints(prediction, { homeScore: match.homeScore, awayScore: match.awayScore })
          : 0;

      totalsByPlayerId.set(player.id, (totalsByPlayerId.get(player.id) ?? 0) + delta);

      return {
        id: player.id,
        name: player.name,
        username: player.username,
        points: totalsByPlayerId.get(player.id) ?? 0,
        delta,
        prediction: prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : null,
      };
    });

    return {
      id: match.id,
      index: index + 1,
      date: match.matchDate,
      title: `${match.homeTeam.name} ${match.homeScore ?? "-"} - ${match.awayScore ?? "-"} ${match.awayTeam.name}`,
      stage: match.stage,
      rows: rankRows(rows),
    };
  });
  const latestSnapshot = snapshots.at(-1);
  const timeline = [...snapshots].reverse();

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ranking</h1>
            <p className="mt-2 text-gray-600">Tabla de posiciones acumulada fecha a fecha.</p>
          </div>
          {latestSnapshot ? (
            <p className="text-sm font-semibold text-gray-600">
              Ultima fecha: {latestSnapshot.index} - {formatDate(latestSnapshot.date)}
            </p>
          ) : null}
        </div>

        {latestSnapshot ? (
          <section className="mt-6 rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Ranking actual</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-gray-600">
                    <th className="px-3 py-2 font-semibold">Pos</th>
                    <th className="px-3 py-2 font-semibold">Jugador</th>
                    <th className="px-3 py-2 text-right font-semibold">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSnapshot.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 font-bold">{row.position}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold">{row.name}</span>
                        <span className="ml-2 text-gray-500">@{row.username}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-lg border border-line bg-white p-5">
            <p className="text-gray-600">Todavia no hay partidos finalizados para armar el ranking.</p>
          </section>
        )}

        {timeline.length > 0 ? (
          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-bold">Fecha a fecha</h2>
            {timeline.map((snapshot, index) => (
              <details key={snapshot.id} className="group rounded-lg border border-line bg-white" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold">
                      Fecha {snapshot.index}: {snapshot.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {snapshot.stage} - {formatDate(snapshot.date)}
                    </p>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition group-open:rotate-180" />
                </summary>
                <div className="overflow-x-auto border-t border-line p-4">
                  <table className="w-full min-w-[42rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-gray-600">
                        <th className="px-3 py-2 font-semibold">Pos</th>
                        <th className="px-3 py-2 font-semibold">Jugador</th>
                        <th className="px-3 py-2 text-right font-semibold">Pronostico</th>
                        <th className="px-3 py-2 text-right font-semibold">Fecha</th>
                        <th className="px-3 py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.rows.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 font-bold">{row.position}</td>
                          <td className="px-3 py-2">
                            <span className="font-semibold">{row.name}</span>
                            <span className="ml-2 text-gray-500">@{row.username}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {row.prediction ?? <span className="font-normal text-gray-400">Sin cargar</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                          <td className="px-3 py-2 text-right font-bold">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
}
