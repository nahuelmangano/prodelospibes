const BASE_URL = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;

export type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  teams: {
    home: {
      name: string;
    };
    away: {
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

type ApiFootballResponse = {
  response: ApiFootballFixture[];
  errors?: unknown;
};

type FetchWorldCupFixturesOptions = {
  timeoutMs?: number;
};

export function apiFootballConfigured() {
  return Boolean(process.env.API_FOOTBALL_KEY);
}

export async function fetchWorldCupFixtures(options: FetchWorldCupFixturesOptions = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY no está configurada.");
  }

  const params = new URLSearchParams({
    league: String(WORLD_CUP_LEAGUE_ID),
    season: String(WORLD_CUP_SEASON),
  });

  const response = await fetch(`${BASE_URL}/fixtures?${params.toString()}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
    signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API-FOOTBALL respondió ${response.status}.`);
  }

  const data = (await response.json()) as ApiFootballResponse;
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-FOOTBALL devolvió errores: ${JSON.stringify(data.errors)}`);
  }

  return data.response;
}

export function isFinishedApiFixture(fixture: ApiFootballFixture) {
  return ["FT", "AET", "PEN"].includes(fixture.fixture.status.short);
}

export function isLiveApiFixture(fixture: ApiFootballFixture) {
  return ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"].includes(fixture.fixture.status.short);
}
