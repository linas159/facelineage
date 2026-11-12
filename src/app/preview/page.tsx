import { redirect } from "next/navigation";
import { getLocale, localized } from "@/lib/i18n/server";

// Old route — the new funnel goes straight to /sign-up after /analyzing,
// then /paywall. No free preview teaser anymore.
export default async function PreviewRedirect() {
  redirect(localized("/sign-up", await getLocale()));
}
