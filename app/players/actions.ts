"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} es requerido`);
  return value;
}

export async function createPlayerAction(formData: FormData) {
  await requireAdmin();
  const name = getRequiredString(formData, "name");
  const username = getRequiredString(formData, "username").toLowerCase();
  const password = getRequiredString(formData, "password");
  const role = String(formData.get("role")) === Role.ADMIN ? Role.ADMIN : Role.PLAYER;

  await prisma.user.create({
    data: {
      name,
      username,
      password: await bcrypt.hash(password, 10),
      role,
    },
  });

  revalidatePath("/players");
}

export async function updatePlayerAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = getRequiredString(formData, "name");
  const username = getRequiredString(formData, "username").toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = String(formData.get("role")) === Role.ADMIN ? Role.ADMIN : Role.PLAYER;

  await prisma.user.update({
    where: { id },
    data: {
      name,
      username,
      role,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/players");
}

export async function deletePlayerAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === currentUser.id) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/players");
}
