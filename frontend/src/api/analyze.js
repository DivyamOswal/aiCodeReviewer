// frontend/src/api/analyze.js
// Browser-safe — plain fetch only, no Node modules.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GITHUB_API = "https://api.github.com";

// ─────────────────────────────────────────────
//  GitHub repo fetcher (runs in browser)
// ─────────────────────────────────────────────

function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

// ✅ Includes .sh, .bash, .zsh so shell-script repos are analysable
const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx",
  ".py", ".java", ".go", ".rs",
  ".c", ".cpp", ".cs", ".php",
  ".rb", ".swift", ".kt",
  ".html", ".css", ".scss",
  ".json", ".yaml", ".yml",
  ".md", ".sh", ".bash", ".zsh",
]);

function isCodeFile(filePath) {
  const lower = filePath.toLowerCase();
  if (/(node_modules|dist\/|build\/|\.lock$|package-lock\.json)/.test(lower)) return false;
  const ext = "." + lower.split(".").pop();
  return CODE_EXTENSIONS.has(ext);
}

/**
 * Fetch all code files from a GitHub repo (public or private).
 * Runs entirely in the browser — no backend involvement.
 *
 * @param {string} repoUrl
 * @param {string} [token]    GitHub PAT for private repos
 * @param {number} [maxChars]
 * @returns {Promise<string>} Concatenated source code
 */
export async function fetchRepoContents(repoUrl, token = "", maxChars = 28_000) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const headers = { Accept: "application/vnd.github+json", ...authHeaders };

  // Try main then master
  let blobs = null;
  for (const ref of ["main", "master"]) {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      blobs = data.tree.filter((f) => f.type === "blob");
      console.log(`✅ Fetched tree from "${ref}": ${blobs.length} total files`);
      break;
    }
    if (res.status === 401) throw new Error("GitHub token invalid or expired.");
    if (res.status === 404) console.warn(`Branch "${ref}" not found, trying next…`);
  }

  if (!blobs) {
    throw new Error(
      `Could not access ${owner}/${repo}. ` +
      (token ? "Check your token has repo scope." : "If private, enter a GitHub token.")
    );
  }

  const codeFiles = blobs.filter((f) => isCodeFile(f.path));
  console.log(`📂 ${codeFiles.length} code files (out of ${blobs.length} total)`);

  if (codeFiles.length === 0) {
    // Fall back: include ALL text files so at least something is analysed
    const fallback = blobs.filter((f) => !f.path.match(/\.(png|jpg|gif|ico|svg|woff|ttf|eot|bin|exe)$/i));
    if (fallback.length === 0) throw new Error("No readable files found in this repo.");
    console.warn("⚠️ No recognised code files — falling back to all text files");
    blobs = fallback;
  } else {
    blobs = codeFiles;
  }

  let combined    = `# Repository: ${owner}/${repo}\n\n`;
  let filesFetched = 0;

  for (const file of blobs) {
    if (combined.length >= maxChars) break;

    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path)}`,
      { headers }
    );
    if (!res.ok) continue;

    const data = await res.json();
    if (data.encoding !== "base64") continue;

    const content = atob(data.content.replace(/\n/g, ""));
    const block   = `\n\n## FILE: ${file.path}\n\`\`\`\n${content}\n\`\`\``;

    if (combined.length + block.length > maxChars) {
      combined += block.slice(0, maxChars - combined.length) + "\n… [truncated]";
      break;
    }

    combined += block;
    filesFetched++;
  }

  console.log(`✅ Built source: ${filesFetched} files, ${combined.length} chars`);

  if (filesFetched === 0) {
    throw new Error(
      token
        ? "Files found but content unreadable. Check token has repo scope."
        : "If this is a private repo, enter a GitHub token."
    );
  }

  return combined;
}

// ─────────────────────────────────────────────
//  POST /api/analyze
//
//  Returns { auditResult, sourceCode }
//  sourceCode is echoed back by the backend so
//  the frontend never loses it to state timing.
// ─────────────────────────────────────────────
export async function analyzeCode(code) {
  if (!code?.trim()) throw new Error("No source code provided.");

  console.log(`🔍 POST /api/analyze — ${code.length} chars`);

  const res = await fetch(`${API_URL}/api/analyze`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ code }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backend error ${res.status}: ${err}`);
  }

  const json = await res.json();
  console.log("📦 /api/analyze keys:", Object.keys(json));

  // Unwrap if backend wraps in { data: ... }
  const flat = json?.data ?? json?.result ?? json?.analysis ?? json;

  // Extract _sourceCode the backend echoes back, fall back to the code we sent
  const sourceCode = flat._sourceCode ?? json._sourceCode ?? code;

  // Remove internal field before returning audit data
  const { _sourceCode, ...auditResult } = flat;

  return { auditResult, sourceCode };
}

// ─────────────────────────────────────────────
//  POST /api/analyze/generate-tests
// ─────────────────────────────────────────────
export async function generateTests(code) {
  if (!code?.trim()) throw new Error("No source code provided for test generation.");

  console.log(`🧪 POST /api/analyze/generate-tests — ${code.length} chars`);

  const res = await fetch(`${API_URL}/api/analyze/generate-tests`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ code }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backend error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json?.data ?? json?.result ?? json?.tests ?? json;
}