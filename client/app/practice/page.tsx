"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, CheckCircle2, CircleDashed, Circle, WifiOff } from "lucide-react"
import { createProblem, getProblems, getStoredToken, getUserSubmissions } from "@/lib/api"
import { getAllProblems } from "@/lib/problems-data"
import { DifficultyLabel, PageHeader, StatTile } from "@/components/judge-ui"
import { normalizeDifficulty, type Difficulty } from "@/lib/judge"
import { cn } from "@/lib/utils"

interface ProblemRow {
  id: string
  title: string
  difficulty: Difficulty
  tags: string[]
}

type Status = "solved" | "attempted" | "todo"

const DIFFICULTIES: Array<"all" | Difficulty> = ["all", "Easy", "Medium", "Hard"]

// Bundled problems, shown only when the judge API cannot be reached.
const SAMPLE_PROBLEMS: ProblemRow[] = getAllProblems().map((p) => ({
  id: p.id,
  title: p.title,
  difficulty: p.difficulty,
  tags: p.tags,
}))

function PracticeContent() {
  const searchParams = useSearchParams()
  const [problems, setProblems] = useState<ProblemRow[]>([])
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>("all")
  const [tag, setTag] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "",
    tags: "",
    sampleInput: "",
    sampleOutput: "",
  })

  const loadProblems = async () => {
    try {
      const response = await getProblems()
      if (response.success && Array.isArray(response.problems)) {
        setProblems(
          response.problems.map((p: any) => ({
            id: p.id,
            title: p.title,
            difficulty: normalizeDifficulty(p.difficulty),
            tags: p.tags?.map((t: any) => t.tag?.tagName).filter(Boolean) || [],
          })),
        )
        setOffline(false)
        return
      }
      throw new Error("Unexpected response")
    } catch {
      setProblems(SAMPLE_PROBLEMS)
      setOffline(true)
    }
  }

  const loadStatus = async () => {
    const token = getStoredToken()
    if (!token) return
    try {
      const response = await getUserSubmissions(token)
      if (!response.success) return
      const next: Record<string, Status> = {}
      for (const s of response.data.submissions) {
        const id = s.problem?.id || s.problemId
        if (!id) continue
        if (s.success) next[id] = "solved"
        else if (next[id] !== "solved") next[id] = "attempted"
      }
      setStatus(next)
    } catch {}
  }

  useEffect(() => {
    Promise.all([loadProblems(), loadStatus()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "")
  }, [searchParams])

  const allTags = useMemo(() => Array.from(new Set(problems.flatMap((p) => p.tags))).sort(), [problems])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return problems.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.tags.some((t) => t.toLowerCase().includes(q))) return false
      if (difficulty !== "all" && p.difficulty !== difficulty) return false
      if (tag !== "all" && !p.tags.includes(tag)) return false
      return true
    })
  }, [problems, searchTerm, difficulty, tag])

  const counts = useMemo(() => {
    const by = (d: Difficulty) => problems.filter((p) => p.difficulty === d).length
    return {
      total: problems.length,
      solved: problems.filter((p) => status[p.id] === "solved").length,
      easy: by("Easy"),
      medium: by("Medium"),
      hard: by("Hard"),
    }
  }, [problems, status])

  const handleAddProblem = async () => {
    setFormError(null)
    if (!formData.title || !formData.description || !formData.difficulty) {
      setFormError("Title, description and difficulty are required.")
      return
    }
    if (!formData.sampleOutput.trim()) {
      setFormError("Add at least one test case so submissions can be judged.")
      return
    }
    const token = getStoredToken()
    if (!token) {
      setFormError("Log in to add a problem.")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createProblem({
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        testCases: [{ input: formData.sampleInput, output: formData.sampleOutput }],
        token,
      })
      if (result.success) {
        setIsDialogOpen(false)
        setFormData({ title: "", description: "", difficulty: "", tags: "", sampleInput: "", sampleOutput: "" })
        await loadProblems()
      } else {
        setFormError(result.message || "Could not create the problem.")
      }
    } catch {
      setFormError("Could not reach the server.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const set = (field: keyof typeof formData) => (value: string) => setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="min-h-[calc(100vh-3rem)] flex-1 bg-background p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <PageHeader
              path="~/problems"
              title="Problems"
              description="Every problem is judged on hidden test cases with a time and memory limit."
            >
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <Plus className="mr-1.5 h-4 w-4" />
                    New problem
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>New problem</DialogTitle>
                    <DialogDescription>
                      Solutions read from stdin and write to stdout. More test cases can be added later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={formData.title} onChange={(e) => set("title")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="description">Statement</Label>
                      <Textarea
                        id="description"
                        rows={5}
                        value={formData.description}
                        onChange={(e) => set("description")(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Difficulty</Label>
                        <Select value={formData.difficulty} onValueChange={set("difficulty")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          placeholder="array, dp"
                          value={formData.tags}
                          onChange={(e) => set("tags")(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sampleInput">Test input</Label>
                        <Textarea
                          id="sampleInput"
                          rows={3}
                          className="font-mono text-sm"
                          value={formData.sampleInput}
                          onChange={(e) => set("sampleInput")(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sampleOutput">Expected output</Label>
                        <Textarea
                          id="sampleOutput"
                          rows={3}
                          className="font-mono text-sm"
                          value={formData.sampleOutput}
                          onChange={(e) => set("sampleOutput")(e.target.value)}
                        />
                      </div>
                    </div>
                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddProblem} disabled={isSubmitting}>
                        {isSubmitting ? "Creating…" : "Create problem"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </PageHeader>

            {offline && !loading && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-medium/30 bg-medium/10 px-3 py-2 text-sm text-foreground">
                <WifiOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-medium" />
                <span>
                  The judge API is not reachable, so this is the bundled sample set. You can read and run these, but
                  submissions need the server.
                </span>
              </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatTile label="Problems" value={loading ? "—" : counts.total} />
              <StatTile label="Solved" value={loading ? "—" : counts.solved} tone="text-primary" />
              <StatTile label="Easy" value={loading ? "—" : counts.easy} tone="text-easy" />
              <StatTile label="Medium" value={loading ? "—" : counts.medium} tone="text-medium" />
              <StatTile label="Hard" value={loading ? "—" : counts.hard} tone="text-hard" />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by title or tag"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex rounded-md border border-border p-0.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "h-7 rounded px-2.5 text-sm transition-colors",
                      difficulty === d
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d === "all" ? "All" : d}
                  </button>
                ))}
              </div>
              {allTags.length > 0 && (
                <Select value={tag} onValueChange={setTag}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {allTags.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="grid grid-cols-[2.5rem_3rem_1fr_6rem] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:grid-cols-[2.5rem_3rem_1fr_14rem_6rem]">
                <span className="text-center">St</span>
                <span>#</span>
                <span>Title</span>
                <span className="hidden sm:block">Tags</span>
                <span>Difficulty</span>
              </div>

              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-b border-border px-3 py-3 last:border-0">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {problems.length === 0 ? "No problems yet. Add the first one." : "No problems match these filters."}
                </div>
              ) : (
                filtered.map((problem) => {
                  const st = status[problem.id] || "todo"
                  const number = problems.indexOf(problem) + 1
                  return (
                    <Link
                      key={problem.id}
                      href={`/solve/${problem.id}`}
                      className="group grid grid-cols-[2.5rem_3rem_1fr_6rem] items-center gap-2 border-b border-border px-3 py-2.5 text-sm transition-colors last:border-0 hover:bg-muted/50 sm:grid-cols-[2.5rem_3rem_1fr_14rem_6rem]"
                    >
                      <span className="flex justify-center" title={st === "solved" ? "Solved" : st === "attempted" ? "Attempted" : "Not attempted"}>
                        {st === "solved" ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : st === "attempted" ? (
                          <CircleDashed className="h-4 w-4 text-medium" />
                        ) : (
                          <Circle className="h-4 w-4 text-border" />
                        )}
                      </span>
                      <span className="tabular font-mono text-xs text-muted-foreground">{number}</span>
                      <span className="truncate font-medium text-foreground group-hover:text-primary">{problem.title}</span>
                      <span className="hidden gap-1 overflow-hidden sm:flex">
                        {problem.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="truncate rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                      <DifficultyLabel difficulty={problem.difficulty} />
                    </Link>
                  )
                })
              )}
            </div>

            {!loading && filtered.length > 0 && (
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {filtered.length} of {problems.length} problems
              </p>
            )}
          </div>
        </main>
      </SidebarInset>
    </>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeContent />
    </Suspense>
  )
}
