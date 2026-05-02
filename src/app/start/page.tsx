import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function StartPage() {
  return (
    <FunnelShell>
      <div className="pt-12 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">
          Step 1 of 4
        </p>
        <h1 className="mb-6">Begin with your photo.</h1>
        <p className="mx-auto mb-12 max-w-xl text-[var(--color-ivory-muted)]">
          A clear, front-facing photo gives the most accurate reading. Your photo is
          encrypted, never shared, and auto-deleted after 30 days.
        </p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Upload zone placeholder */}
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border-gold)]">
            <span className="font-display text-5xl text-[var(--color-gold)]">+</span>
          </div>
          <CardTitle className="mb-2">Upload your photo</CardTitle>
          <CardDescription className="mb-8 max-w-sm">
            Drag &amp; drop, or click to browse. JPG, PNG, or HEIC up to 10 MB.
          </CardDescription>
          <Link href="/quiz/1">
            <Button size="lg">Continue (placeholder)</Button>
          </Link>
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[var(--color-muted)]">
        <span>🔒 End-to-end encrypted</span>
        <span>·</span>
        <span>🗑 Auto-deleted in 30 days</span>
        <span>·</span>
        <span>🚫 Never shared or sold</span>
      </div>
    </FunnelShell>
  );
}
