const path = require("path");

const ROOT = path.resolve(__dirname, "..");

module.exports = {
  ROOT,
  CLAUDE_FILE: path.join(ROOT, "CLAUDE.md"),
  RUNBOOKS_DIR: path.join(ROOT, "runbooks"),
  MEMORY_DIR: path.join(ROOT, "memory"),
  TEMPLATES_DIR: path.join(ROOT, "templates", "playbooks"),
  SCHEMA_FILE: path.join(ROOT, "templates", "playbooks", "_schema.yaml"),
  PREFERENCES_FILE: path.join(ROOT, "memory", "runbook-preferences.yaml"),
  RUN_LOG_FILE: path.join(ROOT, "memory", "run-log.jsonl"),
  LAST_GENERATED_FILE: path.join(ROOT, "memory", ".last-generated.md"),
  LAST_GENERATED_META_FILE: path.join(ROOT, "memory", ".last-generated.json")
};
