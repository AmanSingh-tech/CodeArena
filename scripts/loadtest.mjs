#!/usr/bin/env node
// Load test for the judge service.
//
//   node scripts/loadtest.mjs [--url http://localhost:3002] [--requests 200] [--concurrency 20] [--language cpp]
//
// Sends real submissions (compile + 3 test cases each) straight to the compiler
// service and reports throughput and latency percentiles. Needs Node 18+.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, [])
);

const url = (args.url || "http://localhost:3002").replace(/\/$/, "");
const total = Number(args.requests) || 200;
const concurrency = Number(args.concurrency) || 20;
const language = args.language || "cpp";

const SOLUTIONS = {
  cpp: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}`,
  c: `#include <stdio.h>\nint main(){long long a,b;scanf("%lld %lld",&a,&b);printf("%lld\\n",a+b);return 0;}`,
  python: `a, b = map(int, input().split())\nprint(a + b)`,
  javascript: `const [a,b]=require("fs").readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(a+b);`,
  java: `import java.util.*;\npublic class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);System.out.println(s.nextLong()+s.nextLong());}}`,
};

if (!SOLUTIONS[language]) {
  console.error(`Unknown language "${language}". Use one of: ${Object.keys(SOLUTIONS).join(", ")}`);
  process.exit(1);
}

const body = JSON.stringify({
  language,
  code: SOLUTIONS[language],
  testCases: [
    { input: "1 2\n", output: "3" },
    { input: "10 -4\n", output: "6" },
    { input: "1000000000 1000000000\n", output: "2000000000" },
  ],
});

const latencies = [];
const verdicts = {};
let rejected = 0;
let failed = 0;
let next = 0;

async function worker() {
  while (next < total) {
    next++;
    const started = performance.now();
    try {
      const res = await fetch(`${url}/judge`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const data = await res.json();
      if (res.status === 503) rejected++;
      else if (!data.success) failed++;
      else {
        verdicts[data.verdict] = (verdicts[data.verdict] || 0) + 1;
        latencies.push(performance.now() - started);
      }
    } catch {
      failed++;
    }
  }
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

const health = await fetch(`${url}/health`).then((r) => r.json()).catch(() => null);
if (!health) {
  console.error(`Judge is not reachable at ${url}`);
  process.exit(1);
}

console.log(`Judge at ${url}: ${health.queue.concurrency} workers`);
console.log(`Sending ${total} ${language} submissions, ${concurrency} at a time…`);

const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const seconds = (performance.now() - startedAt) / 1000;

latencies.sort((a, b) => a - b);
const ok = latencies.length;

console.log("");
console.log(`judged        ${ok}/${total}  (${rejected} rejected by a full queue, ${failed} errors)`);
console.log(`verdicts      ${Object.entries(verdicts).map(([v, n]) => `${v}=${n}`).join(" ") || "none"}`);
console.log(`wall time     ${seconds.toFixed(2)} s`);
console.log(`throughput    ${(ok / seconds).toFixed(1)} submissions/s  (${Math.round((ok / seconds) * 60)} per minute)`);
if (ok > 0) {
  console.log(`latency p50   ${percentile(latencies, 50).toFixed(0)} ms`);
  console.log(`latency p95   ${percentile(latencies, 95).toFixed(0)} ms`);
  console.log(`latency p99   ${percentile(latencies, 99).toFixed(0)} ms`);
}
