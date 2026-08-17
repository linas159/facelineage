import type { NextRequest } from "next/server";
import { handlePreventNotification } from "@/lib/prevent/notifications";

/**
 * POST /api/prevent/mastercard/notifications
 *
 * Merchanto posts here whenever a Mastercard Clarity case changes state.
 * Same payload shape as the Visa notification webhook — see
 * `handlePreventNotification`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  return handlePreventNotification(req, "mastercard");
}
