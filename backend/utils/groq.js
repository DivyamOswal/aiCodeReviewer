import Groq from "groq-sdk";
import path from "path";

const GITHUB_API = "https://api.github.com";

/** Parse   https://github.com/owner/repo   →  { owner, repo } */
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

/** Recursively fetch every file path in a repo tree */
async function fetchRepoTree(owner, repo, branch = "main") {
  for (const ref of [branch, "main", "master"]) {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.tree.filter((f) => f.type === "blob");
    }
  }
  throw new Error(`Could not fetch repo tree for ${owner}/${repo}`);
}

/** Fetch raw text content of one file (base64-decoded) */
async function fetchFileContent(owner, repo, filePath) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return null;
}

const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx",
  ".py", ".java", ".go", ".rs",
  ".c", ".cpp", ".cs", ".php",
  ".rb", ".swift", ".kt",
  ".html", ".css", ".scss",
  ".json", ".yaml", ".yml",
  ".md",
]);

function isCodeFile(filePath) {
  const lower = filePath.toLowerCase();
  if (/(node_modules|dist\/|build\/|\.lock$|package-lock\.json)/.test(lower)) return false;
  return CODE_EXTENSIONS.has(path.extname(lower));
}

export async function fetchRepoContents(repoUrl, { maxChars = 28_000, branch = "main" } = {}) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  console.log(`📦 Fetching tree for ${owner}/${repo}…`);

  const tree = await fetchRepoTree(owner, repo, branch);
  const codeFiles = tree.filter((f) => isCodeFile(f.path));
  console.log(`📂 ${codeFiles.length} code files found`);

  let combined = `# Repository: ${owner}/${repo}\n\n`;

  for (const file of codeFiles) {
    if (combined.length >= maxChars) break;
    const content = await fetchFileContent(owner, repo, file.path);
    if (!content) continue;

    const block = `\n\n## FILE: ${file.path}\n\`\`\`\n${content}\n\`\`\``;
    if (combined.length + block.length > maxChars) {
      combined += block.slice(0, maxChars - combined.length) + "\n… [truncated]";
      break;
    }
    combined += block;
  }

  return combined;
}

// ─────────────────────────────────────────────
//  JSON extraction — handles all common LLM output patterns
// ─────────────────────────────────────────────

/**
 * Robustly extract JSON from messy LLM output:
 *  - Strips ```json … ``` fences
 *  - Strips leading/trailing prose
 *  - Finds the outermost { … } object
 */
function extractJSON(raw) {
  // 1. Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 2. Find outermost JSON object
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }

  const jsonStr = cleaned.slice(start, end + 1);

  // 3. Parse — throws on invalid JSON
  return JSON.parse(jsonStr);
}

// ─────────────────────────────────────────────
//  Prompt — Code Audit
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a PRINCIPAL SOFTWARE ARCHITECT performing a FORMAL CODE AUDIT.

You MUST respond with ONLY a valid JSON object — no preamble, no explanation, no markdown fences, no trailing text.
Start your response with { and end with }.

The JSON must follow this exact structure:

{
  "summary": "8-10 sentence professional overview of the codebase",
  "architecture": [
    {
      "component": "Frontend | Backend | Database | DevOps",
      "description": "How it is currently designed",
      "recommendation": "Professional improvement suggestion"
    }
  ],
  "bugs": [
    {
      "title": "Issue title",
      "impact": "Low | Medium | High",
      "fix": "Exact fix or refactor"
    }
  ],
  "securityIssues": [
    {
      "issue": "Security risk name",
      "recommendation": "Mitigation strategy"
    }
  ],
  "futureRoadmap": [
    {
      "phase": "Short-term | Mid-term | Long-term",
      "details": "Concrete upgrade plan"
    }
  ],
  "toolsAndPackages": ["list", "of", "detected", "tools"],
  "scores": {
    "codeQuality": 75,
    "security": 70,
    "performance": 68,
    "maintainability": 72
  },
  "grade": "B",
  "finalVerdict": "2-3 sentence professional verdict"
}

RULES:
- Analyse ONLY what is present in the actual code provided
- Do NOT use placeholder values — every score must reflect real observations
- If a section has nothing to report, return an empty array []
- toolsAndPackages must list only what you see imported or used in the code`;

// ─────────────────────────────────────────────
//  Prompt — Test Case Generator
// ─────────────────────────────────────────────

const TEST_GENERATOR_SYSTEM_PROMPT = `You are an EXPERT SOFTWARE TEST ENGINEER specialising in JavaScript/Node.js.

Your job is to analyse source code and generate comprehensive test suites using Jest (or Vitest if detected).

