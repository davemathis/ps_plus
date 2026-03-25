import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSignedInUser } from "@/lib/signed-in-user";

export default async function Home() {
  const signedInUser = await getSignedInUser();
  const displayName = signedInUser?.displayName ?? "Not signed in";
  const email = signedInUser?.email ?? null;

  return (
    <DashboardShell
      displayName={displayName}
      email={email}
      title="Home"
      description="FTSC Customer Portal"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Welcome to FTSC Customer Portal</CardTitle>
            <CardDescription>
              This shell follows the Rosterwell dashboard pattern: collapsible sidebar, card top bar, Outfit typography, and the same Radix-based shadcn component style.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              Azure App Service gives you the signed-in login identity in request headers. When Entra also sends name claims, this page prefers those values for the user menu.
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-background p-4 shadow-sm">
                <div className="text-sm font-medium">Auth source</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">Entra ID</div>
                <div className="mt-1 text-xs text-muted-foreground">Azure App Service headers</div>
              </div>
              <div className="rounded-lg border bg-background p-4 shadow-sm">
                <div className="text-sm font-medium">Theme control</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">Built in</div>
                <div className="mt-1 text-xs text-muted-foreground">Light, dark, and system</div>
              </div>
              <div className="rounded-lg border bg-background p-4 shadow-sm">
                <div className="text-sm font-medium">Runtime mode</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">Server aware</div>
                <div className="mt-1 text-xs text-muted-foreground">Claims parsed on the server</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>User identity</CardTitle>
            <CardDescription>
              Values resolved from App Service authentication headers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Display name
              </div>
              <div className="mt-2 text-base font-medium">{displayName}</div>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Email or login
              </div>
              <div className="mt-2 break-all text-sm text-muted-foreground">
                {email ?? "Unavailable in local development"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
