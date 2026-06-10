import type { NextConfig } from "next";
import { execSync } from "node:child_process";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";

function resolveGitSha(): string {
  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_SHA ??
    process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  try {
    return execSync("git rev-parse HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

const gitSha = resolveGitSha();
const buildTime = new Date().toISOString();
const repoUrl =
  process.env.NEXT_PUBLIC_GIT_REPO_URL ??
  "https://github.com/Soffiweb/Avales-frontend";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: gitSha,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_GIT_REPO_URL: repoUrl,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
