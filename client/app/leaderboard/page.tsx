'use client';

import React, { useState, useEffect } from 'react';
import { getLeaderboard, getLeaderboardStats } from '@/lib/api';
import { Header } from "@/components/header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { PageHeader, StatTile } from "@/components/judge-ui";

interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  rating: number;
  solved: number;
  contests: number;
  recentActivity: number;
  avatar: string;
  joinDate: string;
  rank: number;
}

interface LeaderboardStats {
  topRated: { name: string; username?: string; rating: number; solved?: number };
  mostSolved: { name: string; username?: string; rating?: number; solved: number };
  totalUsers: number;
  totalSolves: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaderboardData, statsData] = await Promise.all([getLeaderboard(), getLeaderboardStats()]);
        if (leaderboardData.success) setUsers(leaderboardData.data);
        else setError(leaderboardData.error || 'Failed to load the leaderboard');
        if (statsData.success) setStats(statsData.stats);
      } catch {
        setError('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="min-h-[calc(100vh-3rem)] flex-1 bg-background px-5 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <PageHeader
              title="Leaderboard"
              description="Rating starts at 1200 and grows with each distinct problem solved: +10 easy, +25 medium, +50 hard."
            />

            <div className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
              <StatTile label="Coders" value={loading || !stats ? '—' : stats.totalUsers} />
              <StatTile label="Problems solved" value={loading || !stats ? '—' : stats.totalSolves} />
              <StatTile
                label="Top rating"
                value={loading || !stats ? '—' : stats.topRated.rating}
                hint={stats?.topRated.name}
                              />
              <StatTile
                label="Most solved"
                value={loading || !stats ? '—' : stats.mostSolved.solved}
                hint={stats?.mostSolved.name}
              />
            </div>

            <div>
              <div className="grid grid-cols-[3rem_1fr_5rem_5rem] items-center gap-3 border-b border-border py-2 text-xs text-muted-foreground md:grid-cols-[3rem_1fr_5rem_5rem_6rem]">
                <span>#</span>
                <span>Coder</span>
                <span className="text-right">Rating</span>
                <span className="text-right">Solved</span>
                <span className="hidden text-right md:block">Last 30d</span>
              </div>

              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-b border-border py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : error ? (
                <div className="py-12 text-sm text-verdict-wa">{error}</div>
              ) : users.length === 0 ? (
                <div className="py-12 text-sm text-muted-foreground">
                  Nobody is ranked yet. Solve a problem to be first.
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[3rem_1fr_5rem_5rem] items-center gap-3 border-b border-border py-3 text-sm md:grid-cols-[3rem_1fr_5rem_5rem_6rem]"
                  >
                    <span className="tabular font-mono text-xs text-muted-foreground">
                      {user.rank}
                    </span>
                    <span className="min-w-0 truncate">
                      <span className="text-foreground">{user.username}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{user.name}</span>
                    </span>
                    <span className="tabular text-right font-mono text-foreground">{user.rating}</span>
                    <span className="tabular text-right font-mono text-muted-foreground">{user.solved}</span>
                    <span className="tabular hidden text-right font-mono text-muted-foreground md:block">
                      {user.recentActivity > 0 ? `+${user.recentActivity}` : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
