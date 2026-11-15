import Link from "next/link"
import { ListChecks, TerminalSquare, Lightbulb, BarChart3, Trophy, Briefcase, ArrowUpRight } from "lucide-react"

const features = [
  {
    icon: ListChecks,
    title: "Judged problems",
    description: "Submit in five languages. Solutions run on hidden tests and come back with a verdict, runtime and memory.",
    href: "/practice",
  },
  {
    icon: TerminalSquare,
    title: "Playground",
    description: "A scratch editor with stdin. Run any snippet against the same sandbox limits the judge uses.",
    href: "/code-editor",
  },
  {
    icon: Lightbulb,
    title: "AI hints and review",
    description: "Stuck on a problem? Ask for a nudge, or have a failing submission reviewed without getting the answer.",
    href: "/practice",
  },
  {
    icon: BarChart3,
    title: "Leaderboard",
    description: "Ratings are computed from the problems you have solved, weighted by difficulty.",
    href: "/leaderboard",
  },
  {
    icon: Trophy,
    title: "Contest calendar",
    description: "Upcoming Codeforces rounds in one list, so you do not miss the next one.",
    href: "/contests",
  },
  {
    icon: Briefcase,
    title: "Internship toolkit",
    description: "Track applications, analyse your resume and draft cover letters with AI assistance.",
    href: "/internship-tracker",
  },
]

const steps = [
  { n: "01", title: "Compile once", body: "Your code is built a single time in an isolated working directory." },
  { n: "02", title: "Run every test", body: "Each hidden test gets 3 seconds and 256 MB. Output is compared line by line." },
  { n: "03", title: "Get a verdict", body: "The first failing test decides the result. Time and peak memory are reported." },
]

const verdicts = [
  { code: "AC", label: "Accepted", cls: "text-verdict-ac border-verdict-ac/30 bg-verdict-ac/10" },
  { code: "WA", label: "Wrong Answer", cls: "text-verdict-wa border-verdict-wa/30 bg-verdict-wa/10" },
  { code: "TLE", label: "Time Limit Exceeded", cls: "text-verdict-tle border-verdict-tle/30 bg-verdict-tle/10" },
  { code: "MLE", label: "Memory Limit Exceeded", cls: "text-verdict-mle border-verdict-mle/30 bg-verdict-mle/10" },
  { code: "RE", label: "Runtime Error", cls: "text-verdict-re border-verdict-re/30 bg-verdict-re/10" },
  { code: "CE", label: "Compilation Error", cls: "text-verdict-ce border-verdict-ce/30 bg-verdict-ce/10" },
]

export function FeatureCards() {
  return (
    <>
      <section className="mt-10">
        <div className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">How judging works</div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="bg-card p-5">
              <div className="font-mono text-xs text-primary">{step.n}</div>
              <div className="mt-2 font-semibold text-foreground">{step.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {verdicts.map((v) => (
            <span key={v.code} className={`inline-flex items-center gap-2 rounded border px-2 py-1 font-mono text-xs ${v.cls}`}>
              {v.code}
              <span className="text-muted-foreground">{v.label}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">What is here</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/50">
                  <feature.icon className="h-4 w-4 text-primary" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="mt-4 font-semibold text-foreground">{feature.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
