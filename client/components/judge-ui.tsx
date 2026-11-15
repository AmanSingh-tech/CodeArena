"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import {
  DIFFICULTY_TEXT,
  VERDICTS,
  normalizeDifficulty,
  type Verdict,
} from "@/lib/judge"

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-editor font-mono text-xs text-muted-foreground">
      loading editor…
    </div>
  ),
})

export function VerdictBadge({
  verdict,
  short = false,
  className,
}: {
  verdict: Verdict
  short?: boolean
  className?: string
}) {
  const meta = VERDICTS[verdict] || VERDICTS.WA
  return (
    <span
      title={meta.label}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-xs font-medium",
        meta.className,
        className,
      )}
    >
      {short ? verdict : meta.label}
    </span>
  )
}

export function DifficultyLabel({ difficulty, className }: { difficulty: string; className?: string }) {
  const level = normalizeDifficulty(difficulty)
  return <span className={cn("text-sm font-medium", DIFFICULTY_TEXT[level], className)}>{level}</span>
}

// Shared page heading: a mono path-style eyebrow, a title and an optional action.
export function PageHeader({
  path,
  title,
  description,
  children,
}: {
  path: string
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        <div className="mb-1 font-mono text-xs text-primary">{path}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function StatTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-1 font-mono text-2xl font-semibold text-foreground", tone)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function CodeEditorPane({
  value,
  onChange,
  language,
  readOnly = false,
  fontSize = 14,
}: {
  value: string
  onChange?: (value: string) => void
  language: string
  readOnly?: boolean
  fontSize?: number
}) {
  const { resolvedTheme } = useTheme()

  return (
    <Monaco
      height="100%"
      language={language}
      value={value}
      theme={resolvedTheme === "light" ? "light" : "codearena-dark"}
      beforeMount={(monaco) => {
        // Same surface colour as the rest of the workspace instead of VS Code's grey.
        monaco.editor.defineTheme("codearena-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": "#0c0e11",
            "editor.lineHighlightBackground": "#14171c",
            "editorLineNumber.foreground": "#4b5261",
            "editorLineNumber.activeForeground": "#aab1bd",
            "editorGutter.background": "#0c0e11",
          },
        })
      }}
      onChange={(next) => onChange?.(next ?? "")}
      options={{
        readOnly,
        fontSize,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: "line",
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  )
}
