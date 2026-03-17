import { headers } from "next/headers";

type ClientPrincipal = {
  userDetails?: string;
  userRoles?: string[];
};

function decodeClientPrincipal(encodedValue: string): ClientPrincipal | null {
  try {
    const json = Buffer.from(encodedValue, "base64").toString("utf-8");
    return JSON.parse(json) as ClientPrincipal;
  } catch {
    return null;
  }
}

async function getSignedInUser() {
  const requestHeaders = await headers();
  const principalName = requestHeaders.get("x-ms-client-principal-name");

  if (principalName) {
    return principalName;
  }

  const encodedPrincipal = requestHeaders.get("x-ms-client-principal");

  if (!encodedPrincipal) {
    return null;
  }

  const principal = decodeClientPrincipal(encodedPrincipal);
  return principal?.userDetails ?? null;
}

export default async function Home() {
  const signedInUser = await getSignedInUser();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold tracking-tight">PS Plus</div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
            {signedInUser ?? "Not signed in"}
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl items-center px-6 py-16">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Azure App Service
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Welcome to PS Plus
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            This page reads the signed-in user from the authentication headers
            added by Azure App Service after Entra ID login.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            In local development those headers are usually not present, so the
            header falls back to a neutral placeholder.
          </p>
        </section>
      </main>
    </div>
  );
}
