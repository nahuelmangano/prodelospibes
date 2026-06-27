import { revalidatePath } from "next/cache";
import { AutoResultSyncStatus, ResultSyncSource } from "@prisma/client";
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
  autoResultSyncAt: Date | null;
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
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

function hasResolvedTeam(teamId: string | undefined, teamName: string | undefined) {
  return Boolean(teamName && teamName !== "null" && teamId !== "0");
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

  const apiMatch = matches.find((match) => match.apiFootballFixtureId === externalId);
  if (apiMatch) return apiMatch;

  const idMatch = matches.find((match) => match.id === externalId);
  if (idMatch) return idMatch;

  if (!game.home_team_name_en || !game.away_team_name_en) return null;

  const homeName = normalizeTeamName(game.home_team_name_en);
  const awayName = normalizeTeamName(game.away_team_name_en);

  const teamMatch = matches.find(
    (match) =>
      match.homeTeam.name === homeName &&
      match.awayTeam.name === awayName,
  );
  if (teamMatch) return teamMatch;

  return null;
}

async function updateMatchTeamsFromGame(game: WorldCup26Game, match: LocalMatch, teamsByName: Map<string, { id: number; name: string }>) {
  const data: { homeTeamId?: number; awayTeamId?: number } = {};

  if (hasResolvedTeam(game.home_team_id, game.home_team_name_en)) {
    const homeTeam = teamsByName.get(normalizeTeamName(game.home_team_name_en!));
    if (homeTeam && homeTeam.id !== match.homeTeam.id) {
      data.homeTeamId = homeTeam.id;
      match.homeTeam = { id: homeTeam.id, name: homeTeam.name };
    }
  }

  if (hasResolvedTeam(game.away_team_id, game.away_team_name_en)) {
    const awayTeam = teamsByName.get(normalizeTeamName(game.away_team_name_en!));
    if (awayTeam && awayTeam.id !== match.awayTeam.id) {
      data.awayTeamId = awayTeam.id;
      match.awayTeam = { id: awayTeam.id, name: awayTeam.name };
    }
  }

  if (Object.keys(data).length === 0) return false;

  await prisma.match.update({
    where: { id: match.id },
    data,
  });

  return true;
}

function getAutoSyncDelayMs() {
  const minutes = Number(process.env.RESULT_SYNC_DELAY_MINUTES ?? 2);
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : 2) * 60 * 1000;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido.";
}

async function createAutoSyncLog(data: {
  source: ResultSyncSource;
  status: AutoResultSyncStatus;
  startedAt: Date;
  fixtures?: number;
  scheduled?: number;
  alreadyScheduled?: number;
  dueMatches?: number;
  linked?: number;
  finishedMatches?: number;
  skipped?: number;
  errorMessage?: string;
}) {
  return prisma.autoResultSyncLog.create({
    data: {
      source: data.source,
      status: data.status,
      startedAt: data.startedAt,
      finishedAt: new Date(),
      fixtures: data.fixtures ?? 0,
      scheduled: data.scheduled ?? 0,
      alreadyScheduled: data.alreadyScheduled ?? 0,
      dueMatches: data.dueMatches ?? 0,
      linked: data.linked ?? 0,
      finishedMatches: data.finishedMatches ?? 0,
      skipped: data.skipped ?? 0,
      errorMessage: data.errorMessage,
    },
  });
}

export async function scheduleFinishedMatchesForAutoSync(now = new Date()) {
  const games = await fetchWorldCup26Games();
  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamsByName = new Map(teams.map((team) => [team.name, team]));

  const autoResultSyncAt = new Date(now.getTime() + getAutoSyncDelayMs());
  let scheduled = 0;
  let alreadyScheduled = 0;
  let skipped = 0;
  let resolvedTeamUpdates = 0;

  for (const game of games) {
    const match = findLocalMatch(game, matches);
    if (!match) {
      skipped += 1;
      continue;
    }

    if (await updateMatchTeamsFromGame(game, match, teamsByName)) {
      resolvedTeamUpdates += 1;
    }

    if (!isFinishedWorldCup26Game(game)) continue;
    if (match.isFinished) continue;

    const homeScore = parseWorldCup26Score(game.home_score);
    const awayScore = parseWorldCup26Score(game.away_score);
    if (homeScore === null || awayScore === null) continue;

    if (match.autoResultSyncAt) {
      alreadyScheduled += 1;
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { autoResultSyncAt },
    });
    match.autoResultSyncAt = autoResultSyncAt;
    scheduled += 1;
  }

  return {
    fixtures: games.length,
    scheduled,
    alreadyScheduled,
    skipped,
    resolvedTeamUpdates,
    autoResultSyncAt,
  };
}

