"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function changePasswordAction(formData: FormData) {
  const currentUser = await requireUser();
  const currentPassword = getString(formData, "currentPassword");
  const newPassword = getString(formData, "newPassword");
  const confirmPassword = getString(formData, "confirmPassword");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/account?error=missing");
  }

  if (newPassword.length < 6) {
    redirect("/account?error=short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/account?error=mismatch");
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { password: true },
  });

  if (!user) redirect("/login");

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    redirect("/account?error=current");
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });

  redirect("/account?success=1");
}
