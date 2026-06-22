"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} es requerido`);
  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getInt(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

export async function createPrizeAction(formData: FormData) {
  await requireAdmin();

  await prisma.prize.create({
    data: {
      title: getRequiredString(formData, "title"),
      description: getOptionalString(formData, "description"),
      sortOrder: getInt(formData, "sortOrder"),
    },
  });

  revalidatePath("/prizes");
}

export async function updatePrizeAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  await prisma.prize.update({
    where: { id },
    data: {
      title: getRequiredString(formData, "title"),
      description: getOptionalString(formData, "description"),
      sortOrder: getInt(formData, "sortOrder"),
    },
  });

  revalidatePath("/prizes");
}

export async function deletePrizeAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));

  await prisma.prize.delete({ where: { id } });
  revalidatePath("/prizes");
}
