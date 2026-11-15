// Shared judge vocabulary for the UI: verdicts, difficulties, languages.

export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE"

export const VERDICTS: Record<Verdict, { label: string; className: string }> = {
  AC: { label: "Accepted", className: "text-verdict-ac" },
  WA: { label: "Wrong Answer", className: "text-verdict-wa" },
  TLE: { label: "Time Limit Exceeded", className: "text-verdict-tle" },
  MLE: { label: "Memory Limit Exceeded", className: "text-verdict-mle" },
  RE: { label: "Runtime Error", className: "text-verdict-re" },
  CE: { label: "Compilation Error", className: "text-verdict-ce" },
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  AC: "text-verdict-ac",
  WA: "text-verdict-wa",
  TLE: "text-verdict-tle",
  MLE: "text-verdict-mle",
  RE: "text-verdict-re",
  CE: "text-verdict-ce",
}

// Works out a verdict from whatever a submission record carries. Older rows
// only have `success`; newer ones keep the verdict in `error` or `verdict`.
export function verdictOf(row: { success?: boolean; verdict?: string | null; error?: string | null }): Verdict {
  if (row.success) return "AC"
  const raw = (row.verdict || row.error || "").toUpperCase()
  for (const v of ["TLE", "MLE", "CE", "RE", "WA"] as Verdict[]) {
    if (raw.startsWith(v)) return v
  }
  return "WA"
}

export type Difficulty = "Easy" | "Medium" | "Hard"

export function normalizeDifficulty(value: string | undefined | null): Difficulty {
  const v = (value || "").toLowerCase()
  if (v === "hard") return "Hard"
  if (v === "medium") return "Medium"
  return "Easy"
}

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
}

export interface Language {
  id: string
  label: string
  monaco: string
  file: string
  template: string
}

// Every template reads stdin and writes stdout, which is how the judge runs code.
export const LANGUAGES: Language[] = [
  {
    id: "cpp",
    label: "C++17",
    monaco: "cpp",
    file: "main.cpp",
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Read from stdin, write to stdout.

    return 0;
}
`,
  },
  {
    id: "c",
    label: "C",
    monaco: "c",
    file: "main.c",
    template: `#include <stdio.h>

int main(void) {
    /* Read from stdin, write to stdout. */

    return 0;
}
`,
  },
  {
    id: "java",
    label: "Java",
    monaco: "java",
    file: "Main.java",
    template: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // Read from stdin, write to stdout. The class must be named Main.

    }
}
`,
  },
  {
    id: "python",
    label: "Python 3",
    monaco: "python",
    file: "main.py",
    template: `import sys

def main():
    data = sys.stdin.read().split()
    # Read from stdin, write to stdout.

main()
`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    file: "main.js",
    template: `const input = require("fs").readFileSync(0, "utf8").trim().split("\\n");

// Read from stdin, write to stdout.

`,
  },
]

export function getLanguage(id: string): Language {
  return LANGUAGES.find((l) => l.id === id) || LANGUAGES[0]
}

export function formatMemory(kb: number | null | undefined): string {
  if (!kb) return "—"
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—"
  return `${ms} ms`
}
