'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getStoredToken, getUserSubmissions } from '@/lib/api';
import { Header } from "@/components/header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DifficultyLabel, PageHeader, StatTile, VerdictBadge } from "@/components/judge-ui";
import { formatTime, getLanguage, verdictOf } from "@/lib/judge";

interface Submission {
  id: string;
  success: boolean;
  error?: string | null;
  verdict?: string;
  code: string;
  language: string;
  date: string;
  submittedAt: string;
  testsPassed: number;
  totalTests: number;
  executionTime: number;
  problem: {
    id: string;
    title: string;
    difficulty: string;
  };
}

interface SubmissionStats {
  totalSubmissions: number;
  successfulSubmissions: number;
  successRate: string;
  uniqueProblemsSolved: number;
  totalProblems: number;
  averageExecutionTime: number;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    const token = getStoredToken();
    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    try {
      const response = await getUserSubmissions(token);
      if (response.success) {
        setSubmissions(response.data.submissions);
        setStats(response.data.statistics);
      } else {
        setError(response.error || 'Failed to load submissions');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="min-h-[calc(100vh-3rem)] flex-1 bg-background px-5 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <PageHeader
              title="Submissions"
              description="Every solution you have sent to the judge, newest first."
            />

            {needsLogin ? (
              <div className="py-10">
                <p className="text-sm text-muted-foreground">Log in to see your submission history.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            ) : error ? (
              <div className="py-10">
                <p className="text-sm text-verdict-wa">{error}</p>
                <Button onClick={loadSubmissions} variant="outline" size="sm" className="mt-4">
                  Try again
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
                  <StatTile
                    label="Submissions"
                    value={loading || !stats ? '—' : stats.totalSubmissions}
                    hint={stats ? `across ${stats.totalProblems} problems` : undefined}
                  />
                  <StatTile
                    label="Acceptance"
                    value={loading || !stats ? '—' : `${stats.successRate}%`}
                    hint={stats ? `${stats.successfulSubmissions} accepted` : undefined}
                                      />
                  <StatTile label="Problems solved" value={loading || !stats ? '—' : stats.uniqueProblemsSolved} />
                  <StatTile label="Avg runtime" value={loading || !stats ? '—' : `${stats.averageExecutionTime} ms`} />
                </div>

                <div>
                  <div className="grid grid-cols-[5.5rem_1fr_5rem] items-center gap-3 border-b border-border py-2 text-xs text-muted-foreground md:grid-cols-[5.5rem_1fr_6rem_6rem_5rem_5rem_8rem]">
                    <span>Verdict</span>
                    <span>Problem</span>
                    <span className="hidden md:block">Difficulty</span>
                    <span className="hidden md:block">Language</span>
                    <span className="hidden md:block">Tests</span>
                    <span>Time</span>
                    <span className="hidden md:block">Submitted</span>
                  </div>

                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="border-b border-border py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </div>
                    ))
                  ) : submissions.length === 0 ? (
                    <div className="py-12">
                      <p className="text-sm text-muted-foreground">No submissions yet.</p>
                      <Button asChild size="sm" className="mt-4">
                        <Link href="/practice">Browse problems</Link>
                      </Button>
                    </div>
                  ) : (
                    submissions.map((s) => (
                      <div key={s.id} className="border-b border-border">
                        <button
                          onClick={() => setOpen(open === s.id ? null : s.id)}
                          aria-expanded={open === s.id}
                          className="grid w-full grid-cols-[5.5rem_1fr_5rem] items-center gap-3 py-3 text-left text-sm md:grid-cols-[5.5rem_1fr_6rem_6rem_5rem_5rem_8rem]"
                        >
                          <span>
                            <VerdictBadge verdict={verdictOf(s)} short />
                          </span>
                          <span className="truncate text-foreground">{s.problem.title}</span>
                          <span className="hidden md:block">
                            <DifficultyLabel difficulty={s.problem.difficulty} className="text-xs" />
                          </span>
                          <span className="hidden font-mono text-xs text-muted-foreground md:block">
                            {getLanguage(s.language).label}
                          </span>
                          <span className="tabular hidden font-mono text-xs text-muted-foreground md:block">
                            {s.testsPassed ?? 0}/{s.totalTests ?? 0}
                          </span>
                          <span className="tabular font-mono text-xs text-muted-foreground">{formatTime(s.executionTime)}</span>
                          <span className="hidden font-mono text-xs text-muted-foreground md:block">
                            {formatDate(s.submittedAt || s.date)}
                          </span>
                        </button>
                        {open === s.id && (
                          <div className="pb-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="font-mono text-xs text-muted-foreground">{getLanguage(s.language).file}</span>
                              <Link href={`/solve/${s.problem.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                                open problem →
                              </Link>
                            </div>
                            <pre className="max-h-80 overflow-auto whitespace-pre font-mono text-[13px] leading-relaxed text-editor-foreground">
                              {s.code}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
