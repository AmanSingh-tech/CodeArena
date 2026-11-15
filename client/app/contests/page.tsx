"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { PageHeader } from "@/components/judge-ui"

interface Contest {
  id: number
  name: string
  start: Date
  durationMinutes: number
  live: boolean
}

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const formatStart = (date: Date) =>
  date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContests() {
      try {
        const res = await fetch("https://codeforces.com/api/contest.list")
        if (!res.ok) throw new Error("Failed to fetch contests")
        const data = await res.json()
        if (data.status !== "OK") throw new Error("Codeforces returned an error")

        // Only what is running or still to come, soonest first.
        const upcoming: Contest[] = data.result
          .filter((c: any) => c.phase === "BEFORE" || c.phase === "CODING")
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            start: new Date(c.startTimeSeconds * 1000),
            durationMinutes: Math.round(c.durationSeconds / 60),
            live: c.phase === "CODING",
          }))
          .sort((a: Contest, b: Contest) => a.start.getTime() - b.start.getTime())

        setContests(upcoming)
      } catch (err: any) {
        setError(err.message || "Could not load contests")
      } finally {
        setLoading(false)
      }
    }
    fetchContests()
  }, [])

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="min-h-[calc(100vh-3rem)] flex-1 bg-background px-5 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <PageHeader title="Contests" description="Upcoming Codeforces rounds, in your local time." />

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-b border-border py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </div>
              ))
            ) : error ? (
              <p className="text-sm text-muted-foreground">{error}</p>
            ) : contests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming contests right now.</p>
            ) : (
              contests.map((contest) => (
                <a
                  key={contest.id}
                  href={`https://codeforces.com/contests/${contest.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-border py-3 text-sm sm:grid-cols-[1fr_11rem_4rem]"
                >
                  <span className="truncate text-foreground underline-offset-4 group-hover:underline">
                    {contest.name}
                    {contest.live && <span className="ml-2 text-xs text-verdict-ac">live</span>}
                  </span>
                  <span className="tabular text-right text-xs text-muted-foreground sm:text-left">{formatStart(contest.start)}</span>
                  <span className="tabular hidden text-right text-xs text-muted-foreground sm:block">
                    {formatDuration(contest.durationMinutes)}
                  </span>
                </a>
              ))
            )}
          </div>
        </main>
      </SidebarInset>
    </>
  )
}
