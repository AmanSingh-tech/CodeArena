"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"
import { Download, Loader2, Play, RotateCcw } from "lucide-react"
import { runCustom } from "@/lib/api"
import { CodeEditorPane, VerdictBadge } from "@/components/judge-ui"
import { LANGUAGES, VERDICTS, formatMemory, formatTime, getLanguage, type Verdict } from "@/lib/judge"

// Runnable starter programs so the first click on Run shows real output.
const STARTERS: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string name;
    if (!(cin >> name)) name = "world";
    cout << "Hello, " << name << "!\\n";
    return 0;
}
`,
  c: `#include <stdio.h>

int main(void) {
    char name[64] = "world";
    scanf("%63s", name);
    printf("Hello, %s!\\n", name);
    return 0;
}
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String name = in.hasNext() ? in.next() : "world";
        System.out.println("Hello, " + name + "!");
    }
}
`,
  python: `import sys

name = sys.stdin.read().strip() or "world"
print(f"Hello, {name}!")
`,
  javascript: `const name = require("fs").readFileSync(0, "utf8").trim() || "world";
console.log(\`Hello, \${name}!\`);
`,
}

const draftKey = (language: string) => `codearena:playground:${language}`

interface RunState {
  status: string
  output: string
  stderr: string
  timeMs: number | null
  memoryKb: number | null
}

export default function CodeEditorPage() {
  const isMobile = useIsMobile()
  const [language, setLanguage] = useState("cpp")
  const [code, setCode] = useState(STARTERS.cpp)
  const [inputs, setInputs] = useState("")
  const [result, setResult] = useState<RunState | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(draftKey(language))
    } catch {}
    setCode(saved ?? STARTERS[language] ?? "")
  }, [language])

  const updateCode = (next: string) => {
    setCode(next)
    try {
      localStorage.setItem(draftKey(language), next)
    } catch {}
  }

  const run = async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    try {
      const data = await runCustom({ code, language, inputs })
      if (!data.success) {
        setResult({ status: "ERR", output: "", stderr: data.error || data.err || "Run failed", timeMs: null, memoryKb: null })
      } else {
        const status = data.status || "OK"
        setResult({
          status,
          output: status === "CE" ? "" : data.output || "",
          stderr: data.err && data.err !== "No Error" ? data.err : "",
          timeMs: data.executionTime ?? null,
          memoryKb: data.memoryKb ?? null,
        })
      }
    } catch {
      setResult({
        status: "ERR",
        output: "",
        stderr: "Could not reach the judge. Check that the server and compiler service are running.",
        timeMs: null,
        memoryKb: null,
      })
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    updateCode(STARTERS[language] ?? "")
    setResult(null)
  }

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = getLanguage(language).file
    a.click()
    URL.revokeObjectURL(url)
  }

  // Ctrl/Cmd + Enter runs the code.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        run()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const lang = getLanguage(language)

  return (
    <>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Header />
        <div className="flex h-[calc(100vh-3rem)] flex-col">
          <div className="flex h-11 flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs text-primary">~/playground</span>
              <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">/ {lang.file}</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
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
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={reset} aria-label="Reset code" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={download} aria-label="Download code" title="Download">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" className="h-8" onClick={run} disabled={loading}>
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
                Run
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} key={isMobile ? "v" : "h"}>
              <ResizablePanel defaultSize={62} minSize={30}>
                <div className="h-full bg-editor">
                  <CodeEditorPane value={code} onChange={updateCode} language={lang.monaco} />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={38} minSize={20}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={35} minSize={15}>
                    <div className="flex h-full flex-col bg-background">
                      <div className="flex h-9 flex-shrink-0 items-center border-b border-border px-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        stdin
                      </div>
                      <textarea
                        value={inputs}
                        onChange={(e) => setInputs(e.target.value)}
                        spellCheck={false}
                        placeholder="Input passed to your program"
                        className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={65} minSize={20}>
                    <div className="flex h-full flex-col bg-background">
                      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border px-3">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">output</span>
                        {result && !loading && (
                          <span className="tabular flex items-center gap-3 font-mono text-xs text-muted-foreground">
                            {result.status in VERDICTS && <VerdictBadge verdict={result.status as Verdict} short />}
                            {result.timeMs !== null && <span>{formatTime(result.timeMs)}</span>}
                            {!!result.memoryKb && <span>{formatMemory(result.memoryKb)}</span>}
                          </span>
                        )}
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed">
                        {loading ? (
                          <span className="flex items-center text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> running…
                          </span>
                        ) : !result ? (
                          <span className="text-muted-foreground">
                            Press Run or Ctrl+Enter. Programs get 3 s and 256 MB.
                          </span>
                        ) : (
                          <>
                            {result.output && <pre className="whitespace-pre-wrap break-words text-foreground">{result.output}</pre>}
                            {result.stderr && (
                              <pre className="mt-2 whitespace-pre-wrap break-words text-verdict-wa">{result.stderr}</pre>
                            )}
                            {!result.output && !result.stderr && <span className="text-muted-foreground">(no output)</span>}
                          </>
                        )}
                      </div>
                    </div>
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
