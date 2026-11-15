// Judge engine: compile a submission once, then run it against every test case
// under time, memory and output limits, and report a verdict per test.
//
// Verdicts: AC (accepted), WA (wrong answer), TLE (time limit exceeded),
// MLE (memory limit exceeded), RE (runtime error), CE (compilation error).

import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { resolveLanguage } from "./languages.js";

export const DEFAULTS = {
  timeLimitMs: 3000,
  memoryLimitMb: 256,
  compileTimeoutMs: 15000,
  maxOutputBytes: 1024 * 1024, // 1 MB of stdout per test
  maxTimeLimitMs: 10000,
  maxMemoryLimitMb: 1024,
};

const IS_LINUX = process.platform === "linux";

function clamp(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

// Peak resident memory of a live process, in kB (Linux only).
function readPeakMemoryKb(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const match = status.match(/VmHWM:\s+(\d+)\s+kB/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

function killTree(child) {
  try {
    // The child is a process-group leader, so this also takes out anything it forked.
    process.kill(-child.pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {}
  }
}

// Run one command with limits. Never rejects; always resolves with a result.
function execute(argv, { cwd, input = "", timeoutMs, maxOutputBytes, addressSpaceKb = 0 }) {
  return new Promise((resolve) => {
    let command = argv[0];
    let args = argv.slice(1);

    if (addressSpaceKb > 0 && IS_LINUX) {
      // Apply the limit in a shell, then exec so the pid we watch is the program itself.
      command = "sh";
      args = ["-c", `ulimit -v ${addressSpaceKb}; exec "$@"`, "sh", ...argv];
    }

    const startedAt = process.hrtime.bigint();
    let child;
    try {
      child = spawn(command, args, { cwd, detached: true, stdio: ["pipe", "pipe", "pipe"] });
    } catch (err) {
      return resolve({ spawnError: err.message, stdout: "", stderr: "", timeMs: 0, memoryKb: 0 });
    }

    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    let peakMemoryKb = 0;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);

    const memoryPoll = IS_LINUX
      ? setInterval(() => {
          peakMemoryKb = Math.max(peakMemoryKb, readPeakMemoryKb(child.pid));
        }, 4)
      : null;

    const finish = (extra) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (memoryPoll) clearInterval(memoryPoll);
      const timeMs = Number((process.hrtime.bigint() - startedAt) / 1000000n);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        timedOut,
        outputExceeded,
        timeMs,
        memoryKb: peakMemoryKb,
        ...extra,
      });
    };

    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        outputExceeded = true;
        killTree(child);
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk) => {
      // Keep only the first 64 kB of stderr; it is shown to the user, not judged.
      if (stderrBytes < 64 * 1024) stderrChunks.push(chunk);
      stderrBytes += chunk.length;
    });

    child.stdin.on("error", () => {}); // program exited without reading its input
    child.stdin.end(input);

    child.on("error", (err) => finish({ spawnError: err.message }));
    child.on("close", (exitCode, signal) => finish({ exitCode, signal }));
  });
}

