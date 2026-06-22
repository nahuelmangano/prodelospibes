import { Role } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/actions";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPrizeAction, deletePrizeAction, updatePrizeAction } from "./actions";

export default async function PrizesPage() {
  const user = await requireUser();
  const prizes = await prisma.prize.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const isAdmin = user.role === Role.ADMIN;

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Premios</h1>

        {isAdmin ? (
          <section className="mt-6 rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Agregar premio</h2>
            <form action={createPrizeAction} className="grid gap-3 lg:grid-cols-[6rem_1fr_2fr_auto]">
              <input
                name="sortOrder"
                type="number"
                placeholder="Orden"
                className="h-10 rounded-md border border-line px-3"
                defaultValue={prizes.length + 1}
                required
              />
              <input name="title" placeholder="Titulo" className="h-10 rounded-md border border-line px-3" required />
              <input name="description" placeholder="Descripcion" className="h-10 rounded-md border border-line px-3" />
              <SubmitButton>Agregar</SubmitButton>
            </form>
          </section>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
          {prizes.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {prizes.map((prize) =>
                isAdmin ? (
                  <form key={prize.id} action={updatePrizeAction} className="grid gap-3 px-5 py-4 lg:grid-cols-[6rem_1fr_2fr_auto_auto]">
                    <input type="hidden" name="id" value={prize.id} />
                    <input name="sortOrder" type="number" defaultValue={prize.sortOrder} className="h-10 rounded-md border border-line px-3" required />
                    <input name="title" defaultValue={prize.title} className="h-10 rounded-md border border-line px-3" required />
                    <input name="description" defaultValue={prize.description ?? ""} className="h-10 rounded-md border border-line px-3" />
                    <SubmitButton>Guardar</SubmitButton>
                    <button
                      formAction={deletePrizeAction}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 px-3 text-red-700 hover:bg-red-50 disabled:opacity-60"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <article key={prize.id} className="px-5 py-4">
                    <h2 className="text-lg font-bold">{prize.title}</h2>
                    {prize.description ? <p className="mt-1 text-gray-600">{prize.description}</p> : null}
                  </article>
                ),
              )}
            </div>
          ) : (
            <p className="p-5 text-gray-600">Proximamente vamos a publicar los premios del prode.</p>
          )}
        </section>
      </main>
    </>
  );
}
