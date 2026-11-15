import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import getTestCases from '../Functions/get_testcases.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const route = Router();
const prisma = new PrismaClient();
const jwtpasskey = process.env.JWT_PASSKEY;

const COMPILER_URL = () => process.env.COMPILER_SERVICE_URL || 'http://localhost:3002';
const MAX_CODE_LENGTH = 64 * 1024;
// How many leading test cases are public samples (matches GET /problem/:id).
const SAMPLE_TEST_COUNT = 2;

const VERDICT_LABELS = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
  RE: 'Runtime Error',
  CE: 'Compilation Error',
};

// Token may arrive as `Authorization: Bearer`, the legacy `usertoken` header,
// or the legacy `usertoken` body field.
function readToken(req) {
  const raw = req.headers.authorization || req.headers.usertoken || req.body?.usertoken;
  if (!raw || typeof raw !== 'string') return null;
  return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
}

async function callCompiler(path, payload) {
  const response = await axios.post(`${COMPILER_URL()}${path}`, payload, {
    timeout: 120000,
    maxBodyLength: Infinity,
    // 503 = judge queue full; handled by the caller rather than thrown.
    validateStatus: (status) => status < 500 || status === 503,
  });
  return response;
}

function sortTestCases(testCases) {
  // Stable order so "the first two" always means the same samples.
  return [...testCases].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Run against a problem's test cases without recording a submission.
route.post('/run/:pid', async (req, res) => {
  const { code, language } = req.body;
  const { pid } = req.params;

  if (!pid || !code || !language) {
    return res.json({
      success: false,
      errorcode: 1,
      msg: "Send All Parameters",
      err: "Send All Parameters"
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.json({ success: false, errorcode: 1, msg: "Code is too long", err: "Code is too long" });
  }

  try {
    const problem = await getTestCases(pid);

    if (problem.success == false) {
      return res.json({
        success: false,
        errorcode: 2,
        msg: "P_id does not exist or is in-valid",
        err: "P_id does not exist or is in-valid"
      });
    }

    const testCases = sortTestCases(problem.testCases);
    if (testCases.length === 0) {
      return res.json({ success: true, msg: "No test cases for this problem", totalTestCases: 0 });
    }

    let response;
    try {
      response = await callCompiler('/judge', {
        code,
        language,
        testCases: testCases.map((t) => ({ input: t.input, output: t.output })),
        stopOnFail: true,
      });
    } catch (err) {
      return res.json({
        success: false,
        errorcode: 5,
        msg: "Judge is unavailable",
        err: err.message,
      });
    }

    const result = response.data;
    if (response.status === 503 || !result.success) {
      return res.json({
        success: false,
        errorcode: 5,
        msg: response.status === 503 ? "Judge is busy, try again shortly" : "Judge error",
        err: result.error || "Judge error",
      });
    }

    if (result.verdict === 'CE') {
      return res.json({
        success: false,
        errorcode: 3,
        msg: "Compilation Failed",
        err: result.compileError,
        verdict: 'CE',
        failedTestCase: 0,
        totalTestCases: testCases.length,
      });
    }

    if (result.verdict !== 'AC') {
      const failed = result.results[result.results.length - 1];
      const test = testCases[failed.test - 1];
      const isSample = failed.test <= SAMPLE_TEST_COUNT;
      return res.json({
        success: false,
        errorcode: 4,
        msg: `${VERDICT_LABELS[failed.verdict]} on Test Case ${failed.test}`,
        verdict: failed.verdict,
        // Hidden tests are not revealed; only the public samples are echoed back.
        testcase: isSample ? test.input : "(hidden test case)",
        expected: isSample ? (test.output || "").trim() : "(hidden)",
        received: isSample ? (failed.stdout || "").trim() : "(hidden)",
        err: failed.stderr || "",
        failedTestCase: failed.test,
        totalTestCases: testCases.length,
        executionTime: failed.timeMs,
        memoryKb: failed.memoryKb,
      });
    }

    return res.json({
      success: true,
      msg: "All Test Cases Passed",
      verdict: 'AC',
      totalTestCases: testCases.length,
      executionTime: result.maxTimeMs,
      memoryKb: result.maxMemoryKb,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      errorcode: 6,
      msg: "Internal Server Error",
      err: error.message,
    });
  }
});


// Judge a submission against every test case and record the result.
route.post('/submit/:pid', async (req, res) => {
  const { pid } = req.params;
  const { code, language } = req.body;
  const usertoken = readToken(req);

  if (!pid || !usertoken || !code || !language) {
    return res.json({
      success: false,
      msg: "Send All Data",
      error: "Missing required parameters"
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.json({ success: false, msg: "Code is too long", error: "Code is too long" });
  }

  try {
    let decode;
    try {
      decode = jwt.verify(usertoken, jwtpasskey);
    } catch {
      return res.json({
        success: false,
        msg: "Please log in again",
        error: "Invalid authentication token"
      });
    }

    const uid = decode.id;

    const auth_user = await prisma.user.findFirst({
      where: { id: uid }
    });

    if (!auth_user) {
      return res.json({
        success: false,
        msg: "User Does not Exist",
        error: "User not found"
      });
    }

    const problem = await getTestCases(pid);

    if (!problem.success) {
      return res.json({
        success: false,
        msg: "Problem ID is invalid",
        error: "Problem not found or has no test cases"
      });
    }

    const testCases = sortTestCases(problem.testCases);
    if (testCases.length === 0) {
      return res.json({
        success: false,
        msg: "This problem has no test cases yet",
        error: "Problem has no test cases"
      });
    }

    let response;
    try {
      response = await callCompiler('/judge', {
        code,
        language,
        testCases: testCases.map((t) => ({ input: t.input, output: t.output })),
      });
    } catch (err) {
      return res.json({
        success: false,
        msg: "Judge is unavailable, your submission was not recorded",
        error: `Compiler service error: ${err.message}`
      });
    }

    const result = response.data;
    if (response.status === 503 || !result.success) {
      return res.json({
        success: false,
        msg: response.status === 503 ? "Judge is busy, try again shortly" : "Judge error",
        error: result.error || "Judge error"
      });
    }

    const verdict = result.verdict;
    const isSuccessful = verdict === 'AC';
    const totalTests = testCases.length;
    const passedTests = result.passed || 0;
    const executionTime = result.maxTimeMs || 0;
    const memoryKb = result.maxMemoryKb || 0;
    const accuracy = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const testResults = (result.results || []).map((r) => {
      const test = testCases[r.test - 1];
      const isSample = r.test <= SAMPLE_TEST_COUNT;
      return {
        testCase: r.test,
        passed: r.verdict === 'AC',
        verdict: r.verdict,
        executionTime: r.timeMs,
        memoryKb: r.memoryKb,
        // Only public samples expose their data.
        ...(isSample
          ? {
              input: test.input,
              expected: (test.output || "").trim(),
              actual: (r.stdout || "").trim(),
              error: r.stderr || undefined,
            }
          : {}),
      };
    });

    const submission = await prisma.solve.create({
      data: {
        success: isSuccessful,
        // The verdict (and compiler output, if any) is kept in the existing `error` column.
        error: isSuccessful
          ? null
          : verdict === 'CE'
            ? `CE: ${(result.compileError || '').slice(0, 2000)}`
            : verdict,
        code: code,
        language: language,
        problemId: pid,
        userId: uid,
        testsPassed: passedTests,
        totalTests: totalTests,
        executionTime: executionTime,
        submittedAt: new Date()
      }
    });

    return res.json({
      success: true,
      accepted: isSuccessful,
      verdict,
      submissionId: submission.id,
      msg: isSuccessful
        ? "Submission Successful - All tests passed!"
        : `Submission Failed - ${VERDICT_LABELS[verdict] || 'Some tests failed'}`,
      results: {
        passedTests,
        totalTests,
        accuracy: Math.round(accuracy * 100) / 100,
        executionTime,
        memoryKb,
        verdict,
        status: VERDICT_LABELS[verdict] || "Wrong Answer",
        compileError: result.compileError || null,
        testResults,
      }
    });

  } catch (error) {
    console.error('Submission error:', error);
    return res.json({
      success: false,
      msg: "Submission error",
      error: error.message
    });
  }
});

// Run code against custom input (playground and "Run" in the solve view).
route.post('/run', async (req, res) => {
  const { code, language, inputs = "" } = req.body;

  if (!code || !language) {
    return res.json({
      success: false,
      error: "Code and language are required"
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.json({ success: false, error: "Code is too long", err: "Code is too long", output: "" });
  }

  try {
    const response = await callCompiler('/run', { code, language, inputs });
    const data = response.data;

    if (response.status === 503) {
      return res.json({
        success: false,
        error: "Judge is busy, try again shortly",
        err: "Judge is busy, try again shortly",
        output: ""
      });
    }

    if (data.success) {
      return res.json({
        success: true,
        output: data.verdict || "Code executed successfully!",
        verdict: data.verdict || "Execution completed",
        err: data.err || "",
        error: data.err || "",
        status: data.status || "OK",
        executionTime: data.timeMs ?? null,
        memoryKb: data.memoryKb ?? null,
      });
    } else {
      return res.json({
        success: false,
        error: data.error || "Execution failed",
        err: data.error || "Execution failed",
        output: ""
      });
    }

  } catch (error) {
    return res.json({
      success: false,
      error: `Compiler service error: ${error.message}`,
      err: `Compiler service error: ${error.message}`,
      output: ""
    });
  }
});

export default route;
