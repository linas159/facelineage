import { redirect } from "next/navigation";

// Old route — the new funnel goes straight to /sign-up after /analyzing,
// then /paywall. No free preview teaser anymore.
export default function PreviewRedirect() {
  redirect("/sign-up");
}
