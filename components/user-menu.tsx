"use client"

import { useEffect, useState } from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ThemeOption = "light" | "dark" | "system"

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "?"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function UserMenu({
  displayName,
  email,
}: {
  displayName: string
  email?: string | null
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const selectedTheme = mounted ? ((theme ?? "system") as ThemeOption) : "system"
  const initials = getInitials(displayName)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials}
          </div>
          <span className="max-w-44 truncate text-sm">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button
              type="button"
              size="icon"
              variant={selectedTheme === "light" ? "secondary" : "ghost"}
              className="h-8 w-8"
              onClick={() => setTheme("light")}
            >
              <Sun className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={selectedTheme === "dark" ? "secondary" : "ghost"}
              className="h-8 w-8"
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={selectedTheme === "system" ? "secondary" : "ghost"}
              className="h-8 w-8"
              onClick={() => setTheme("system")}
            >
              <Monitor className="size-4" />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="flex-col items-start gap-1">
          <Check />
          <span>Signed in with Entra ID</span>
          {email ? <span className="text-xs text-muted-foreground">{email}</span> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