export async function syncDueAutoResults(now = new Date()) {
  const startedAt = new Date();

  try {
    const schedule = await scheduleFinishedMatchesForAutoSync(now);
    const dueMatches = await prisma.match.count({
      where: {
        isFinished: false,
        autoResultSyncAt: {
          lte: now,
        },
      },
    });

    if (dueMatches === 0) {
      const log =
        schedule.scheduled > 0
          ? await createAutoSyncLog({
              source: ResultSyncSource.AUTO,
              status: AutoResultSyncStatus.SCHEDULED,
              startedAt,
              fixtures: schedule.fixtures,
              scheduled: schedule.scheduled,
              alreadyScheduled: schedule.alreadyScheduled,
              skipped: schedule.skipped,
            })
          : null;

      if (log) {
        try {
          revalidatePath("/admin/syncs");
          if (schedule.resolvedTeamUpdates > 0) {
            revalidatePath("/");
            revalidatePath("/matches");
          }
        } catch {
          // Allows this sync to run from one-off scripts outside the Next.js request runtime.
        }
      } else if (schedule.resolvedTeamUpdates > 0) {
        try {
          revalidatePath("/");
          revalidatePath("/matches");
        } catch {
          // Allows this sync to run from one-off scripts outside the Next.js request runtime.
        }
      }

      return {
        synced: false,
        dueMatches,
        schedule,
        logId: log?.id ?? null,
      };
    }

    const result = await syncResultsFromWorldCup26();
    const log = await createAutoSyncLog({
      source: ResultSyncSource.AUTO,
      status: AutoResultSyncStatus.SUCCESS,
      startedAt,
      fixtures: result.fixtures,
      scheduled: schedule.scheduled,
      alreadyScheduled: schedule.alreadyScheduled,
      dueMatches,
      linked: result.linked,
      finishedMatches: result.finished,
      skipped: result.skipped,
    });

    try {
      revalidatePath("/admin/syncs");
    } catch {
      // Allows this sync to run from one-off scripts outside the Next.js request runtime.
    }

    return {
      synced: true,
      dueMatches,
      schedule,
      result,
      logId: log.id,
    };
  } catch (error) {
    const log = await createAutoSyncLog({
      source: ResultSyncSource.AUTO,
      status: AutoResultSyncStatus.ERROR,
      startedAt,
      errorMessage: getErrorMessage(error),
    });

    try {
      revalidatePath("/admin/syncs");
    } catch {
      // Allows this sync to run from one-off scripts outside the Next.js request runtime.
    }

    throw Object.assign(error instanceof Error ? error : new Error(getErrorMessage(error)), {
      autoSyncLogId: log.id,
    });
  }
}

export async function syncResultsManually() {
  const startedAt = new Date();

  try {
    const result = await syncResultsFromWorldCup26();
    const log = await createAutoSyncLog({
      source: ResultSyncSource.MANUAL,
      status: AutoResultSyncStatus.SUCCESS,
      startedAt,
      fixtures: result.fixtures,
      linked: result.linked,
      finishedMatches: result.finished,
      skipped: result.skipped,
    });

    try {
      revalidatePath("/admin/syncs");
    } catch {
      // Allows this sync to run from one-off scripts outside the Next.js request runtime.
    }

    return { result, logId: log.id };
  } catch (error) {
    const log = await createAutoSyncLog({
      source: ResultSyncSource.MANUAL,
      status: AutoResultSyncStatus.ERROR,
      startedAt,
      errorMessage: getErrorMessage(error),
    });

    try {
      revalidatePath("/admin/syncs");
    } catch {
      // Allows this sync to run from one-off scripts outside the Next.js request runtime.
    }

    throw Object.assign(error instanceof Error ? error : new Error(getErrorMessage(error)), {
      syncLogId: log.id,
    });
  }
}

export async function syncResultsFromWorldCup26() {
  const games = await fetchWorldCup26Games();

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamsByName = new Map(teams.map((team) => [team.name, team]));

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

    await updateMatchTeamsFromGame(game, match, teamsByName);

    if (Number.isFinite(externalId)) {
      await prisma.match.updateMany({
        where: {
          apiFootballFixtureId: externalId,
          NOT: { id: match.id },
        },
        data: { apiFootballFixtureId: null },
      });
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
        autoResultSyncAt: null,
      },
    });
    await recalculatePredictions(match.id, homeScore, awayScore);
    finished += 1;
  }

  try {
    revalidatePath("/");
    revalidatePath("/matches");
    revalidatePath("/admin/syncs");
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
