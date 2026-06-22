import { KeyRound } from "lucide-react";
import { SubmitButton } from "@/components/actions";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { changePasswordAction } from "./actions";
import { PasswordField } from "./password-field";

const errorMessages: Record<string, string> = {
  current: "La contraseña actual no es correcta.",
  mismatch: "La nueva contraseña y la confirmación no coinciden.",
  missing: "Completá todos los campos.",
  short: "La nueva contraseña debe tener al menos 6 caracteres.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] ?? "No se pudo cambiar la contraseña." : null;

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mi cuenta</h1>
          <p className="mt-2 text-gray-600">Cambiá tu contraseña de acceso.</p>
        </div>

        <section className="rounded-lg border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-pitch">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Contraseña</h2>
              <p className="text-sm text-gray-600">Usuario: {user.username}</p>
            </div>
          </div>

          {params.success ? (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Contraseña actualizada correctamente.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}

          <form action={changePasswordAction} className="grid gap-4">
            <PasswordField name="currentPassword" label="Contraseña actual" autoComplete="current-password" />
            <PasswordField name="newPassword" label="Nueva contraseña" autoComplete="new-password" minLength={6} />
            <PasswordField name="confirmPassword" label="Confirmar nueva contraseña" autoComplete="new-password" minLength={6} />

            <div>
              <SubmitButton>Cambiar contraseña</SubmitButton>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
