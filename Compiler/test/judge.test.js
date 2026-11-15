import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { judge, outputsMatch } from "../judge/judge.js";
import { JobQueue } from "../judge/queue.js";

const has = (bin) => spawnSync("which", [bin]).status === 0;

const SUM = {
  cpp: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}`,
  c: `#include <stdio.h>\nint main(){long long a,b;scanf("%lld %lld",&a,&b);printf("%lld\\n",a+b);return 0;}`,
  python: `a, b = map(int, input().split())\nprint(a + b)`,
  javascript: `const [a,b]=require("fs").readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(a+b);`,
  java: `import java.util.*;\npublic class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);System.out.println(s.nextLong()+s.nextLong());}}`,
};

const TESTS = [
  { input: "1 2\n", output: "3\n" },
  { input: "10 -4\n", output: "6" },
  { input: "1000000000 1000000000", output: "2000000000\n" },
];

const toolchain = { cpp: "g++", c: "gcc", python: "python3", javascript: "node", java: "javac" };

for (const [language, code] of Object.entries(SUM)) {
  test(`${language}: accepted on all tests`, { skip: !has(toolchain[language]) }, async () => {
    const result = await judge({ language, code, testCases: TESTS });
    assert.equal(result.verdict, "AC", JSON.stringify(result));
    assert.equal(result.passed, 3);
    assert.equal(result.total, 3);
  });
}

test("wrong answer is reported with the failing test", { skip: !has("python3") }, async () => {
  const result = await judge({ language: "python", code: `print(42)`, testCases: TESTS });
  assert.equal(result.verdict, "WA");
  assert.equal(result.passed, 0);
  assert.equal(result.results.length, 3);
});

test("stopOnFail stops at the first failing test", { skip: !has("python3") }, async () => {
  const result = await judge({ language: "python", code: `print(42)`, testCases: TESTS, stopOnFail: true });
  assert.equal(result.results.length, 1);
});

test("infinite loop is TLE", { skip: !has("python3") }, async () => {
  const result = await judge({
    language: "python",
    code: `while True:\n    pass`,
    testCases: [{ input: "", output: "" }],
    timeLimitMs: 500,
  });
  assert.equal(result.verdict, "TLE");
});

test("compile error is CE and hides the temp path", { skip: !has("g++") }, async () => {
  const result = await judge({ language: "cpp", code: `int main(){ return oops; }`, testCases: TESTS });
  assert.equal(result.verdict, "CE");
  assert.match(result.compileError, /oops/);
  assert.doesNotMatch(result.compileError, /judge-/);
});

test("non-zero exit is RE", { skip: !has("python3") }, async () => {
  const result = await judge({ language: "python", code: `raise SystemExit(3)`, testCases: TESTS });
  assert.equal(result.verdict, "RE");
});

test("over-allocation is MLE", { skip: !has("python3") || process.platform !== "linux" }, async () => {
  const result = await judge({
    language: "python",
    code: `x = bytearray(600 * 1024 * 1024)\nprint(len(x))`,
    testCases: [{ input: "", output: "x" }],
    memoryLimitMb: 64,
  });
  assert.equal(result.verdict, "MLE", JSON.stringify(result));
});

test("unsupported language is rejected", async () => {
  const result = await judge({ language: "brainfuck", code: "+", testCases: TESTS });
  assert.equal(result.verdict, "CE");
});

test("outputsMatch ignores trailing whitespace only", () => {
  assert.ok(outputsMatch("1 2 \n3\n\n", "1 2\n3"));
  assert.ok(outputsMatch("a\r\nb", "a\nb"));
  assert.ok(!outputsMatch("1  2", "1 2"));
  assert.ok(!outputsMatch(" 1", "1"));
});

test("queue caps concurrency and rejects overflow", async () => {
  const queue = new JobQueue({ concurrency: 2, maxQueued: 1 });
  let running = 0;
  let peak = 0;
  const job = async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 30));
    running--;
    return "done";
  };
  const jobs = [queue.run(job), queue.run(job), queue.run(job)];
  await assert.rejects(queue.run(job), { code: "QUEUE_FULL" });
  assert.deepEqual(await Promise.all(jobs), ["done", "done", "done"]);
  assert.equal(peak, 2);
  assert.equal(queue.stats().rejected, 1);
});
