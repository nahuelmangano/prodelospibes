import Link from "next/link";
import { Check, X } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export default async function AdminPredictionsPage() {
  const user = await requireAdmin();
  const [players, matches] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PLAYER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.match.findMany({
      orderBy: { matchDate: "asc" },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          select: {
            playerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
  ]);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Predicciones cargadas</h1>
          <p className="mt-2 text-gray-600">Control administrativo de quién ya participó en cada partido.</p>
        </div>

        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="sticky left-0 z-10 min-w-72 border-b border-line bg-gray-50 px-4 py-3 font-semibold">Partido</th>
                  <th className="border-b border-line px-4 py-3 font-semibold">Fecha</th>
                  <th className="border-b border-line px-4 py-3 text-center font-semibold">Total</th>
                  {players.map((player) => (
                    <th key={player.id} className="min-w-28 border-b border-line px-4 py-3 text-center font-semibold">
                      {player.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {matches.map((match) => {
                  const predictionByPlayer = new Map(match.predictions.map((prediction) => [prediction.playerId, prediction]));

                  return (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-4 py-3">
                        <Link href={`/matches/${match.id}`} className="font-semibold hover:text-pitch hover:underline">
                          {match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}
                        </Link>
                        <p className="mt-1 text-xs text-gray-500">{match.stage}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(match.matchDate)}</td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {predictionByPlayer.size}/{players.length}
                      </td>
                      {players.map((player) => {
                        const prediction = predictionByPlayer.get(player.id);

                        return (
                          <td key={player.id} className="px-4 py-3 text-center">
                            {prediction ? (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700" title="Predicción cargada">
                                <Check className="h-4 w-4" />
                              </span>
                            ) : (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-400" title="Sin predicción">
                                <X className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