You MUST respond with ONLY a valid JSON object — no preamble, no explanation, no markdown fences, no trailing text.
Start your response with { and end with }.

The JSON must follow this exact structure:

{
  "framework": "jest | vitest | mocha",
  "setupInstructions": "Short setup note, e.g. npm install --save-dev jest",
  "testFiles": [
    {
      "fileName": "src/utils.test.js",
      "description": "What this test file covers",
      "testCode": "Full runnable test file content as a string (use \\n for newlines)"
    }
  ],
  "unitTests": [
    {
      "functionName": "myFunction",
      "filePath": "src/utils.js",
      "description": "What this function does",
      "cases": [
        {
          "label": "returns correct result for happy path",
          "type": "unit",
          "input": "describe the input",
          "expected": "describe the expected output",
          "codeSnippet": "expect(myFunction('input')).toBe('expected')"
        }
      ]
    }
  ],
  "edgeCases": [
    {
      "functionName": "myFunction",
      "label": "handles null input gracefully",
      "type": "edge",
      "input": "null",
      "expected": "throws TypeError or returns null",
      "codeSnippet": "expect(() => myFunction(null)).toThrow(TypeError)"
    }
  ],
  "integrationTests": [
    {
      "label": "API endpoint returns 200 for valid request",
      "description": "End-to-end test for a route or service interaction",
      "codeSnippet": "const res = await request(app).get('/health'); expect(res.status).toBe(200);"
    }
  ],
  "mocks": [
    {
      "target": "module or function to mock",
      "reason": "Why it needs to be mocked",
      "snippet": "jest.mock('module', () => ({ fn: jest.fn() }))"
    }
  ],
  "coverageSummary": {
    "estimatedCoverage": 85,
    "uncoveredAreas": ["List of areas not easily testable or not covered"],
    "recommendation": "Short actionable advice to reach 90%+ coverage"
  }
}

RULES:
- Analyse ONLY the code provided — do not invent functions that don't exist
- Generate REAL, RUNNABLE test code — not pseudo-code
- testCode in testFiles must be a complete file as a single escaped string
- Cover happy paths, error paths, boundary values, and null/undefined inputs
- If no async functions exist, omit async/await from snippets
- Prefer jest.fn() for mocks unless vitest is detected (then use vi.fn())
- If a section has nothing to report, return an empty array []`;

// ─────────────────────────────────────────────
//  Fallback results
// ─────────────────────────────────────────────

const FALLBACK_RESULT = {
  summary:
    "Analysis could not be completed — the AI returned an unparseable response. Please retry or check your GROQ_API_KEY and model settings.",
  architecture: [],
  bugs: [],
  securityIssues: [],
  futureRoadmap: [
    { phase: "Short-term",  details: "Retry the analysis with a larger max_tokens value." },
    { phase: "Mid-term",    details: "Switch to a more capable model such as llama-3.3-70b-versatile." },
    { phase: "Long-term",   details: "Add automated retries and structured output validation." },
  ],
  toolsAndPackages: [],
  scores: { codeQuality: 0, security: 0, performance: 0, maintainability: 0 },
  grade: "N/A",
  finalVerdict: "Analysis failed. No code was evaluated.",
};

const FALLBACK_TEST_RESULT = {
  framework: "jest",
  setupInstructions: "Test generation failed. Please retry or check your GROQ_API_KEY.",
  testFiles: [],
  unitTests: [],
  edgeCases: [],
  integrationTests: [],
  mocks: [],
  coverageSummary: {
    estimatedCoverage: 0,
    uncoveredAreas: ["All areas — generation failed"],
    recommendation: "Retry the test generation with a larger max_tokens value.",
  },
};

// ─────────────────────────────────────────────
//  Core Groq call  (with model fallback chain)
// ─────────────────────────────────────────────

const MODELS_TO_TRY = [
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

/**
 * Internal: call Groq with a given system prompt and user content.
 * Tries each model in MODELS_TO_TRY; returns parsed JSON on first success.
 *
 * @param {Groq}   groq          Initialised Groq client
 * @param {string} systemPrompt  System prompt to use
 * @param {string} userContent   User message (source code)
 * @returns {Promise<object|null>}
 */
async function callGroqWithRetry(groq, systemPrompt, userContent) {
  let lastError;

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`🤖 Trying model: ${model}`);

      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.1,
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userContent },
        ],
      });

      const raw = completion.choices[0].message.content;
      console.log(`📝 Raw response: ${raw.length} chars`);

      const parsed = extractJSON(raw);
      console.log(`✅ Parsed successfully with model: ${model}`);
      return parsed;

    } catch (err) {
      console.warn(`⚠️  Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  console.error("❌ All models failed. Last error:", lastError?.message);
  return null;
}

