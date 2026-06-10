const sha = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";
const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";
const repoUrl = process.env.NEXT_PUBLIC_GIT_REPO_URL ?? "";

const shortSha = sha.slice(0, 7);
const commitUrl =
  repoUrl && sha !== "dev" ? `${repoUrl}/commit/${sha}` : null;
const tooltip = buildTime
  ? `Build: ${new Date(buildTime).toLocaleString()}\nCommit: ${sha}`
  : `Commit: ${sha}`;

export default function VersionBadge() {
  const className =
    "font-mono text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300";

  if (commitUrl) {
    return (
      <a
        href={commitUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        className={className}
      >
        v.{shortSha}
      </a>
    );
  }

  return (
    <span title={tooltip} className={className}>
      v.{shortSha}
    </span>
  );
}