// Compare outputs the way most judges do: ignore trailing whitespace on each
// line and trailing blank lines, but nothing else.
export function outputsMatch(actual, expected) {
  const normalize = (text) =>
    String(text ?? "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd();
  return normalize(actual) === normalize(expected);
}

function trimForDisplay(text, max = 2000) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max)}\n… (truncated)` : value;
}

function classifyRun(result, { memoryLimitMb, usesAddressSpaceLimit }) {
  if (result.spawnError) return "RE";
  if (result.timedOut) return "TLE";
  if (result.outputExceeded) return "RE";

  const memoryLimitKb = memoryLimitMb * 1024;
  if (result.memoryKb >= memoryLimitKb) return "MLE";

  if (result.exitCode !== 0) {
    const stderr = result.stderr || "";
    const outOfMemory =
      /std::bad_alloc|MemoryError|OutOfMemoryError|heap out of memory|Cannot allocate memory/i.test(stderr) ||
      // An allocation refused by `ulimit -v` usually shows up as a crash close to the limit.
      (usesAddressSpaceLimit && result.memoryKb >= memoryLimitKb * 0.9);
    return outOfMemory ? "MLE" : "RE";
  }
  return null; // ran cleanly; caller decides AC or WA
}

/**
 * Judge a submission.
 *
 * @param {object}   job
 * @param {string}   job.language       cpp | c | python | javascript | java (or an alias)
 * @param {string}   job.code           source code
 * @param {Array}    job.testCases      [{ input, output? }]; a test without `output` is run but not judged
 * @param {number}  [job.timeLimitMs]   per-test time limit
 * @param {number}  [job.memoryLimitMb] per-test memory limit
 * @param {boolean} [job.stopOnFail]    stop at the first test that is not AC
 */
export async function judge(job) {
  const language = resolveLanguage(job.language);
  if (!language) {
    return { verdict: "CE", compileError: `Unsupported language: ${job.language}`, results: [], passed: 0, total: 0 };
  }

  const testCases = Array.isArray(job.testCases) && job.testCases.length > 0 ? job.testCases : [{ input: "" }];
  const timeLimitMs = clamp(job.timeLimitMs, DEFAULTS.timeLimitMs, 100, DEFAULTS.maxTimeLimitMs);
  const memoryLimitMb = clamp(job.memoryLimitMb, DEFAULTS.memoryLimitMb, 16, DEFAULTS.maxMemoryLimitMb);
  const effectiveTimeLimitMs = timeLimitMs + (language.timeBonusMs || 0);

  // Every job gets its own throwaway directory, removed no matter how the job ends.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "judge-"));

  try {
    fs.writeFileSync(path.join(dir, language.source), String(job.code ?? ""));

    let compileTimeMs = 0;
    if (language.compile) {
      const compiled = await execute(language.compile(dir), {
        cwd: dir,
        timeoutMs: DEFAULTS.compileTimeoutMs,
        maxOutputBytes: DEFAULTS.maxOutputBytes,
      });
      compileTimeMs = compiled.timeMs;
      if (compiled.spawnError || compiled.timedOut || compiled.exitCode !== 0) {
        const reason = compiled.spawnError
          ? `Compiler unavailable: ${compiled.spawnError}`
          : compiled.timedOut
            ? "Compilation timed out"
            : compiled.stderr || compiled.stdout || "Compilation failed";
        return {
          verdict: "CE",
          // Do not leak the server's temp path in compiler messages.
          compileError: trimForDisplay(reason.split(`${dir}/`).join(""), 8000),
          results: [],
          passed: 0,
          total: testCases.length,
          compileTimeMs,
        };
      }
    }

    const results = [];
    let passed = 0;
    let overall = "AC";
    let maxTimeMs = 0;
    let maxMemoryKb = 0;

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i] || {};
      const run = await execute(language.run(dir, memoryLimitMb), {
        cwd: dir,
        input: String(test.input ?? ""),
        timeoutMs: effectiveTimeLimitMs,
        maxOutputBytes: DEFAULTS.maxOutputBytes,
        // Leave headroom above the limit so we can measure and report MLE ourselves.
        addressSpaceKb: language.addressSpaceLimit ? (memoryLimitMb + 64) * 1024 : 0,
      });

      let verdict = classifyRun(run, { memoryLimitMb, usesAddressSpaceLimit: language.addressSpaceLimit });
      const judged = test.output !== undefined && test.output !== null;
      if (!verdict) verdict = !judged || outputsMatch(run.stdout, test.output) ? "AC" : "WA";

      maxTimeMs = Math.max(maxTimeMs, run.timeMs);
      maxMemoryKb = Math.max(maxMemoryKb, run.memoryKb);
      if (verdict === "AC") passed++;
      else if (overall === "AC") overall = verdict;

      results.push({
        test: i + 1,
        verdict,
        timeMs: run.timeMs,
        memoryKb: run.memoryKb,
        stdout: trimForDisplay(run.stdout),
        stderr: trimForDisplay(run.outputExceeded ? "Output limit exceeded" : run.stderr.split(`${dir}/`).join("")),
        exitCode: run.exitCode ?? null,
        signal: run.signal ?? null,
      });

      // A timed-out solution will time out again; do not hold a worker for every remaining test.
      if (verdict === "TLE" || (verdict !== "AC" && job.stopOnFail)) break;
    }

    return {
      verdict: overall,
      compileError: null,
      results,
      passed,
      total: testCases.length,
      maxTimeMs,
      maxMemoryKb,
      compileTimeMs,
      limits: { timeLimitMs, memoryLimitMb },
    };
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => {});
  }
}
