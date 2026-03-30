import axios from "axios";

/**
 * Fetches GitHub repository content for AI analysis
 * Priority:
 * 1. README.md (main → master)
 * 2. Fallback metadata if README missing
 */
export async function parseGithubRepo(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);

  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = match[1];
  const repo = match[2].replace(".git", "");

  const branches = ["main", "master"];
  let readmeContent = "";

  // Try README from main/master
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      const res = await axios.get(url, { timeout: 8000 });
      readmeContent = res.data;
      break;
    } catch {
      // try next branch
    }
  }

  // Fallback if README not found
  if (!readmeContent) {
    return `
Repository Name: ${repo}
Owner: ${owner}

No README file found.
Analyze the project based on repository structure, dependencies,
and inferred usage patterns.

Focus on:
- Architecture
- Security
- Code quality
- Maintainability
- Tooling
`;
  }

  return readmeContent;
}
