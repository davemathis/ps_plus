"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import { Database, HomeIcon, Menu, ShieldCheck, Table2, UserRound } from "lucide-react"

import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DashboardShellProps = {
  displayName: string
  email: string | null
  title: string
  description: string
  children: ReactNode
}

const workspaceLinks = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/customers", label: "Invoices", icon: Database },
  { href: "/table-browser", label: "Table Browser", icon: Table2 },
]

const identityItems = [
  { label: "Entra profile", icon: UserRound },
  { label: "App Service auth", icon: ShieldCheck },
]

export function DashboardShell({
  displayName,
  email,
  title,
  description,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
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
            <span
              className={`overflow-hidden whitespace-nowrap text-base font-semibold text-sidebar-foreground transition-all duration-300 ${
                isCollapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100"
              }`}
            >
              FTSC Customer Portal
            </span>
          </div>
        </div>
        <nav className={`flex-1 space-y-4 ${isCollapsed ? "p-2" : "p-4"}`}>
          <div className="space-y-1">
            <div
              className={`overflow-hidden px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 ${
                isCollapsed ? "max-h-0 opacity-0" : "max-h-6 opacity-100"
              }`}
            >
              Workspace
            </div>
            {workspaceLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm transition-colors",
                    isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="space-y-1">
            <div
              className={`overflow-hidden px-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 ${
                isCollapsed ? "max-h-0 opacity-0" : "max-h-6 opacity-100"
              }`}
            >
              Identity
            </div>
            {identityItems.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground ${
                  isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? "max-w-0 opacity-0" : "max-w-36 opacity-100"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
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
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
