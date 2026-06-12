import Link from "next/link";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, stadium: true },
    orderBy: { matchDate: "asc" },
  });

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Partidos</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {matches.map((match) => (
            <Link key={match.id} href={`/matches/${match.id}`} className="rounded-lg border border-line bg-white p-5 hover:border-pitch">
              <p className="text-sm font-semibold text-pitch">{match.stage}</p>
              <h2 className="mt-2 text-xl font-bold">
                {match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}
              </h2>
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
          ))}
        </div>
      </main>
    </>
  );
}
