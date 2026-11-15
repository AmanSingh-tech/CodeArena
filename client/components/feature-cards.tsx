import Link from "next/link"

const steps = [
  { title: "Compile once", body: "Your code is built a single time in its own working directory." },
  { title: "Run every test", body: "Each hidden test gets 3 seconds and 256 MB." },
  { title: "Get a verdict", body: "Accepted, or the reason it failed, with runtime and memory." },
]

const links = [
  { title: "Problems", description: "Judged in five languages", href: "/practice" },
  { title: "Playground", description: "Run any snippet with your own input", href: "/code-editor" },
  { title: "Submissions", description: "Your history and verdicts", href: "/submissions" },
  { title: "Leaderboard", description: "Ratings from problems solved", href: "/leaderboard" },
  { title: "Contests", description: "Upcoming Codeforces rounds", href: "/contests" },
  { title: "Internship tracker", description: "Applications and AI resume tools", href: "/internship-tracker" },
]

export function FeatureCards() {
  return (
    <>
      <section className="grid gap-8 border-t border-border py-12 md:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title}>
            <div className="font-mono text-xs font-semibold text-brand-ink">0{i + 1}</div>
            <div className="mt-2 text-sm font-medium text-foreground">{step.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-border py-4">
        {links.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="group flex items-baseline justify-between gap-4 border-b border-border py-3 text-sm last:border-0"
          >
            <span className="font-medium text-foreground transition-colors group-hover:text-brand-ink">{link.title}</span>
            <span className="text-muted-foreground transition-colors group-hover:text-foreground">{link.description}</span>
          </Link>
        ))}
      </section>
    </>
  )
}
