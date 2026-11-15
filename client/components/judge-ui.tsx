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
        "whitespace-nowrap font-mono text-xs font-medium",
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

// Shared page heading: a title, one line of context and an optional action.
export function PageHeader({
  title,
  description,
  children,
}: {
  path?: string
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// A plain figure with a label under it. No box: a row of these reads as one line.
export function StatTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div>
      <div className={cn("tabular font-mono text-xl font-medium text-foreground", tone)}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {label}
        {hint ? ` · ${hint}` : ""}
      </div>
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
          rules: [
            { token: "keyword", foreground: "FFCC00" },
            { token: "keyword.directive", foreground: "FFCC00" },
            { token: "type", foreground: "F5E6A8" },
            { token: "number", foreground: "FFB86B" },
            { token: "string", foreground: "B8E0A0" },
            { token: "comment", foreground: "5C5C5C", fontStyle: "italic" },
          ],
          colors: {
            "editor.background": "#080808",
            "editor.foreground": "#E6E6E6",
            "editor.lineHighlightBackground": "#111111",
            "editor.selectionBackground": "#FFCC0033",
            "editor.inactiveSelectionBackground": "#FFCC001A",
            "editorCursor.foreground": "#FFCC00",
            "editorLineNumber.foreground": "#3D3D3D",
            "editorLineNumber.activeForeground": "#FFCC00",
            "editorGutter.background": "#080808",
            "editorBracketMatch.border": "#FFCC0080",
            "editorBracketMatch.background": "#00000000",
            "editorBracketHighlight.foreground1": "#FFCC00",
            "editorBracketHighlight.foreground2": "#E6E6E6",
            "editorBracketHighlight.foreground3": "#FFB86B",
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
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        guides: { indentation: false },
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  )
}
