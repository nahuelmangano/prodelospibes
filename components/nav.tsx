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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ink">
          <Trophy className="h-5 w-5 text-pitch" />
          Prode Mundial Amigos
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" href="/matches">
            <CalendarDays className="h-4 w-4" />
            Partidos
          </Link>
          {user.role === Role.ADMIN ? (
            <>
              <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" href="/admin/predictions">
                <ClipboardCheck className="h-4 w-4" />
                Predicciones
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" href="/players">
                <Users className="h-4 w-4" />
                Jugadores
              </Link>
            </>
          ) : null}
          <span className="rounded-md bg-gray-100 px-3 py-2 font-medium">{user.name}</span>
          <form action={logoutAction}>
            <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100" title="Salir">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
