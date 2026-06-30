import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MatchWithRelations = Awaited<ReturnType<typeof prisma.match.findMany>>[number] & {
  homeTeam: { flagEmoji: string; name: string };
  awayTeam: { flagEmoji: string; name: string };
  stadium: { name: string; city: string } | null;
  predictions: { id: number }[];
};

type MatchPreference = {
  id: number;
  isFinished: boolean;
  apiFootballFixtureId: number | null;
  predictions: { id: number }[];
};

const KNOCKOUT_STAGE_ORDER: Record<string, number> = {
  "Round of 32": 100,
  "Round of 16": 101,
  "Quarter-final": 102,
  "Semi-final": 103,
  "Match for third place": 104,
  Final: 105,
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function getStageOrder(stage: string) {
  const groupMatch = /^Grupo\s+([A-Z])$/i.exec(stage);

  if (groupMatch) {
    return groupMatch[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
  }

  return KNOCKOUT_STAGE_ORDER[stage] ?? 1000;
}

function teamPairKey(homeTeam: string, awayTeam: string) {
  return [homeTeam, awayTeam]
    .map((name) =>
      name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/gi, " ")
        .trim()
        .toLowerCase(),
    )
    .join(":");
}

function isPlaceholderTeamName(name: string) {
  return /^\d+[A-L]$/.test(name) || /^\d+[A-L](?:\/[A-L])+$/.test(name) || /^[WL]\d+$/.test(name);
}

function preferredMatch<T extends MatchPreference>(current: T, next: T) {
  if (current.isFinished !== next.isFinished) return current.isFinished ? current : next;
  if (current.predictions.length !== next.predictions.length) return current.predictions.length > next.predictions.length ? current : next;
  if (current.apiFootballFixtureId !== null && next.apiFootballFixtureId === null) return current;
  if (next.apiFootballFixtureId !== null && current.apiFootballFixtureId === null) return next;

  return current.id < next.id ? current : next;
}

function isGroupStage(stage: string) {
  const groupMatch = /^Grupo\s+([A-Z])$/i.exec(stage);

  return groupMatch ? groupMatch[1].toUpperCase() <= "L" : false;
}

function MatchCard({ match }: { match: MatchWithRelations }) {
  return (
    <Link href={`/matches/${match.id}`} className="rounded-lg border border-line bg-white p-4 hover:border-pitch">
      <h3 className="text-lg font-bold">
        {match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}
      </h3>
      <p className="mt-2 text-sm text-gray-600">{formatDate(match.matchDate)}</p>
      {match.stadium ? (
        <p className="mt-1 text-sm text-gray-600">
          {match.stadium.name} · {match.stadium.city}
        </p>
      ) : null}
      <p className="mt-3 font-semibold">
        {match.isFinished ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"}
      </p>
    </Link>
  );
}

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, stadium: true, predictions: { select: { id: true } } },
    orderBy: { matchDate: "asc" },
  });
  const resolvedSlots = new Set(
    matches
      .filter((match) => !isPlaceholderTeamName(match.homeTeam.name) && !isPlaceholderTeamName(match.awayTeam.name))
      .map((match) => `${match.matchDate.toISOString()}:${match.stadiumId ?? "sin-sede"}`),
  );
  const dedupedMatches = Array.from(
    matches
      .filter((match) => {
        const isPlaceholder = isPlaceholderTeamName(match.homeTeam.name) || isPlaceholderTeamName(match.awayTeam.name);
        const slotKey = `${match.matchDate.toISOString()}:${match.stadiumId ?? "sin-sede"}`;

        return !isPlaceholder || !resolvedSlots.has(slotKey);
      })
      .reduce((matchesByPair, match) => {
        const key = teamPairKey(match.homeTeam.name, match.awayTeam.name);
        const currentMatch = matchesByPair.get(key);

        matchesByPair.set(key, currentMatch ? preferredMatch(currentMatch, match) : match);

        return matchesByPair;
      }, new Map<string, typeof matches[number]>())
      .values(),
  ).sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime() || a.id - b.id);
  const matchGroups = Array.from(
    dedupedMatches.reduce((groups, match) => {
      const groupMatches = groups.get(match.stage) ?? [];
      groupMatches.push(match);
      groups.set(match.stage, groupMatches);

      return groups;
    }, new Map<string, typeof dedupedMatches>()),
  ).sort(([stageA], [stageB]) => getStageOrder(stageA) - getStageOrder(stageB) || stageA.localeCompare(stageB, "es"));
  const groupStageGroups = matchGroups.filter(([stage]) => isGroupStage(stage));
  const knockoutStageGroups = matchGroups.filter(([stage]) => !isGroupStage(stage));
  const groupStageMatchCount = groupStageGroups.reduce((total, [, groupMatches]) => total + groupMatches.length, 0);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Partidos</h1>
        <div className="mt-6 space-y-4">
          {groupStageGroups.length > 0 ? (
            <details className="group rounded-lg border border-line bg-white" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <div>
                  <h2 className="text-xl font-bold">Fase de grupos</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {groupStageGroups.length} grupos · {groupStageMatchCount} partidos
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-line p-4">
                {groupStageGroups.map(([stage, groupMatches], index) => (
                  <details key={stage} className="group/stage rounded-lg border border-line bg-gray-50" open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <div>
                        <h3 className="font-bold">{stage}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {groupMatches.length} {groupMatches.length === 1 ? "partido" : "partidos"}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition group-open/stage:rotate-180" />
                    </summary>
                    <div className="grid gap-3 border-t border-line p-3 md:grid-cols-2">
                      {groupMatches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ) : null}

          {knockoutStageGroups.map(([stage, groupMatches]) => (
            <details key={stage} className="group rounded-lg border border-line bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <div>
                  <h2 className="text-xl font-bold">{stage}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {groupMatches.length} {groupMatches.length === 1 ? "partido" : "partidos"}
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
                {groupMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </main>
    </>
  );
}
