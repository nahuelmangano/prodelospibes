const BASE_URL = process.env.WORLDCUP26_API_URL ?? "https://worldcup26.ir";

export type WorldCup26Game = {
  id: string;
  home_score: string | null;
  away_score: string | null;
  finished: string;
  time_elapsed: string | null;
  home_team_name_en: string;
  away_team_name_en: string;
};

type WorldCup26GamesResponse = {
  games: WorldCup26Game[];
};

export async function fetchWorldCup26Games() {
  const response = await fetch(`${BASE_URL}/get/games`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`worldcup26.ir respondió ${response.status}.`);
  }

  const data = (await response.json()) as WorldCup26GamesResponse;
  return data.games;
}

export function isFinishedWorldCup26Game(game: WorldCup26Game) {
  return game.finished.toUpperCase() === "TRUE" || game.time_elapsed === "finished";
}

export function isLiveWorldCup26Game(game: WorldCup26Game) {
  const elapsed = game.time_elapsed?.toLowerCase();
  return elapsed === "live" || elapsed === "halftime" || elapsed === "ht" || /^\d+'?$/.test(elapsed ?? "");
}

export function parseWorldCup26Score(value: string | null) {
  if (value === null || value === "null" || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}
