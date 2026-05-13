import { redirect } from "next/navigation";

// Old route — funnel was reordered. /start is now /quiz/1 (quiz first, photo after).
export default function StartRedirect() {
  redirect("/quiz/1");
}
