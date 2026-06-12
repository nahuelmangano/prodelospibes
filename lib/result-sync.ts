import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/scoring";
import {
  WorldCup26Game,
  fetchWorldCup26Games,
  isFinishedWorldCup26Game,
  parseWorldCup26Score,
} from "@/lib/worldcup26";

type LocalMatch = {
  id: number;
  apiFootballFixtureId: number | null;
  matchDate: Date;
  homeScore: number | null;
  awayScore: number | null;
  isFinished: boolean;
  homeTeam: {
    name: string;
  };
  awayTeam: {
    name: string;
  };
};

const NAME_ALIASES: Record<string, string> = {
  "United States": "USA",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Democratic Republic of the Congo": "DR Congo",
};

function normalizeTeamName(name: string) {
  return NAME_ALIASES[name] ?? name;
}

async function recalculatePredictions(matchId: number, homeScore: number, awayScore: number) {
  const predictions = await prisma.prediction.findMany({ where: { matchId } });

  await Promise.all(
    predictions.map((prediction) =>
      prisma.prediction.update({
        where: { id: prediction.id },
        data: { points: calculatePoints(prediction, { homeScore, awayScore }) },
      }),
    ),
  );
}

function findLocalMatch(game: WorldCup26Game, matches: LocalMatch[]) {
  const externalId = Number(game.id);
  const homeName = normalizeTeamName(game.home_team_name_en);
  const awayName = normalizeTeamName(game.away_team_name_en);

  const teamMatch = matches.find(
    (match) =>
      match.homeTeam.name === homeName &&
      match.awayTeam.name === awayName,
  );
  if (teamMatch) return teamMatch;

  return matches.find((match) => match.id === externalId || match.apiFootballFixtureId === externalId);
}

export async function syncResultsFromWorldCup26() {
  const games = await fetchWorldCup26Games();
  await prisma.match.updateMany({ data: { apiFootballFixtureId: null } });

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  let linked = 0;
  let finished = 0;
  let skipped = 0;

  for (const game of games) {
    const externalId = Number(game.id);
    const match = findLocalMatch(game, matches);
    if (!match) {
      skipped += 1;
      continue;
    }

    if (Number.isFinite(externalId)) {
      await prisma.match.update({
        where: { id: match.id },
        data: { apiFootballFixtureId: externalId },
      });
      match.apiFootballFixtureId = externalId;
      linked += 1;
    }

    if (!isFinishedWorldCup26Game(game)) continue;

    const homeScore = parseWorldCup26Score(game.home_score);
    const awayScore = parseWorldCup26Score(game.away_score);
    if (homeScore === null || awayScore === null) continue;

    const resultChanged = match.homeScore !== homeScore || match.awayScore !== awayScore || !match.isFinished;

    if (!resultChanged) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        isFinished: true,
      },
    });
    await recalculatePredictions(match.id, homeScore, awayScore);
    finished += 1;
  }

  try {
    revalidatePath("/");
    revalidatePath("/matches");
  } catch {
    // Allows this sync to run from one-off scripts outside the Next.js request runtime.
  }

  return {
    fixtures: games.length,
    linked,
    finished,
    skipped,
  };
}

export const syncResultsFromApiFootball = syncResultsFromWorldCup26;
