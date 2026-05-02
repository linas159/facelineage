import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  return (
    <FunnelShell>
      <div className="pt-12">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">
          Account
        </p>
        <h1 className="mb-12 font-display text-4xl">Your account</h1>

        <Card className="mb-6">
          <CardTitle className="mb-1">Profile</CardTitle>
          <CardDescription className="mb-6">user@example.com</CardDescription>
          <Button variant="secondary" size="sm">Edit profile</Button>
        </Card>

        <Card className="mb-6">
          <CardTitle className="mb-1">Subscription</CardTitle>
          <CardDescription className="mb-6">
            Active · 7-Day Access · renews $24.99/week on May 12
          </CardDescription>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm">Manage in Stripe Portal</Button>
            <Button variant="ghost" size="sm">Cancel subscription</Button>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-1">Privacy</CardTitle>
          <CardDescription className="mb-6">
            Your photos are auto-deleted 30 days after upload. You can delete them sooner here.
          </CardDescription>
          <Button variant="ghost" size="sm">Delete all my data</Button>
        </Card>
      </div>
    </FunnelShell>
  );
}
