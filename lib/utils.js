const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const {
  MEMORY_DIR,
  PREFERENCES_FILE,
  RUNBOOKS_DIR,
  RUN_LOG_FILE,
  TEMPLATES_DIR
} = require("./paths");

function isoNow() {
  return new Date().toISOString();
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function defaultPreferences() {
  return {
    version: 1,
    updated_at: isoNow(),
    preferred_template: "incident-response",
    naming_convention: "{date}-{system}-{type}",
    default_fields: {},
    always_include: [],
    always_exclude: [],
    pattern_counts: {},
    formatting: {
      date_format: "YYYY-MM-DD",
      use_checkboxes: true
    }
  };
}

function loadYamlFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return fallbackValue;
  }
  return yaml.load(raw);
}

function saveYamlFile(filePath, value) {
  const output = yaml.dump(value, {
    noRefs: true,
    lineWidth: 120,
    sortKeys: false
  });
  fs.writeFileSync(filePath, output, "utf8");
}

function loadPreferences() {
  const prefs = loadYamlFile(PREFERENCES_FILE, defaultPreferences()) || defaultPreferences();
  return {
    ...defaultPreferences(),
    ...prefs,
    default_fields: { ...(prefs.default_fields || {}) },
    always_include: [...(prefs.always_include || [])],
    always_exclude: [...(prefs.always_exclude || [])],
    pattern_counts: { ...(prefs.pattern_counts || {}) },
    formatting: { ...(defaultPreferences().formatting), ...(prefs.formatting || {}) }
  };
}

function savePreferences(preferences) {
  const next = {
    ...preferences,
    updated_at: isoNow()
  };
  saveYamlFile(PREFERENCES_FILE, next);
}

function ensureProjectScaffold() {
  ensureDir(RUNBOOKS_DIR);
  ensureDir(MEMORY_DIR);
  ensureDir(TEMPLATES_DIR);
  ensureFile(PREFERENCES_FILE, yaml.dump(defaultPreferences()));
  ensureFile(RUN_LOG_FILE, "");
}

function readSchema(schemaPath) {
  const schema = loadYamlFile(schemaPath, null);
  if (!schema || typeof schema !== "object" || !schema.templates) {
    throw new Error(`Invalid schema file: ${schemaPath}`);
  }
  return schema;
}

function appendJsonl(filePath, data) {
  fs.appendFileSync(filePath, `${JSON.stringify(data)}\n`, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function parseTeamRules(claudeMarkdown) {
  return claudeMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function formatNamingConvention(convention, payload) {
  const values = {
    date: payload.date || dateStamp(),
    system: slugify(payload.affected_system || payload.system || payload.runbook_name || "system"),
    type: slugify(payload.template || "runbook"),
    name: slugify(payload.runbook_name || "")
  };

  let output = convention || "{date}-{system}-{type}";
  for (const [key, value] of Object.entries(values)) {
    output = output.replace(new RegExp(`\\{${key}\\}`, "g"), value || key);
  }
  output = slugify(output);
  return output || `${values.date}-runbook`;
}

function normalizeRunbookName(name) {
  const cleaned = String(name || "").trim();
  const base = cleaned.toLowerCase().endsWith(".md") ? cleaned.slice(0, -3) : cleaned;
  return `${slugify(base)}.md`;
}

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function resolveRunbookPath(name) {
  return path.join(RUNBOOKS_DIR, normalizeRunbookName(name));
}

module.exports = {
  appendJsonl,
  dateStamp,
  defaultPreferences,
  ensureProjectScaffold,
  fileExists,
  formatNamingConvention,
  isoNow,
  loadPreferences,
  loadYamlFile,
  normalizeRunbookName,
  parseTeamRules,
  readIfExists,
  readSchema,
  resolveRunbookPath,
  savePreferences,
  saveYamlFile,
  sha256,
  slugify
};
