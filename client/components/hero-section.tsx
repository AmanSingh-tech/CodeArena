import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, TerminalSquare } from "lucide-react"

const LOG: Array<{ text: string; tone?: string }> = [
  { text: "$ submit climbing-stairs.cpp", tone: "text-foreground" },
  { text: "compiling g++ -O2 -std=c++17 … ok" },
  { text: "test 1   AC    2 ms   3.4 MB", tone: "text-verdict-ac" },
  { text: "test 2   AC    2 ms   3.4 MB", tone: "text-verdict-ac" },
  { text: "test 3   AC    3 ms   3.5 MB", tone: "text-verdict-ac" },
  { text: "verdict  Accepted  3/3", tone: "text-verdict-ac font-semibold" },
]

export function HeroSection() {
  return (
    <section className="bg-grid relative overflow-hidden rounded-xl border border-border">
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      <div className="relative grid items-center gap-10 px-5 py-12 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            online judge · C · C++ · Java · Python · JavaScript
          </div>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Write code.
            <br />
            Get a <span className="text-primary">verdict</span>.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Solve algorithm problems in the browser. Every submission is compiled and run on hidden test cases under a
            time and memory limit, so you know whether it is actually correct.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-10 px-5">
              <Link href="/practice">
                Browse problems
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-10 px-5">
              <Link href="/code-editor">
                <TerminalSquare className="mr-2 h-4 w-4" />
                Open playground
              </Link>
            </Button>
          </div>
        </div>

        {/* Illustrative judge output */}
        <div aria-hidden className="overflow-hidden rounded-lg border border-border bg-editor shadow-2xl shadow-black/20">
          <div className="flex h-9 items-center gap-1.5 border-b border-border bg-card px-3">
            <span className="h-2.5 w-2.5 rounded-full bg-hard/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-medium/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">judge</span>
          </div>
          <div className="tabular space-y-1.5 p-4 font-mono text-[13px] leading-relaxed">
            {LOG.map((line, i) => (
              <div key={i} className={`whitespace-pre ${line.tone || "text-muted-foreground"}`}>
                {line.text}
              </div>
            ))}
            <div className="flex items-center text-foreground">
              $ <span className="caret-blink ml-1.5 inline-block h-4 w-2 bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
