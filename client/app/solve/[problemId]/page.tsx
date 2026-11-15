"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"
import { Loader2, Play, RotateCcw, Send, ChevronRight, Lightbulb, Bug, Clock, MemoryStick, WifiOff } from "lucide-react"
import {
  findError,
  getHint,
  getProblem,
  getProblemSubmissions,
  getStoredToken,
  runCustom,
  submitCode,
} from "@/lib/api"
import { getProblemById } from "@/lib/problems-data"
import { CodeEditorPane, DifficultyLabel, VerdictBadge } from "@/components/judge-ui"
import {
  LANGUAGES,
  VERDICTS,
  VERDICT_TEXT,
  formatMemory,
  formatTime,
  getLanguage,
  verdictOf,
  type Verdict,
} from "@/lib/judge"
import { cn } from "@/lib/utils"

interface Sample {
  input: string
  output: string
  explanation?: string
}

interface ProblemView {
  id: string
  title: string
  difficulty: string
  description: string
  constraints: string[]
  tags: string[]
  samples: Sample[]
  // True when the statement comes from the bundled sample set, not the judge.
  offline: boolean
}

interface RunResult {
  status: string
  output: string
  stderr: string
  timeMs: number | null
  memoryKb: number | null
  expected?: string
}

interface TestResult {
  testCase: number
  passed: boolean
  verdict: Verdict
  executionTime: number
  memoryKb: number
  input?: string
  expected?: string
  actual?: string
  error?: string
}

interface SubmitResult {
  verdict: Verdict
  passedTests: number
  totalTests: number
  executionTime: number
  memoryKb: number
  compileError: string | null
  testResults: TestResult[]
}

interface PastSubmission {
  id: string
  code: string
  date: string
  success: boolean
  error?: string | null
  language: string
  testsPassed: number | null
  totalTests: number | null
  executionTime: number | null
}

type LeftTab = "statement" | "submissions" | "hints"
type ConsoleTab = "input" | "output" | "result"

const codeKey = (problemId: string, language: string) => `codearena:code:${problemId}:${language}`

function fromApi(p: any): ProblemView {
  return {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    description: p.description || "",
    constraints: String(p.constraints || "")
      .split(/\n|,\s+(?=[^,]*[≤<=>])/)
      .map((c: string) => c.trim())
      .filter(Boolean),
    tags: p.tags?.map((t: any) => t.tag?.tagName).filter(Boolean) || [],
    samples: (p.testCases || []).map((t: any) => ({ input: t.input, output: t.output })),
    offline: false,
  }
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-9 px-3 text-sm transition-colors",
        active
          ? "font-medium text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function Block({ label, children, tone }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <pre className={cn("overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground", tone)}>
        {children}
      </pre>
    </div>
  )
}

