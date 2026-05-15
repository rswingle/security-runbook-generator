#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const {
  LAST_GENERATED_FILE,
  LAST_GENERATED_META_FILE,
  RUN_LOG_FILE
} = require("../lib/paths");
const { appendJsonl, ensureProjectScaffold, isoNow, sha256 } = require("../lib/utils");

function runPostToolUse({ template, outputPath, safeFields, generatedContent }) {
  ensureProjectScaffold();
  const payload = JSON.stringify(safeFields || {});
  const inputHash = sha256(payload);
  const logEntry = {
    ts: isoNow(),
    template,
    output: outputPath,
    input_hash: inputHash
  };
  appendJsonl(RUN_LOG_FILE, logEntry);
  fs.writeFileSync(LAST_GENERATED_FILE, generatedContent, "utf8");
  fs.writeFileSync(
    LAST_GENERATED_META_FILE,
    JSON.stringify({
      ts: logEntry.ts,
      template,
      output_path: outputPath,
      safe_fields: safeFields || {}
    }, null, 2),
    "utf8"
  );
  return logEntry;
}

function parseCliArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    args[key] = value;
    i += 1;
  }
  return args;
}

if (require.main === module) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    const content = args.generated_file
      ? fs.readFileSync(path.resolve(args.generated_file), "utf8")
      : (args.generated_content || "");
    const safeFields = args.safe_fields ? JSON.parse(args.safe_fields) : {};
    runPostToolUse({
      template: args.template || "unknown",
      outputPath: args.output_path || "",
      safeFields,
      generatedContent: content
    });
  } catch (error) {
    console.error(`post-tool-use hook error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  runPostToolUse
};
