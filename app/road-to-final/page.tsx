import Image from "next/image";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TeamInfo = {
  flagEmoji: string;
  name: string;
};

type KnockoutMatch = {
  apiFootballFixtureId: number | null;
  stage: string;
  matchDate: Date;
  homeScore: number | null;
  awayScore: number | null;
  isFinished: boolean;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  stadium: { name: string; city: string } | null;
};

type TooltipAlign = "left" | "center" | "right";
type TooltipSide = "top" | "bottom";

const roundOf32Pairs = [
  { matchNum: 73, teams: ["Canada", "South Africa"] },
  { matchNum: 74, teams: ["Paraguay", "Germany"] },
  { matchNum: 75, teams: ["Netherlands", "Morocco"] },
  { matchNum: 76, teams: ["Brazil", "Japan"] },
  { matchNum: 77, teams: ["Sweden", "France"] },
  { matchNum: 78, teams: ["Ireland", "Norway"] },
  { matchNum: 79, teams: ["Mexico", "Ecuador"] },
  { matchNum: 80, teams: ["England", "DR Congo"] },
  { matchNum: 81, teams: ["Switzerland", "Algeria"] },
  { matchNum: 82, teams: ["Colombia", "Ghana"] },
  { matchNum: 83, teams: ["Argentina", "Cape Verde"] },
  { matchNum: 84, teams: ["Australia", "Egypt"] },
  { matchNum: 85, teams: ["USA", "Bosnia & Herzegovina"] },
  { matchNum: 86, teams: ["Portugal", "Croatia"] },
  { matchNum: 87, teams: ["Senegal", "Belgium"] },
  { matchNum: 88, teams: ["Spain", "Austria"] },
] as const;

const teamHotspots = [
  { team: "Paraguay", left: 37.9, top: 17.2, matchNum: 74 },
  { team: "Germany", left: 45.8, top: 15.7, matchNum: 74 },
  { team: "Brazil", left: 53.4, top: 15.7, matchNum: 76 },
  { team: "Japan", left: 63.2, top: 15.8, matchNum: 76 },
  { team: "France", left: 30.1, top: 18.4, matchNum: 77 },
  { team: "Ireland", left: 70.6, top: 18.5, matchNum: 78 },
  { team: "Sweden", left: 23.9, top: 21.7, matchNum: 77 },
  { team: "Norway", left: 77.8, top: 21.7, matchNum: 78 },
  { team: "South Africa", left: 16.9, top: 25.4, matchNum: 73 },
  { team: "Mexico", left: 83.9, top: 26.8, matchNum: 79 },
  { team: "Canada", left: 12, top: 30.8, matchNum: 73 },
  { team: "Ecuador", left: 88.3, top: 31.1, matchNum: 79 },
  { team: "Netherlands", left: 7.6, top: 37.4, matchNum: 75 },
  { team: "England", left: 91.5, top: 37.8, matchNum: 80 },
  { team: "Morocco", left: 6.7, top: 44, matchNum: 75 },
  { team: "DR Congo", left: 91.3, top: 44.1, matchNum: 80 },
  { team: "Portugal", left: 9.5, top: 51.3, matchNum: 86 },
  { team: "Argentina", left: 91.5, top: 50.4, matchNum: 83 },
  { team: "Croatia", left: 11.6, top: 56.7, matchNum: 86 },
  { team: "Cape Verde", left: 88.9, top: 56.9, matchNum: 83 },
  { team: "Spain", left: 11.6, top: 62.7, matchNum: 88 },
  { team: "Australia", left: 82.9, top: 62.5, matchNum: 84 },
  { team: "Austria", left: 15.1, top: 69, matchNum: 88 },
  { team: "Egypt", left: 77.1, top: 67.4, matchNum: 84 },
  { team: "USA", left: 22.3, top: 71.9, matchNum: 85 },
  { team: "Switzerland", left: 70.8, top: 70.8, matchNum: 81 },
  { team: "Bosnia & Herzegovina", left: 32.6, top: 74.5, matchNum: 85 },
  { team: "Algeria", left: 65.9, top: 74.9, matchNum: 81 },
  { team: "Belgium", left: 39.1, top: 76.3, matchNum: 87 },
  { team: "Senegal", left: 45.9, top: 77.8, matchNum: 87 },
  { team: "Ghana", left: 53, top: 77.8, matchNum: 82 },
  { team: "Colombia", left: 60.3, top: 77.9, matchNum: 82 },
] as const;