export default function SolvePage() {
  const params = useParams()
  const problemId = params.problemId as string
  const isMobile = useIsMobile()

  const [problem, setProblem] = useState<ProblemView | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [language, setLanguage] = useState("cpp")
  const [code, setCode] = useState(getLanguage("cpp").template)
  const [stdin, setStdin] = useState("")
  const [activeSample, setActiveSample] = useState<number | null>(null)

  const [leftTab, setLeftTab] = useState<LeftTab>("statement")
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("input")

  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [history, setHistory] = useState<PastSubmission[] | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [review, setReview] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  // Load the problem from the judge, falling back to the bundled sample set.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    const useBundled = () => {
      const local = getProblemById(problemId)
      if (!local) return false
      setProblem({
        id: local.id,
        title: local.title,
        difficulty: local.difficulty,
        description: local.description,
        constraints: local.constraints,
        tags: local.tags,
        samples: local.examples,
        offline: true,
      })
      return true
    }

    getProblem(problemId)
      .then((response) => {
        if (cancelled) return
        if (response.success && response.problem) {
          const view = fromApi(response.problem)
          setProblem(view)
          if (view.samples[0]) {
            setStdin(view.samples[0].input)
            setActiveSample(0)
          }
        } else if (!useBundled()) {
          setNotFound(true)
        }
      })
      .catch(() => {
        if (!cancelled && !useBundled()) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [problemId])

  // Restore the saved draft for this problem and language, or start from the template.
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(codeKey(problemId, language))
    } catch {}
    setCode(saved ?? getLanguage(language).template)
  }, [problemId, language])

  const updateCode = (next: string) => {
    setCode(next)
    try {
      localStorage.setItem(codeKey(problemId, language), next)
    } catch {}
  }

  const loadHistory = useCallback(async () => {
    const token = getStoredToken()
    if (!token || !problem || problem.offline) {
      setHistory([])
      return
    }
    try {
      const response = await getProblemSubmissions(problem.id, token)
      setHistory(response.success ? response.submissions : [])
    } catch {
      setHistory([])
    }
  }, [problem])

  useEffect(() => {
    if (leftTab === "submissions") loadHistory()
  }, [leftTab, loadHistory])

  const handleRun = async () => {
    if (!code.trim()) return
    setIsRunning(true)
    setNotice(null)
    setConsoleTab("output")
    try {
      const data = await runCustom({ code, language, inputs: stdin })
      if (!data.success) {
        setRunResult({ status: "ERR", output: "", stderr: data.error || data.err || "Run failed", timeMs: null, memoryKb: null })
        return
      }
      const status = data.status || "OK"
      const stderr = data.err && data.err !== "No Error" ? data.err : ""
      setRunResult({
        status,
        output: status === "CE" ? "" : data.output || "",
        stderr,
        timeMs: data.executionTime ?? null,
        memoryKb: data.memoryKb ?? null,
        expected: activeSample !== null ? problem?.samples[activeSample]?.output : undefined,
      })
    } catch {
      setRunResult({
        status: "ERR",
        output: "",
        stderr: "Could not reach the judge. Check that the server is running.",
        timeMs: null,
        memoryKb: null,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!problem || !code.trim()) return
    setNotice(null)
    setReview(null)

    if (problem.offline) {
      setConsoleTab("result")
      setSubmitResult(null)
      setNotice("This is a bundled sample problem. Submitting needs the judge server, which is not reachable.")
      return
    }

    const token = getStoredToken()
    if (!token) {
      setConsoleTab("result")
      setSubmitResult(null)
      setNotice("login")
      return
    }

    setIsSubmitting(true)
    setConsoleTab("result")
    try {
      const data = await submitCode({ problemId: problem.id, code, language, token })
      if (!data.success) {
        setSubmitResult(null)
        setNotice(data.msg || data.error || "Submission failed")
        return
      }
      setSubmitResult({
        verdict: data.verdict || (data.accepted ? "AC" : "WA"),
        passedTests: data.results.passedTests,
        totalTests: data.results.totalTests,
        executionTime: data.results.executionTime,
        memoryKb: data.results.memoryKb,
        compileError: data.results.compileError,
        testResults: data.results.testResults || [],
      })
      if (leftTab === "submissions") loadHistory()
    } catch {
      setSubmitResult(null)
      setNotice("Could not reach the judge. Your submission was not recorded.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    updateCode(getLanguage(language).template)
  }

  const requestHint = async () => {
    if (!problem) return
    setHintLoading(true)
    try {
      const data = await getHint(problem.id)
      setHint(data.success ? data.res : data.msg || "Could not get a hint right now.")
    } catch {
      setHint("Could not reach the server.")
    } finally {
      setHintLoading(false)
    }
  }

  const requestReview = async () => {
    if (!problem) return
    setReviewLoading(true)
    try {
      const data = await findError(problem.id, code)
      setReview(data.success ? data.res : data.msg || "Could not review the code right now.")
    } catch {
      setReview("Could not reach the server.")
    } finally {
      setReviewLoading(false)
    }
  }

  const runMatches = useMemo(() => {
    if (!runResult || runResult.expected === undefined || runResult.status !== "OK") return null
    const norm = (s: string) => s.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trimEnd()
    return norm(runResult.output) === norm(runResult.expected)
  }, [runResult])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <div className="flex h-[calc(100vh-3rem)] items-center justify-center font-mono text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> loading problem…
          </div>
        </SidebarInset>
      </>
    )
  }

  if (notFound || !problem) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <div className="flex h-[calc(100vh-3rem)] flex-col items-center justify-center gap-3 text-center">
            <div className="font-mono text-sm text-verdict-wa">404 · problem not found</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              There is no problem with this id, or the judge server could not be reached.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/practice">Back to problems</Link>
            </Button>
          </div>
        </SidebarInset>
      </>
    )
  }

  const lang = getLanguage(language)

  const statement = (
    <div className="flex h-full flex-col bg-background">
      <div className="flex flex-shrink-0 items-center border-b border-border px-1">
        <TabButton active={leftTab === "statement"} onClick={() => setLeftTab("statement")}>
          Statement
        </TabButton>
        <TabButton active={leftTab === "submissions"} onClick={() => setLeftTab("submissions")}>
          Submissions
        </TabButton>
        <TabButton active={leftTab === "hints"} onClick={() => setLeftTab("hints")}>
          Hints
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        {leftTab === "statement" && (
          <div className="space-y-6 p-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{problem.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <DifficultyLabel difficulty={problem.difficulty} className="text-xs" />
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3.5 w-3.5" /> 3 s
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <MemoryStick className="h-3.5 w-3.5" /> 256 MB
                </span>
                {problem.tags.map((t) => (
                  <span key={t} className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {problem.offline && (
              <div className="flex items-start gap-2 rounded-md border border-medium/30 bg-medium/10 px-3 py-2 text-sm">
                <WifiOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-medium" />
                <span>Bundled sample problem. You can run code against your own input; submitting needs the judge server.</span>
              </div>
            )}

            <div className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{problem.description}</div>

            {problem.samples.length > 0 && (
              <div className="space-y-4">
                {problem.samples.map((sample, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">Example {i + 1}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Block label="Input">{sample.input}</Block>
                      <Block label="Output">{sample.output}</Block>
                    </div>
                    {sample.explanation && <p className="text-sm text-muted-foreground">{sample.explanation}</p>}
                  </div>
                ))}
              </div>
            )}

            {problem.constraints.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold text-foreground">Constraints</div>
                <ul className="space-y-1">
                  {problem.constraints.map((c, i) => (
                    <li key={i} className="flex gap-2 font-mono text-[13px] text-foreground/90">
                      <span className="text-muted-foreground">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {leftTab === "submissions" && (
          <div className="p-3">
            {history === null ? (
              <div className="p-4 font-mono text-sm text-muted-foreground">loading…</div>
            ) : history.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                {getStoredToken() ? "You have not submitted a solution to this problem yet." : "Log in to see your submissions."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                {history.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const id = getLanguage(s.language).id
                      // Store it as the draft first so the language switch picks it up.
                      try {
                        localStorage.setItem(codeKey(problemId, id), s.code)
                      } catch {}
                      setLanguage(id)
                      setCode(s.code)
                    }}
                    title="Load this code into the editor"
                    className="grid w-full grid-cols-[4rem_1fr_auto] items-center gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50"
                  >
                    <VerdictBadge verdict={verdictOf(s)} short />
                    <span className="tabular truncate font-mono text-xs text-muted-foreground">
                      {getLanguage(s.language).label} · {s.testsPassed ?? 0}/{s.totalTests ?? 0} · {formatTime(s.executionTime)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {leftTab === "hints" && (
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted-foreground">
              Hints are generated for this problem and point at an approach without giving the solution away.
            </p>
            <Button size="sm" variant="outline" onClick={requestHint} disabled={hintLoading || problem.offline}>
              {hintLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              {hint ? "Get another hint" : "Get a hint"}
            </Button>
            {problem.offline && <p className="text-xs text-muted-foreground">Hints need the judge server.</p>}
            {hint && (
              <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                {hint}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const consolePane = (
    <div className="flex h-full flex-col bg-background">
      <div className="flex flex-shrink-0 items-center border-b border-border px-1">
        <TabButton active={consoleTab === "input"} onClick={() => setConsoleTab("input")}>
          Input
        </TabButton>
        <TabButton active={consoleTab === "output"} onClick={() => setConsoleTab("output")}>
          Output
        </TabButton>
        <TabButton active={consoleTab === "result"} onClick={() => setConsoleTab("result")}>
          Result
          {submitResult && <span className={cn("ml-1.5 font-mono text-xs", VERDICT_TEXT[submitResult.verdict])}>{submitResult.verdict}</span>}
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {consoleTab === "input" && (
          <div className="flex h-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {problem.samples.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setStdin(sample.input)
                    setActiveSample(i)
                  }}
                  className={cn(
                    "h-7 rounded border px-2 font-mono text-xs",
                    activeSample === i
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  sample {i + 1}
                </button>
              ))}
              <span className="font-mono text-xs text-muted-foreground">
                {activeSample === null ? "custom input" : "stdin"}
              </span>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => {
                setStdin(e.target.value)
                setActiveSample(null)
              }}
              spellCheck={false}
              placeholder="Standard input for Run"
              className="min-h-[80px] flex-1 resize-none rounded-md border border-border bg-muted/40 p-3 font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
          </div>
        )}

        {consoleTab === "output" && (
          <div className="space-y-3">
            {isRunning ? (
              <div className="flex items-center font-mono text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> running…
              </div>
            ) : !runResult ? (
              <div className="font-mono text-sm text-muted-foreground">Run your code to see its output here.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  {runResult.status === "OK" ? (
                    runMatches === null ? (
                      <span className="text-foreground">Finished</span>
                    ) : runMatches ? (
                      <span className="text-verdict-ac">Matches sample output</span>
                    ) : (
                      <span className="text-verdict-wa">Differs from sample output</span>
                    )
                  ) : runResult.status in VERDICTS ? (
                    <VerdictBadge verdict={runResult.status as Verdict} />
                  ) : (
                    <span className="text-verdict-wa">Error</span>
                  )}
                  {runResult.timeMs !== null && <span className="tabular text-muted-foreground">{formatTime(runResult.timeMs)}</span>}
                  {!!runResult.memoryKb && <span className="tabular text-muted-foreground">{formatMemory(runResult.memoryKb)}</span>}
                </div>
                {runResult.status !== "CE" && runResult.status !== "ERR" && <Block label="stdout">{runResult.output || "(no output)"}</Block>}
                {runMatches === false && <Block label="expected">{runResult.expected}</Block>}
                {runResult.stderr && (
                  <Block label={runResult.status === "CE" ? "compiler" : "stderr"} tone="text-verdict-wa">
                    {runResult.stderr}
                  </Block>
                )}
              </>
            )}
          </div>
        )}

        {consoleTab === "result" && (
          <div className="space-y-4">
            {isSubmitting ? (
              <div className="flex items-center font-mono text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> judging…
              </div>
            ) : notice === "login" ? (
              <div className="text-sm text-foreground">
                <Link href="/login" className="text-primary underline underline-offset-4">
                  Log in
                </Link>{" "}
                to submit. Your code is saved in this browser.
              </div>
            ) : notice ? (
              <div className="text-sm text-verdict-wa">{notice}</div>
            ) : !submitResult ? (
              <div className="font-mono text-sm text-muted-foreground">Submit to judge your code on every test case.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <span className={cn("text-xl font-semibold", VERDICT_TEXT[submitResult.verdict])}>
                    {VERDICTS[submitResult.verdict]?.label}
                  </span>
                  <span className="tabular font-mono text-sm text-muted-foreground">
                    {submitResult.passedTests}/{submitResult.totalTests} tests
                  </span>
                  {submitResult.verdict !== "CE" && (
                    <>
                      <span className="tabular font-mono text-sm text-muted-foreground">{formatTime(submitResult.executionTime)}</span>
                      {!!submitResult.memoryKb && (
                        <span className="tabular font-mono text-sm text-muted-foreground">{formatMemory(submitResult.memoryKb)}</span>
                      )}
                    </>
                  )}
                </div>

                {submitResult.testResults.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {submitResult.testResults.map((t) => (
                      <span
                        key={t.testCase}
                        title={`Test ${t.testCase}: ${VERDICTS[t.verdict]?.label} · ${formatTime(t.executionTime)}`}
                        className={cn(
                          "tabular flex h-7 min-w-[2.75rem] items-center justify-center rounded border px-1.5 font-mono text-xs",
                          VERDICTS[t.verdict]?.className,
                        )}
                      >
                        {t.testCase} {t.verdict}
                      </span>
                    ))}
                  </div>
                )}

                {submitResult.compileError && (
                  <Block label="compiler" tone="text-verdict-wa">
                    {submitResult.compileError}
                  </Block>
                )}

                {submitResult.testResults
                  .filter((t) => !t.passed && t.input !== undefined)
                  .slice(0, 1)
                  .map((t) => (
                    <div key={t.testCase} className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Test {t.testCase} (sample)</div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Block label="Input">{t.input}</Block>
                        <Block label="Expected">{t.expected}</Block>
                        <Block label="Your output" tone="text-verdict-wa">
                          {t.actual || "(no output)"}
                        </Block>
                      </div>
                      {t.error && <Block label="stderr" tone="text-verdict-wa">{t.error}</Block>}
                    </div>
                  ))}

                {submitResult.verdict !== "AC" && (
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" onClick={requestReview} disabled={reviewLoading}>
                      {reviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
                      Ask AI what is wrong
                    </Button>
                    {review && (
                      <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                        {review}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const editorPane = (
    <div className="flex h-full flex-col bg-editor">
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border bg-background px-3">
        <span className="font-mono text-xs text-muted-foreground">{lang.file}</span>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          title="Reset to the starter template"
        >
          <RotateCcw className="h-3 w-3" /> reset
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditorPane value={code} onChange={updateCode} language={lang.monaco} />
      </div>
    </div>
  )

  return (
    <>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Header />
        <div className="flex h-[calc(100vh-3rem)] flex-col">
          {/* Workspace bar */}
          <div className="flex h-11 flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3">
            <div className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
              <Link href="/practice" className="text-muted-foreground hover:text-foreground">
                Problems
              </Link>
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate font-medium text-foreground">{problem.title}</span>
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 w-[132px] font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="font-mono text-xs">
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8" onClick={handleRun} disabled={isRunning || isSubmitting}>
                {isRunning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
                Run
              </Button>
              <Button size="sm" className="h-8" onClick={handleSubmit} disabled={isRunning || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                Submit
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} key={isMobile ? "v" : "h"}>
              <ResizablePanel defaultSize={isMobile ? 35 : 42} minSize={20}>
                {statement}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={isMobile ? 65 : 58} minSize={30}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={62} minSize={20}>
                    {editorPane}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={38} minSize={15}>
                    {consolePane}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}
