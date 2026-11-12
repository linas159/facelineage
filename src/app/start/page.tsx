import { redirect } from "next/navigation";
import { getLocale, localized } from "@/lib/i18n/server";

// Old route — funnel was reordered. /start is now /quiz/1 (quiz first, photo after).
export default async function StartRedirect() {
  redirect(localized("/quiz/1", await getLocale()));
}
