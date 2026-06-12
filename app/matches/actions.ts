"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canEditPrediction } from "@/lib/matches";
import { prisma } from "@/lib/prisma";
import { syncResultsFromApiFootball } from "@/lib/result-sync";
import { calculatePoints } from "@/lib/scoring";

export async function savePredictionAction(formData: FormData) {
  const user = await requireUser();
  const matchId = Number(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !canEditPrediction(match)) return;

  await prisma.prediction.upsert({
    where: { playerId_matchId: { playerId: user.id, matchId } },
    update: { homeScore, awayScore },
    create: { playerId: user.id, matchId, homeScore, awayScore },
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

export async function saveResultAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) return;

  const matchId = Number(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, isFinished: true },
    include: { predictions: true },
  });

  await Promise.all(
    match.predictions.map((prediction) =>
      prisma.prediction.update({
        where: { id: prediction.id },
        data: { points: calculatePoints(prediction, { homeScore, awayScore }) },
      }),
    ),
  );

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
}

export async function syncResultsAction() {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) return;

  try {
    await syncResultsFromApiFootball();
  } catch (error) {
    console.error("No se pudieron sincronizar resultados.", error);
  }
}
