"use client"

import { Search, Sun, Moon, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    setMounted(true)
    try {
      setLoggedIn(!!localStorage.getItem("token"))
    } catch {}
  }, [])

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/practice?q=${encodeURIComponent(q)}` : "/practice")
  }

  const logout = () => {
    try {
      localStorage.removeItem("token")
    } catch {}
    setLoggedIn(false)
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 flex h-12 flex-shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <SidebarTrigger className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground" />

      <form onSubmit={search} className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search problems"
          className="h-8 w-full rounded-md bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:bg-muted focus:outline-none"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        {mounted && loggedIn && (
          <>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Link href="/profile" aria-label="Profile">
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={logout}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}

        {mounted && !loggedIn && (
          <>
            <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="h-8 px-3 text-sm">
              <Link href="/register">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
