import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";

export default async function PrizesPage() {
  const user = await requireUser();

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Premios</h1>
        <section className="mt-6 rounded-lg border border-line bg-white p-5">
          <p className="text-gray-600">Proximamente vamos a publicar los premios del prode.</p>
        </section>
      </main>
    </>
  );
}
