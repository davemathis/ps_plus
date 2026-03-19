"use client"

import { useState } from "react"
import { HomeIcon, Menu, ShieldCheck, UserRound } from "lucide-react"

import { UserMenu } from "@/components/user-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DashboardShell({
  displayName,
  email,
}: {
  displayName: string
  email: string | null
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isCollapsed = !sidebarOpen

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } hidden border-r border-sidebar-border bg-sidebar transition-all duration-300 md:flex md:flex-col`}
      >
        <div className={`flex h-16 items-center ${isCollapsed ? "px-2" : "px-4"}`}>
          <div
            className={`flex flex-1 items-center gap-2 ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="h-10 w-10 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Menu className="size-5" />
            </Button>
            {!isCollapsed ? (
              <span className="text-base font-semibold text-sidebar-foreground">
                PS Plus
              </span>
            ) : null}
          </div>
        </div>
        <nav className={`flex-1 space-y-4 ${isCollapsed ? "p-2" : "p-4"}`}>
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Workspace
              </div>
            ) : null}
            <div
              className={`flex items-center gap-3 rounded-lg bg-sidebar-accent text-sm text-sidebar-accent-foreground ${
                isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              }`}
            >
              <HomeIcon className="size-4" />
              {!isCollapsed ? "Home" : null}
            </div>
          </div>
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Identity
              </div>
            ) : null}
            <div
              className={`flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground ${
                isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              }`}
            >
              <UserRound className="size-4" />
              {!isCollapsed ? "Entra profile" : null}
            </div>
            <div
              className={`flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground ${
                isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              }`}
            >
              <ShieldCheck className="size-4" />
              {!isCollapsed ? "App Service auth" : null}
            </div>
          </div>
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="hidden h-16 items-center gap-4 border-b bg-card px-6 md:flex">
          <div className="flex-1" />
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
          </div>
        </main>
      </div>
    </div>
  )
}
