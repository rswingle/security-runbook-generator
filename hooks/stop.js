#!/usr/bin/env node
const fs = require("fs");

const {
  LAST_GENERATED_FILE,
  LAST_GENERATED_META_FILE
} = require("../lib/paths");
const { loadPreferences, savePreferences, slugify } = require("../lib/utils");

function extractSectionHeadings(markdown) {
  const headings = [];
  const lines = String(markdown || "").split("\n");
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      headings.push(match[1].trim());
    }
  }
  return headings;
}

function incrementCounter(preferences, key) {
  const current = Number(preferences.pattern_counts[key] || 0);
  preferences.pattern_counts[key] = current + 1;
  return preferences.pattern_counts[key];
}

function learnDefaults(preferences, safeFields) {
  const learnableKeys = ["template", "severity", "lead", "include_escalation"];
  for (const key of learnableKeys) {
    if (safeFields[key] === undefined || safeFields[key] === null || safeFields[key] === "") {
      continue;
    }
    const value = String(safeFields[key]);
    const count = incrementCounter(preferences, `default:${key}:${value}`);
    if (key === "template") {
      preferences.preferred_template = value;
    } else {
      preferences.default_fields[key] = safeFields[key];
    }
    if (count >= 2) {
      incrementCounter(preferences, `confirmed:${key}:${value}`);
    }
  }
}

function learnSectionDiffs(preferences, generatedMarkdown, finalMarkdown) {
  const generated = new Set(extractSectionHeadings(generatedMarkdown));
  const final = new Set(extractSectionHeadings(finalMarkdown));

  for (const heading of final) {
    if (!generated.has(heading)) {
      const key = `section:add:${slugify(heading)}`;
      const count = incrementCounter(preferences, key);
      if (count >= 2 && !preferences.always_include.includes(heading)) {
        preferences.always_include.push(heading);
      }
    }
  }

  for (const heading of generated) {
    if (!final.has(heading)) {
      const key = `section:remove:${slugify(heading)}`;
      const count = incrementCounter(preferences, key);
      if (count >= 2 && !preferences.always_exclude.includes(heading)) {
        preferences.always_exclude.push(heading);
      }
    }
  }
}

function runStopHook() {
  if (!fs.existsSync(LAST_GENERATED_META_FILE) || !fs.existsSync(LAST_GENERATED_FILE)) {
    return { applied: false, reason: "No pending generated snapshot." };
  }

  const metadata = JSON.parse(fs.readFileSync(LAST_GENERATED_META_FILE, "utf8"));
  const outputPath = metadata.output_path;
  if (!outputPath || !fs.existsSync(outputPath)) {
    fs.rmSync(LAST_GENERATED_META_FILE, { force: true });
    fs.rmSync(LAST_GENERATED_FILE, { force: true });
    return { applied: false, reason: "Output file missing; snapshot cleared." };
  }

  const generatedMarkdown = fs.readFileSync(LAST_GENERATED_FILE, "utf8");
  const finalMarkdown = fs.readFileSync(outputPath, "utf8");
  const preferences = loadPreferences();

  learnDefaults(preferences, metadata.safe_fields || {});
  learnSectionDiffs(preferences, generatedMarkdown, finalMarkdown);
  savePreferences(preferences);

  fs.rmSync(LAST_GENERATED_META_FILE, { force: true });
  fs.rmSync(LAST_GENERATED_FILE, { force: true });

  return { applied: true, outputPath };
}

if (require.main === module) {
  try {
    const result = runStopHook();
    if (result.applied) {
      console.log(`Updated preferences from ${result.outputPath}`);
    }
  } catch (error) {
    console.error(`stop hook error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  runStopHook
};
