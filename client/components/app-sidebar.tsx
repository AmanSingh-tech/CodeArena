"use client"

import {
  Trophy,
  ListChecks,
  TerminalSquare,
  BarChart3,
  Briefcase,
  User,
  BookOpen,
  Users,
  History,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const groups = [
  {
    label: "Judge",
    items: [
      { name: "Problems", icon: ListChecks, href: "/practice", match: ["/practice", "/solve"] },
      { name: "Playground", icon: TerminalSquare, href: "/code-editor", match: ["/code-editor"] },
      { name: "Submissions", icon: History, href: "/submissions", match: ["/submissions"] },
    ],
  },
  {
    label: "Compete",
    items: [
      { name: "Contests", icon: Trophy, href: "/contests", match: ["/contests"] },
      { name: "Leaderboard", icon: BarChart3, href: "/leaderboard", match: ["/leaderboard"] },
      { name: "Peer Rooms", icon: Users, href: "/peer-rooms", match: ["/peer-rooms"] },
    ],
  },
  {
    label: "Career",
    items: [
      { name: "Internship Tracker", icon: Briefcase, href: "/internship-tracker", match: ["/internship-tracker"] },
      { name: "Learn", icon: BookOpen, href: "/learn", match: ["/learn"] },
      { name: "Profile", icon: User, href: "/profile", match: ["/profile"] },
    ],
  },
]

export function Logo({ collapsedAware = false }: { collapsedAware?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 font-mono text-xs font-bold text-primary">
        {">_"}
      </span>
      <span
        className={`font-mono text-sm font-semibold tracking-tight text-foreground ${
          collapsedAware ? "group-data-[collapsible=icon]:hidden" : ""
        }`}
      >
        code<span className="text-primary">arena</span>
      </span>
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" variant="sidebar">
      <SidebarHeader className="h-12 justify-center border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo collapsedAware />
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="h-7 px-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:sr-only">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className="relative rounded-md px-3 text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary"
                      >
                        <Link href={item.href}>
                          <item.icon className={isActive ? "text-primary" : "text-muted-foreground"} />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