const winnerSlots = [
  { matchNum: 74, left: 41, top: 25.1 },
  { matchNum: 77, left: 34.8, top: 28.8 },
  { matchNum: 73, left: 25.4, top: 38.2 },
  { matchNum: 75, left: 18.4, top: 44.6 },
  { matchNum: 76, left: 53.1, top: 25.1 },
  { matchNum: 78, left: 65.4, top: 28.6 },
  { matchNum: 79, left: 76.4, top: 38.3 },
  { matchNum: 80, left: 82.5, top: 44.6 },
  { matchNum: 83, left: 80.6, top: 51.8 },
  { matchNum: 84, left: 72.8, top: 58 },
  { matchNum: 81, left: 69.4, top: 63.6 },
  { matchNum: 82, left: 63.1, top: 70.5 },
  { matchNum: 86, left: 18.6, top: 52.7 },
  { matchNum: 88, left: 25.4, top: 63.7 },
  { matchNum: 85, left: 34.8, top: 70.8 },
  { matchNum: 87, left: 41, top: 73.8 },
  { matchNum: 89, left: 45.5, top: 32.4 },
  { matchNum: 90, left: 37.3, top: 39.2 },
  { matchNum: 91, left: 54.8, top: 32.4 },
  { matchNum: 92, left: 63.1, top: 39.2 },
  { matchNum: 93, left: 72.7, top: 57.2 },
  { matchNum: 94, left: 63, top: 64.6 },
  { matchNum: 95, left: 27.9, top: 57.2 },
  { matchNum: 96, left: 37.2, top: 64.6 },
  { matchNum: 97, left: 44.6, top: 45.2 },
  { matchNum: 98, left: 55.4, top: 45.2 },
  { matchNum: 99, left: 55.4, top: 58.9 },
  { matchNum: 100, left: 44.6, top: 58.9 },
  { matchNum: 101, left: 49.5, top: 50.5 },
  { matchNum: 102, left: 50.5, top: 56.2 },
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function getWinner(match: KnockoutMatch | undefined): TeamInfo | null {
  if (!match?.isFinished || match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore === match.awayScore) return null;

  return match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam;
}

function getTooltipAlign(left: number): TooltipAlign {
  if (left < 24) return "left";
  if (left > 76) return "right";

  return "center";
}

function getTooltipSide(top: number): TooltipSide {
  return top < 28 ? "bottom" : "top";
}

function MatchTooltip({
  align = "center",
  match,
  side = "top",
  title,
}: {
  align?: TooltipAlign;
  match: KnockoutMatch | undefined;
  side?: TooltipSide;
  title: string;
}) {
  const alignClass =
    align === "left" ? "left-0 translate-x-0" : align === "right" ? "right-0 translate-x-0" : "left-1/2 -translate-x-1/2";
  const sideClass = side === "bottom" ? "top-full mt-2" : "bottom-full mb-2";

  return (
    <span
      className={`${alignClass} ${sideClass} pointer-events-none absolute z-20 hidden w-56 max-w-[calc(100vw-2rem)] rounded-md bg-ink px-3 py-2 text-left text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block sm:w-64`}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-1 block">{match ? formatDate(match.matchDate) : "Fecha a confirmar"}</span>
      {match?.stadium ? (
        <span className="mt-1 block text-gray-300">
          {match.stadium.name} - {match.stadium.city}
        </span>
      ) : null}
    </span>
  );
}

export default async function RoadToFinalPage() {
  const user = await requireUser();
  const knockoutMatches = await prisma.match.findMany({
    where: {
      stage: {
        in: ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Match for third place", "Final"],
      },
    },
    include: { homeTeam: true, awayTeam: true, stadium: true },
    orderBy: [{ matchDate: "asc" }, { id: "asc" }],
  });
  const matchesByNum = new Map(
    knockoutMatches.flatMap((match) => (match.apiFootballFixtureId ? [[match.apiFootballFixtureId, match]] : [])),
  );
  const finalMatch = knockoutMatches.find((match) => match.stage === "Final");
  const champion = getWinner(finalMatch);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Road to FINAL</h1>
        <section className="mt-6 rounded-lg border border-line bg-white p-3 sm:p-5">
          <div className="relative">
            <Image
              src="/road-to-final.jpeg"
              alt="Road to FINAL World Cup 2026"
              width={1536}
              height={2048}
              priority
              className="h-auto w-full rounded-md"
            />
            {teamHotspots.map((hotspot) => {
              const match = matchesByNum.get(hotspot.matchNum);
              const pair = roundOf32Pairs.find((item) => item.matchNum === hotspot.matchNum);
              const opponent = pair?.teams.find((team) => team !== hotspot.team);

              return (
                <button
                  key={hotspot.team}
                  type="button"
                  aria-label={`${hotspot.team}: ${match ? formatDate(match.matchDate) : "partido a confirmar"}`}
                  className="group absolute h-[5.5%] w-[7.5%] -translate-x-1/2 -translate-y-1/2 rounded-full outline-none hover:ring-2 hover:ring-pitch hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-pitch focus-visible:ring-offset-2"
                  style={{ left: `${hotspot.left}%`, top: `${hotspot.top}%` }}
                >
                  <MatchTooltip
                    align={getTooltipAlign(hotspot.left)}
                    match={match}
                    side={getTooltipSide(hotspot.top)}
                    title={`${hotspot.team} vs ${opponent ?? "A confirmar"}`}
                  />
                </button>
              );
            })}
            {winnerSlots.map((slot) => {
              const match = matchesByNum.get(slot.matchNum);
              const winner = getWinner(match);
              if (!winner) return null;

              return (
                <button
                  key={slot.matchNum}
                  type="button"
                  aria-label={`Ganador del partido ${slot.matchNum}: ${winner.name}`}
                  className="group absolute flex h-[4.7%] w-[4.7%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[clamp(0.8rem,2vw,1.6rem)] shadow-md ring-1 ring-line outline-none hover:ring-2 hover:ring-pitch focus-visible:ring-2 focus-visible:ring-pitch"
                  style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
                >
                  <span aria-hidden="true">{winner.flagEmoji}</span>
                  <MatchTooltip
                    align={getTooltipAlign(slot.left)}
                    match={match}
                    side={getTooltipSide(slot.top)}
                    title={`Ganador: ${winner.name}`}
                  />
                </button>
              );
            })}
            {champion ? (
              <button
                type="button"
                aria-label={`Campeon: ${champion.name}`}
                className="group absolute flex h-[6%] w-[6%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[clamp(1rem,2.4vw,2rem)] shadow-lg ring-2 ring-pitch outline-none focus-visible:ring-4"
                style={{ left: "50%", top: "47.5%" }}
              >
                <span aria-hidden="true">{champion.flagEmoji}</span>
                <MatchTooltip match={finalMatch} title={`Campeon: ${champion.name}`} />
              </button>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
