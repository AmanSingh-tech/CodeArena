// Language definitions for the judge.
//
// Each language says how to name the source file, how to compile it (optional)
// and how to run it. `addressSpaceLimit` marks runtimes where a hard
// `ulimit -v` is safe; Node and the JVM reserve far more virtual memory than
// they use, so they are capped through their own heap flags instead.

const LANGUAGES = {
  cpp: {
    aliases: ["cpp", "c++", "cc", "cxx"],
    source: "main.cpp",
    compile: (dir) => ["g++", "-O2", "-std=c++17", "-o", `${dir}/main`, `${dir}/main.cpp`],
    run: (dir) => [`${dir}/main`],
    addressSpaceLimit: true,
  },
  c: {
    aliases: ["c"],
    source: "main.c",
    compile: (dir) => ["gcc", "-O2", "-o", `${dir}/main`, `${dir}/main.c`, "-lm"],
    run: (dir) => [`${dir}/main`],
    addressSpaceLimit: true,
  },
  python: {
    aliases: ["python", "py", "python3"],
    source: "main.py",
    run: (dir) => ["python3", `${dir}/main.py`],
    addressSpaceLimit: true,
  },
  javascript: {
    aliases: ["javascript", "js", "node"],
    source: "main.js",
    run: (dir, memoryLimitMb) => ["node", `--max-old-space-size=${memoryLimitMb}`, `${dir}/main.js`],
    addressSpaceLimit: false,
  },
  java: {
    aliases: ["java"],
    // Submissions must declare `public class Main` (or any non-public class with main in Main).
    source: "Main.java",
    compile: (dir) => ["javac", "-d", dir, `${dir}/Main.java`],
    run: (dir, memoryLimitMb) => ["java", `-Xmx${memoryLimitMb}m`, "-Xss64m", "-cp", dir, "Main"],
    addressSpaceLimit: false,
    // JVM startup is slow and not the submission's fault.
    timeBonusMs: 1000,
  },
};

const ALIASES = new Map();
for (const [name, def] of Object.entries(LANGUAGES)) {
  for (const alias of def.aliases) ALIASES.set(alias, { name, ...def });
}

export function resolveLanguage(language) {
  if (typeof language !== "string") return null;
  return ALIASES.get(language.trim().toLowerCase()) || null;
}

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);
