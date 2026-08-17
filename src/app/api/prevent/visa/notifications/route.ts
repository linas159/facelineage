import type { NextRequest } from "next/server";
import { handlePreventNotification } from "@/lib/prevent/notifications";

/**
 * POST /api/prevent/visa/notifications
 *
 * Merchanto posts here whenever a Visa case changes state (deflected,
 * escalated, or reopened). Optional per the integration guide, but without it
 * the only way to learn a case escalated is to watch the dashboard by hand.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  return handlePreventNotification(req, "visa");
}
