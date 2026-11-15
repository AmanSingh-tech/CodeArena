// lib/api.ts

// NEXT_PUBLIC_NEXTJS_URL is the name used in existing deployments;
// NEXT_PUBLIC_BACKEND_URL is the one the README and docker-compose set.
export const BASE_URL =
  process.env.NEXT_PUBLIC_NEXTJS_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export async function loginUser(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/new/user/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  return res.json();
}

export async function registerUser(data: {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  dob: string;
}) {
  const res = await fetch(`${BASE_URL}/new/user/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}


export async function getProblems() {
  const res = await fetch(`${BASE_URL}/new/problems/problems`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

export async function getProblem(id: string) {
  const res = await fetch(`${BASE_URL}/new/problems/problem/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

export async function createProblem(data: {
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  testCases: Array<{ input: string; output: string }>;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/new/problems/createProblem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      tags: data.tags,
      testCases: data.testCases,
    }),
  });

  return res.json();
}

export async function getUserProfile(token: string) {
  const res = await fetch(`${BASE_URL}/user/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${token}`,
    },
  });

  return res.json();
}

// Judge a solution against every test case of a problem and record the submission.
export async function submitCode(data: {
  problemId: string;
  code: string;
  language: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/new/evaluation/submit/${data.problemId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      code: data.code,
      language: data.language,
      usertoken: data.token,
    }),
  });

  return res.json();
}

// Run a solution against a problem's test cases without recording a submission.
export async function runCode(data: {
  problemId: string;
  code: string;
  language: string;
  token?: string;
}) {
  const res = await fetch(`${BASE_URL}/new/evaluation/run/${data.problemId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: data.code,
      language: data.language,
    }),
  });

  return res.json();
}

// Run code once against custom stdin.
export async function runCustom(data: {
  code: string;
  language: string;
  inputs: string;
}) {
  const res = await fetch(`${BASE_URL}/new/evaluation/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

// The signed-in user's submissions for one problem, newest first.
export async function getProblemSubmissions(problemId: string, token: string) {
  const res = await fetch(`${BASE_URL}/user/submission/${problemId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${token}`,
    },
  });

  return res.json();
}

export async function getHint(problemId: string) {
  const res = await fetch(`${BASE_URL}/ai/gethint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pid: problemId }),
  });

  return res.json();
}

export async function findError(problemId: string, code: string) {
  const res = await fetch(`${BASE_URL}/ai/find_error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pid: problemId, code }),
  });

  return res.json();
}

export async function getAIResponse(data: {
  problemId: string;
  userCode?: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      problemId: data.problemId,
      userCode: data.userCode,
    }),
  });

  return res.json();
}

export async function getInternshipRecommendations(data: {
  skills: string[];
  interests: string[];
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/internship-recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      skills: data.skills,
      interests: data.interests,
    }),
  });

  return res.json();
}

export async function analyzeResume(data: {
  resumeText: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/analyze-resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      resumeText: data.resumeText,
    }),
  });

  return res.json();
}

export async function generateCoverLetter(data: {
  jobDescription: string;
  resumeText: string;
  companyName: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/generate-cover-letter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      jobDescription: data.jobDescription,
      resumeText: data.resumeText,
      companyName: data.companyName,
    }),
  });

  return res.json();
}

export async function getInterviewPrep(data: {
  jobRole: string;
  companyName: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/interview-prep`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      jobRole: data.jobRole,
      companyName: data.companyName,
    }),
  });

  return res.json();
}

export async function getApplicationInsights(data: {
  resumeText: string;
  targetRole: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/application-insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      resumeText: data.resumeText,
      targetRole: data.targetRole,
    }),
  });

  return res.json();
}

export async function getSalaryAdvice(data: {
  jobRole: string;
  location: string;
  experience: string;
  token: string;
}) {
  const res = await fetch(`${BASE_URL}/ai/salary-advice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      jobRole: data.jobRole,
      location: data.location,
      experience: data.experience,
    }),
  });

  return res.json();
}

export async function getLeaderboard() {
  const res = await fetch(`${BASE_URL}/new/user/leaderboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

export async function getLeaderboardStats() {
  const res = await fetch(`${BASE_URL}/new/user/leaderboard-stats`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

export async function getUserSubmissions(usertoken: string) {
  const res = await fetch(`${BASE_URL}/new/user/submissions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "usertoken": `Bearer ${usertoken}`,
    },
  });

  return res.json();
}
