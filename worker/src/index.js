const DEFAULT_OWNER = "Masha-L";
const DEFAULT_REPO = "grandmas-letter-2026";
const DEFAULT_BRANCH = "main";
const LETTER_PATH = "letter.json";

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = (env.ALLOWED_ORIGINS || "https://masha-l.github.io")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function requireAuth(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return token === expected;
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function github(requestPath, init, env) {
  const response = await fetch(`https://api.github.com${requestPath}`, {
    ...init,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "grandmas-letter-admin-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `GitHub API failed with ${response.status}`);
  }
  return body;
}

async function publishLetter(content, env) {
  if (!env.GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const path = env.LETTER_PATH || LETTER_PATH;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const repoPath = `/repos/${owner}/${repo}/contents/${encodedPath}`;

  const current = await github(`${repoPath}?ref=${encodeURIComponent(branch)}`, { method: "GET" }, env);
  const prettyContent = `${JSON.stringify(content, null, 2)}\n`;

  const updated = await github(repoPath, {
    method: "PUT",
    body: JSON.stringify({
      branch,
      message: "Update grandmas letter from admin",
      content: encodeBase64(prettyContent),
      sha: current.sha,
    }),
  }, env);

  return updated.commit?.sha || "";
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, headers);
    }

    if (url.pathname !== "/publish" || request.method !== "POST") {
      return jsonResponse({ error: "Not found" }, 404, headers);
    }

    if (!requireAuth(request, env)) {
      return jsonResponse({ error: "Unauthorized" }, 401, headers);
    }

    try {
      const payload = await request.json();
      if (!payload.content || typeof payload.content !== "object") {
        return jsonResponse({ error: "Missing content" }, 400, headers);
      }

      const commit = await publishLetter(payload.content, env);
      return jsonResponse({ ok: true, commit }, 200, headers);
    } catch (error) {
      return jsonResponse({ error: error.message || "Publish failed" }, 500, headers);
    }
  },
};
