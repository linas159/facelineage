import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  // Placeholder — wire to Supabase analyses query
  const reports = [
    { id: "demo", topRegion: "Northern European", pct: 72, date: "Today" },
  ];

  return (
    <FunnelShell>
      <div className="flex items-end justify-between pt-12">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">
            My library
          </p>
          <h1 className="font-display text-4xl">Your reports</h1>
        </div>
        <Link href="/start">
          <Button size="md">+ New analysis</Button>
        </Link>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.id} href={`/report/${r.id}`}>
            <Card className="cursor-pointer transition-all hover:border-[var(--color-gold)]">
              <CardTitle className="mb-2">{r.topRegion}</CardTitle>
              <CardDescription>{r.pct}% match · {r.date}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-16 flex justify-end">
        <Link href="/account">
          <Button variant="ghost" size="sm">Account & subscription →</Button>
        </Link>
      </div>
    </FunnelShell>
  );
}
