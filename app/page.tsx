import { headers } from "next/headers";
import { HomeIcon, Menu, ShieldCheck, UserRound } from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ClientPrincipalClaim = {
  typ?: string;
  val?: string;
};

type ClientPrincipal = {
  userDetails?: string;
  userRoles?: string[];
  claims?: ClientPrincipalClaim[];
};

type SignedInUser = {
  displayName: string;
  email: string | null;
};

function decodeClientPrincipal(encodedValue: string): ClientPrincipal | null {
  try {
    const json = Buffer.from(encodedValue, "base64").toString("utf-8");
    return JSON.parse(json) as ClientPrincipal;
  } catch {
    return null;
  }
}

function getClaimValue(principal: ClientPrincipal, claimTypes: string[]) {
  const matchingClaim = principal.claims?.find((claim) =>
    claim.typ ? claimTypes.includes(claim.typ) : false
  );

  return matchingClaim?.val?.trim() || null;
}

function buildDisplayName(principal: ClientPrincipal, principalName: string | null) {
  const givenName = getClaimValue(principal, [
    "given_name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  ]);
  const familyName = getClaimValue(principal, [
    "family_name",
    "surname",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  ]);
  const fullName = getClaimValue(principal, [
    "name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  ]);

  if (givenName || familyName) {
    return [givenName, familyName].filter(Boolean).join(" ");
  }

  return fullName ?? principal.userDetails ?? principalName ?? "Not signed in";
}

function buildEmail(principal: ClientPrincipal, principalName: string | null) {
  const emailClaim = getClaimValue(principal, [
    "email",
    "emails",
    "preferred_username",
    "upn",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
  ]);

  return emailClaim ?? principalName ?? principal.userDetails ?? null;
}

async function getSignedInUser(): Promise<SignedInUser | null> {
  const requestHeaders = await headers();
  const principalName = requestHeaders.get("x-ms-client-principal-name");
  const encodedPrincipal = requestHeaders.get("x-ms-client-principal");

  if (encodedPrincipal) {
    const principal = decodeClientPrincipal(encodedPrincipal);

    if (principal) {
      return {
        displayName: buildDisplayName(principal, principalName),
        email: buildEmail(principal, principalName),
      };
    }
  }

  if (!principalName) {
    return null;
  }

  return {
    displayName: principalName,
    email: principalName,
  };
}

export default async function Home() {
  const signedInUser = await getSignedInUser();
  const displayName = signedInUser?.displayName ?? "Not signed in";
  const email = signedInUser?.email ?? null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center px-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
              <Menu className="size-5" />
            </div>
            <span className="text-base font-semibold text-sidebar-foreground">
              PS Plus
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-4 p-4">
          <div className="space-y-1">
            <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Workspace
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground">
              <HomeIcon className="size-4" />
              Home
            </div>
          </div>
          <div className="space-y-1">
            <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Identity
            </div>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground">
              <UserRound className="size-4" />
              Entra profile
            </div>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground">
              <ShieldCheck className="size-4" />
              App Service auth
            </div>
          </div>
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="hidden h-16 items-center gap-4 border-b bg-card px-6 md:flex">
          <div className="flex-1" />
          <div className="max-w-[220px] truncate text-sm text-muted-foreground">
            {email ?? "Local development"}
          </div>
          <UserMenu displayName={displayName} email={email} />
        </header>
        <main className="flex-1 bg-background px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                App Service authenticated workspace
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>Welcome to PS Plus</CardTitle>
                  <CardDescription>
                    This shell now follows the Rosterwell structure more closely: fixed-width sidebar, card top bar, Outfit typography, and the same Radix-based shadcn component style.
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
          </div>
        </main>
      </div>
    </div>
  );
}
