import Link from "next/link"
import { Button } from "@/components/ui/button"

const LOG: Array<{ text: string; tone?: string }> = [
  { text: "$ submit climbing-stairs.cpp", tone: "text-brand-ink" },
  { text: "compiling … ok" },
  { text: "test 1   AC   2 ms" },
  { text: "test 2   AC   2 ms" },
  { text: "test 3   AC   3 ms" },
  { text: "Accepted", tone: "text-verdict-ac" },
]

export function HeroSection() {
  return (
    <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.2fr_1fr] lg:py-24">
      <div>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
          Write code.
          <br />
          Get a <span className="bg-brand px-1.5 text-black">verdict.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
          Algorithm problems judged on hidden tests, in C, C++, Java, Python and JavaScript.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Button asChild className="h-9 px-4">
            <Link href="/practice">Browse problems</Link>
          </Button>
          <Link href="/code-editor" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Open the playground
          </Link>
        </div>
      </div>

      {/* Illustrative judge output */}
      <div aria-hidden className="tabular overflow-hidden whitespace-pre rounded-md border border-border border-t-2 border-t-brand bg-card p-5 font-mono text-[13px] leading-7 text-muted-foreground">
        {LOG.map((line, i) => (
          <div key={i} className={line.tone}>
            {line.text}
          </div>
        ))}
      </div>
    </section>
  )
}