// ─────────────────────────────────────────────
//  Public API — Code Audit
// ─────────────────────────────────────────────

/**
 * Analyse raw code/text input.
 *
 * @param {string} input  Concatenated source code (or any text)
 * @returns {Promise<object>} Structured analysis result
 */
export async function analyzeWithGroq(input) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const userContent = input.slice(0, 20_000);
  const result = await callGroqWithRetry(groq, SYSTEM_PROMPT, userContent);
  return result ?? FALLBACK_RESULT;
}

/**
 * Fetch a public GitHub repo by URL, then analyse it with Groq.
 *
 * @param {string} repoUrl   e.g. "https://github.com/owner/repo"
 * @param {object} [options]
 * @param {string} [options.branch="main"]   Branch to read
 * @param {number} [options.maxChars=28000]  Max source chars to send
 * @returns {Promise<object>} Structured analysis result
 */
export async function analyzeRepoFromUrl(repoUrl, options = {}) {
  const contents = await fetchRepoContents(repoUrl, options);
  console.log(`🔍 Sending ${contents.length} chars to Groq…`);
  return analyzeWithGroq(contents);
}

// ─────────────────────────────────────────────
//  Public API — 🧪 Test Case Generator
// ─────────────────────────────────────────────

/**
 * Generate a full test suite (unit tests, edge cases, integration tests,
 * mocks, and coverage summary) from raw source code.
 *
 * Optimised for JavaScript / Node.js projects but works with any language
 * that Groq's model understands.
 *
 * @param {string} input  Raw source code to analyse
 * @returns {Promise<object>} Structured test suite result with the shape:
 *   {
 *     framework, setupInstructions,
 *     testFiles,       // ready-to-write complete test file(s)
 *     unitTests,       // per-function unit test cases
 *     edgeCases,       // boundary / error-path cases
 *     integrationTests,
 *     mocks,
 *     coverageSummary
 *   }
 *
 * @example
 * import fs from "fs";
 * const src = fs.readFileSync("src/utils.js", "utf-8");
 * const tests = await generateTests(src);
 * console.log(tests.testFiles[0].testCode);
 */
export async function generateTests(input) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log(`🧪 Generating tests for ${input.length} chars of source…`);

  // Keep a slightly smaller slice so the response has room in the context window
  const userContent = input.slice(0, 18_000);
  const result = await callGroqWithRetry(groq, TEST_GENERATOR_SYSTEM_PROMPT, userContent);
  return result ?? FALLBACK_TEST_RESULT;
}

/**
 * Fetch a public GitHub repo by URL, then generate tests for it.
 *
 * @param {string} repoUrl   e.g. "https://github.com/owner/repo"
 * @param {object} [options]
 * @param {string} [options.branch="main"]   Branch to read
 * @param {number} [options.maxChars=28000]  Max source chars to fetch
 * @returns {Promise<object>} Structured test suite result
 *
 * @example
 * const tests = await generateTestsFromUrl("https://github.com/you/your-repo");
 * tests.testFiles.forEach(f => {
 *   fs.writeFileSync(f.fileName, f.testCode);
 * });
 */
export async function generateTestsFromUrl(repoUrl, options = {}) {
  const contents = await fetchRepoContents(repoUrl, options);
  console.log(`🔍 Sending ${contents.length} chars to Groq for test generation…`);
  return generateTests(contents);
}

/**
 * Write generated test files to disk.
 *
 * Convenience helper — call after generateTests() or generateTestsFromUrl()
 * to materialise the generated test files in your project.
 *
 * @param {object}   testResult          Return value of generateTests()
 * @param {object}   [options]
 * @param {string}   [options.outDir=""] Directory prefix for output paths
 *                                       (defaults to paths inside testResult)
 * @param {Function} [options.write]     Custom write function (path, content) → void
 *                                       Defaults to fs.writeFileSync
 *
 * @example
 * import { generateTests, writeTestFiles } from "./groq.js";
 * const result = await generateTests(src);
 * await writeTestFiles(result, { outDir: "./tests" });
 */
export async function writeTestFiles(testResult, { outDir = "", write } = {}) {
  // Lazy-load fs so this file stays importable in environments without Node fs
  const fs = await import("fs");
  const fsPath = await import("path");

  const writeFn = write ?? ((filePath, content) => {
    const dir = fsPath.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✅ Written: ${filePath}`);
  });

  if (!testResult?.testFiles?.length) {
    console.warn("⚠️  No test files to write.");
    return;
  }

  for (const { fileName, testCode } of testResult.testFiles) {
    const dest = outDir ? fsPath.join(outDir, fileName) : fileName;
    writeFn(dest, testCode);
  }
}