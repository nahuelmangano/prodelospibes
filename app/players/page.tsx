import { Role } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/actions";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPlayerAction, deletePlayerAction, updatePlayerAction } from "./actions";

export default async function PlayersPage() {
  const user = await requireAdmin();
  const players = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Jugadores</h1>

        <section className="mt-6 rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-lg font-bold">Crear jugador</h2>
          <form action={createPlayerAction} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <input name="name" placeholder="Nombre" className="h-10 rounded-md border border-line px-3" required />
            <input name="username" placeholder="Usuario" className="h-10 rounded-md border border-line px-3" required />
            <input name="password" placeholder="Contraseña" type="password" className="h-10 rounded-md border border-line px-3" required />
            <select name="role" className="h-10 rounded-md border border-line px-3">
              <option value={Role.PLAYER}>PLAYER</option>
              <option value={Role.ADMIN}>ADMIN</option>
            </select>
            <SubmitButton>Crear</SubmitButton>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold">Listado</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {players.map((player) => (
              <form key={player.id} action={updatePlayerAction} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
                <input type="hidden" name="id" value={player.id} />
                <input name="name" defaultValue={player.name} className="h-10 rounded-md border border-line px-3" required />
                <input name="username" defaultValue={player.username} className="h-10 rounded-md border border-line px-3" required />
                <input name="password" placeholder="Nueva contraseña" type="password" className="h-10 rounded-md border border-line px-3" />
                <select name="role" defaultValue={player.role} className="h-10 rounded-md border border-line px-3">
                  <option value={Role.PLAYER}>PLAYER</option>
                  <option value={Role.ADMIN}>ADMIN</option>
                </select>
                <SubmitButton>Guardar</SubmitButton>
                <button
                  formAction={deletePlayerAction}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 px-3 text-red-700 hover:bg-red-50 disabled:opacity-60"
                  disabled={player.id === user.id}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
