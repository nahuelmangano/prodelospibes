import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { SubmitButton } from "@/components/actions";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f7f7f4_0%,#eef7f1_45%,#ffffff_100%)] px-4">
      <section className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-pitch text-white">
            <Trophy className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Prode Mundial Amigos</h1>
            <p className="text-sm text-gray-600">Ingresá con tu usuario.</p>
          </div>
        </div>

        {params.error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Usuario o contraseña incorrectos.
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block text-sm font-medium">
            Usuario
            <input
              name="username"
              className="mt-1 h-10 w-full rounded-md border border-line px-3 outline-none focus:border-pitch"
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Contraseña
            <input
              name="password"
              type="password"
              className="mt-1 h-10 w-full rounded-md border border-line px-3 outline-none focus:border-pitch"
              autoComplete="current-password"
              required
            />
          </label>
          <SubmitButton className="inline-flex h-10 w-full items-center justify-center rounded-md bg-pitch px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60">
            Ingresar
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
