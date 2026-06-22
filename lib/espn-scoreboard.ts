const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

type EspnCompetitor = {
  homeAway: "home" | "away";
  score: string;
  team: {
    displayName: string;
    shortDisplayName?: string;
    name?: string;
    location?: string;
  };
};

type EspnCompetition = {
  status: {
    displayClock?: string;
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
      detail?: string;
      shortDetail?: string;
    };
  };
  competitors: EspnCompetitor[];
};

type EspnEvent = {
  id: string;
  date: string;
  competitions: EspnCompetition[];
};

type EspnScoreboardResponse = {
  events?: EspnEvent[];
};

export type EspnLiveMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isLive: boolean;
  isFinished: boolean;
};

type FetchEspnScoreboardOptions = {
  timeoutMs?: number;
  date?: Date;
};

function formatEspnDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function parseScore(score: string) {
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
}

function teamName(competitor: EspnCompetitor) {
  return competitor.team.displayName ?? competitor.team.shortDisplayName ?? competitor.team.name ?? competitor.team.location ?? "";
}

function eventToLiveMatch(event: EspnEvent): EspnLiveMatch | null {
  const competition = event.competitions[0];
  if (!competition) return null;

  const home = competition.competitors.find((competitor) => competitor.homeAway === "home");
  const away = competition.competitors.find((competitor) => competitor.homeAway === "away");
  if (!home || !away) return null;

  const state = competition.status.type.state;
  const detail = competition.status.type.shortDetail ?? competition.status.type.detail;

  return {
    id: event.id,
    homeTeam: teamName(home),
    awayTeam: teamName(away),
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    status: detail ?? competition.status.displayClock ?? (state === "in" ? "En vivo" : "Programado"),
    isLive: state === "in",
    isFinished: state === "post" || competition.status.type.completed,
  };
}

export async function fetchEspnScoreboard(options: FetchEspnScoreboardOptions = {}) {
  const date = formatEspnDate(options.date ?? new Date());
  const url = new URL(ESPN_SCOREBOARD_URL);
  url.searchParams.set("dates", date);

  const response = await fetch(url, {
    cache: "no-store",
    signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
  });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard respondio ${response.status}.`);
  }

  const data = (await response.json()) as EspnScoreboardResponse;
  return (data.events ?? []).map(eventToLiveMatch).filter((match): match is EspnLiveMatch => Boolean(match));
}
