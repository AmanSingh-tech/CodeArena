import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";

import { judge } from "./judge/judge.js";
import { JobQueue } from "./judge/queue.js";
import { SUPPORTED_LANGUAGES } from "./judge/languages.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Submissions are CPU-bound, so run about one per core and queue the rest.
const queue = new JobQueue({
  concurrency: Number(process.env.MAX_CONCURRENT_JOBS) || Math.max(2, os.cpus().length),
  maxQueued: Number(process.env.MAX_QUEUED_JOBS) || 200,
});

const MAX_TEST_CASES = 200;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.send("<h1>HELLO FROM COMPILER</h1>");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", languages: SUPPORTED_LANGUAGES, queue: queue.stats() });
});

function rejectIfQueueFull(err, res) {
  if (err?.code !== "QUEUE_FULL") return false;
  res.status(503).json({ success: false, error: err.message });
  return true;
}

// Run code once against a single input. Response shape is kept stable for
// existing callers: `verdict` carries the program output and `err` its stderr.
app.post("/run", async (req, res) => {
  try {
    const { language = "cpp", code, inputs = "", timeLimitMs, memoryLimitMb } = req.body || {};

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        error: "Please provide both 'language' and 'code'.",
      });
    }

    const result = await queue.run(() =>
      judge({ language, code, testCases: [{ input: inputs }], timeLimitMs, memoryLimitMb })
    );

    if (result.verdict === "CE") {
      return res.json({
        success: true,
        verdict: "Execution failed",
        err: result.compileError,
        status: "CE",
      });
    }

    const run = result.results[0];
    let output = run.stdout.replace(/\r\n/g, "\n");
    if (run.verdict === "TLE") output = "TLE Time Limit Exceeded";
    else if (run.verdict === "MLE") output = "MLE Memory Limit Exceeded";
    else if (!output) output = run.verdict === "RE" ? "Execution failed" : "No Output";

    return res.json({
      success: true,
      verdict: output,
      err: run.verdict === "TLE" ? "Time Limit Exceeded" : run.stderr || "No Error",
      status: run.verdict === "AC" ? "OK" : run.verdict,
      timeMs: run.timeMs,
      memoryKb: run.memoryKb,
    });
  } catch (err) {
    if (rejectIfQueueFull(err, res)) return;
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error occurred during execution",
    });
  }
});

// Judge a submission against a batch of test cases: one compile, N runs.
app.post("/judge", async (req, res) => {
  try {
    const { language, code, testCases, timeLimitMs, memoryLimitMb, stopOnFail = false } = req.body || {};

    if (!language || !code) {
      return res.status(400).json({ success: false, error: "Please provide both 'language' and 'code'." });
    }
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ success: false, error: "'testCases' must be a non-empty array." });
    }
    if (testCases.length > MAX_TEST_CASES) {
      return res.status(400).json({ success: false, error: `At most ${MAX_TEST_CASES} test cases per request.` });
    }

    const result = await queue.run(() =>
      judge({ language, code, testCases, timeLimitMs, memoryLimitMb, stopOnFail })
    );

    return res.json({ success: true, ...result });
  } catch (err) {
    if (rejectIfQueueFull(err, res)) return;
    return res.status(500).json({ success: false, error: err.message || "Judge failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Compiler listening on port ${port} (${queue.concurrency} concurrent jobs)`);
});
