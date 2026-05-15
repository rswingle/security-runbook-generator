const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { RUNBOOKS_DIR } = require("../lib/paths");
const { normalizeRunbookName } = require("../lib/utils");

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8"
  });
  if (result.status !== 0) {
    const error = result.stderr?.trim() || result.stdout?.trim() || "git command failed";
    throw new Error(error);
  }
}

function writeRunbook({ name, markdown }) {
  fs.mkdirSync(RUNBOOKS_DIR, { recursive: true });
  const fileName = normalizeRunbookName(name);
  const outputPath = path.join(RUNBOOKS_DIR, fileName);
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

function commitAndPush({ rootDir, outputPath, disablePush }) {
  if (disablePush) {
    return {
      ok: true,
      pushed: false,
      warning: "Git steps skipped by --no-push."
    };
  }

  const relativePath = path.relative(rootDir, outputPath);
  const runbookName = path.basename(outputPath, ".md");
  const commitMessage = `runbook: add ${runbookName}`;

  try {
    runGit(["add", relativePath], rootDir);
    runGit(["commit", "-m", commitMessage], rootDir);
  } catch (error) {
    return {
      ok: false,
      pushed: false,
      warning: `Git commit skipped: ${error.message}`
    };
  }

  try {
    runGit(["push", "origin", "main"], rootDir);
    return {
      ok: true,
      pushed: true
    };
  } catch (error) {
    return {
      ok: true,
      pushed: false,
      warning: `Git push failed: ${error.message}`
    };
  }
}

module.exports = {
  commitAndPush,
  writeRunbook
};
