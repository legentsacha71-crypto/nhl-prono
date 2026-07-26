import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/apns";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId manquant" }, { status: 400 });
  }

  await sendPushToUser(userId, {
    title: "Test push",
    body: "Si tu vois cette bannière, les notifications fonctionnent !",
  });

  return NextResponse.json({ ok: true });
}
