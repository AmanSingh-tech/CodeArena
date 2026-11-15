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
    <Link href="/" className="flex items-center gap-2 text-foreground">
      <span className="font-mono text-sm font-semibold">{">_"}</span>
      <span className={`text-sm font-semibold tracking-tight ${collapsedAware ? "group-data-[collapsible=icon]:hidden" : ""}`}>
        CodeArena
      </span>
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" variant="sidebar">
      <SidebarHeader className="h-12 justify-center px-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <Logo collapsedAware />
      </SidebarHeader>
      <SidebarContent className="gap-3 px-1 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="p-0 px-1">
            <SidebarGroupLabel className="sr-only">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                {group.items.map((item) => {
                  const isActive = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className="rounded-md px-3 font-normal text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                      >
                        <Link href={item.href}>
                          <item.icon strokeWidth={1.75} />
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
