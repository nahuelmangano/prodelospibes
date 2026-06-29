import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MatchWithRelations = Awaited<ReturnType<typeof prisma.match.findMany>>[number] & {
  homeTeam: { flagEmoji: string; name: string };
  awayTeam: { flagEmoji: string; name: string };
  stadium: { name: string; city: string } | null;
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
    include: { homeTeam: true, awayTeam: true, stadium: true },
    orderBy: { matchDate: "asc" },
  });
  const matchGroups = Array.from(
    matches.reduce((groups, match) => {
      const groupMatches = groups.get(match.stage) ?? [];
      groupMatches.push(match);
      groups.set(match.stage, groupMatches);

      return groups;
    }, new Map<string, typeof matches>()),
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
