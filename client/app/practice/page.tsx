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
import { Search, Plus, CheckCircle2, CircleDashed, WifiOff } from "lucide-react"
import { createProblem, getProblems, getStoredToken, getUserSubmissions } from "@/lib/api"
import { getAllProblems } from "@/lib/problems-data"
import { DifficultyLabel, PageHeader } from "@/components/judge-ui"
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
        <main className="min-h-[calc(100vh-3rem)] flex-1 bg-background px-5 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <PageHeader
              title="Problems"
              description={
                loading
                  ? undefined
                  : `${counts.total} problems · ${counts.solved} solved`
              }
            >
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground">
                    <Plus className="mr-1.5 h-4 w-4" />
                    New
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
              <div className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
                <WifiOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-medium" />
                <span>
                  The judge API is not reachable, so this is the bundled sample set. You can read and run these, but
                  submissions need the server.
                </span>
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by title or tag"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 border-0 bg-muted/60 pl-8 shadow-none focus-visible:ring-1"
                />
              </div>
              <div className="flex gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "text-sm transition-colors",
                      difficulty === d ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d === "all" ? "All" : d}
                  </button>
                ))}
              </div>
              {allTags.length > 0 && (
                <Select value={tag} onValueChange={setTag}>
                  <SelectTrigger className="h-9 w-[150px] border-0 bg-transparent text-muted-foreground shadow-none">
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

            <div>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-b border-border py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="py-12 text-sm text-muted-foreground">
                  {problems.length === 0 ? "No problems yet. Add the first one." : "No problems match these filters."}
                </div>
              ) : (
                filtered.map((problem) => {
                  const st = status[problem.id] || "todo"
                                    return (
                    <Link
                      key={problem.id}
                      href={`/solve/${problem.id}`}
                      className="group grid grid-cols-[1.5rem_1fr_5rem] items-center gap-3 border-b border-border py-3 text-sm sm:grid-cols-[1.5rem_1fr_auto_5rem]"
                    >
                      <span className="flex" title={st === "solved" ? "Solved" : st === "attempted" ? "Attempted" : "Not attempted"}>
                        {st === "solved" ? (
                          <CheckCircle2 className="h-4 w-4 text-verdict-ac" />
                        ) : st === "attempted" ? (
                          <CircleDashed className="h-4 w-4 text-medium" />
                        ) : (
                          <span className="h-4 w-4" />
                        )}
                      </span>
                      <span className="truncate text-foreground underline-offset-4 group-hover:underline">{problem.title}</span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">
                        {problem.tags.slice(0, 2).join(", ")}
                      </span>
                      <DifficultyLabel difficulty={problem.difficulty} className="text-right text-xs" />
                    </Link>
                  )
                })
              )}
            </div>

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
