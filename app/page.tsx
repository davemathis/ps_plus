import { headers } from "next/headers";

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold tracking-tight">PS Plus</div>
            <div className="text-sm text-muted-foreground">
              App Service authenticated workspace
            </div>
          </div>
          <UserMenu displayName={displayName} email={email} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Welcome to PS Plus</CardTitle>
            <CardDescription>
              The top-right menu shows the signed-in Entra user and lets them switch between light, dark, and system themes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-medium">Display name</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {displayName}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-medium">Email or login</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {email ?? "Unavailable in local development"}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              Azure App Service always gives a reliable login name when authentication is configured. First and last name can also be available through Entra claims in <code>x-ms-client-principal</code>, but that depends on which claims are issued for the signed-in account.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
