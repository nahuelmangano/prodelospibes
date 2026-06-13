import Link from "next/link";
import { ClipboardCheck, LogOut, Trophy, Users, CalendarDays } from "lucide-react";
import { Role } from "@prisma/client";
import { logoutAction } from "@/app/login/actions";

type NavProps = {
  user: {
    name: string;
    role: Role;
  };
};

export function Nav({ user }: NavProps) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-lg font-bold leading-tight text-ink">
          <Trophy className="h-5 w-5 shrink-0 text-pitch" />
          <span className="min-w-0 break-words">Prode Mundial Amigos</span>
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm sm:justify-end sm:gap-2">
          <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" href="/matches">
            <CalendarDays className="h-4 w-4 shrink-0" />
            Partidos
          </Link>
          {user.role === Role.ADMIN ? (
            <>
              <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" href="/admin/predictions">
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                Predicciones
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" href="/players">
                <Users className="h-4 w-4 shrink-0" />
                Jugadores
              </Link>
            </>
          ) : null}
          <span className="max-w-full truncate rounded-md bg-gray-100 px-3 py-2 font-medium sm:max-w-44">{user.name}</span>
          <form action={logoutAction}>
            <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" title="Salir">
              <LogOut className="h-4 w-4 shrink-0" />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
