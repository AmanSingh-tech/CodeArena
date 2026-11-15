import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-sm text-muted-foreground">
      <span className="font-mono text-xs">
        code<span className="text-primary">arena</span> · online judge
      </span>
      <nav className="flex gap-5">
        <Link href="/practice" className="hover:text-foreground">
          Problems
        </Link>
        <Link href="/code-editor" className="hover:text-foreground">
          Playground
        </Link>
        <Link href="/leaderboard" className="hover:text-foreground">
          Leaderboard
        </Link>
      </nav>
    </footer>
  )
}
