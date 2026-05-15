const readline = require("readline/promises");
const { stdin, stdout } = require("process");

const { dateStamp } = require("../lib/utils");

function parseBoolean(input, fallbackValue) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) {
    return fallbackValue;
  }
  if (["y", "yes", "true", "1"].includes(value)) {
    return true;
  }
  if (["n", "no", "false", "0"].includes(value)) {
    return false;
  }
  return fallbackValue;
}

function printTemplateList(templateMap) {
  const entries = Object.entries(templateMap);
  entries.forEach(([name, info], index) => {
    const description = info.description ? ` - ${info.description}` : "";
    console.log(`  ${index + 1}. ${name}${description}`);
  });
}

async function chooseTemplate(rl, templateMap, defaultTemplate) {
  const names = Object.keys(templateMap);
  if (!names.length) {
    throw new Error("No templates available.");
  }

  printTemplateList(templateMap);
  const fallback = names.includes(defaultTemplate) ? defaultTemplate : names[0];
  const answer = await rl.question(`Template [${fallback}]: `);
  if (!answer.trim()) {
    return fallback;
  }
  const parsed = Number.parseInt(answer.trim(), 10);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= names.length) {
    return names[parsed - 1];
  }
  if (templateMap[answer.trim()]) {
    return answer.trim();
  }
  console.log(`Unknown template "${answer.trim()}". Using ${fallback}.`);
  return fallback;
}

async function askField(rl, key, definition, defaultValue) {
  const required = Boolean(definition.required);
  const type = definition.type || "text";
  const label = definition.label || key;
  const promptSuffix = defaultValue !== undefined && defaultValue !== null && defaultValue !== ""
    ? ` [${Array.isArray(defaultValue) ? defaultValue.join(", ") : defaultValue}]`
    : "";
  const raw = await rl.question(`${label}${promptSuffix}: `);
  const trimmed = raw.trim();

  if (!trimmed) {
    if (required && (defaultValue === undefined || defaultValue === null || defaultValue === "")) {
      console.log(`${label} is required.`);
      return askField(rl, key, definition, defaultValue);
    }
    return defaultValue;
  }

  if (type === "boolean") {
    return parseBoolean(trimmed, Boolean(defaultValue));
  }
  if (type === "select") {
    const options = Array.isArray(definition.options) ? definition.options : [];
    if (options.length && !options.includes(trimmed)) {
      console.log(`Allowed values: ${options.join(", ")}`);
      return askField(rl, key, definition, defaultValue);
    }
    return trimmed;
  }
  if (type === "list") {
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return trimmed;
}

function safeFieldsFromPayload(payload, templateDefinition) {
  const safe = {};
  const safeWhitelist = new Set(["template", "severity", "lead", "include_escalation"]);
  const variables = templateDefinition.variables || {};
  for (const [key, def] of Object.entries(variables)) {
    if (def.memory_safe || safeWhitelist.has(key)) {
      safe[key] = payload[key];
    }
  }
  safe.template = payload.template;
  return safe;
}

async function collectInput({ schema, preferences, templateOverride }) {
  const templates = schema.templates || {};
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    console.log("Security Runbook Generator");
    const selectedTemplate = templateOverride
      || await chooseTemplate(rl, templates, preferences.preferred_template);
    const templateDefinition = templates[selectedTemplate];
    if (!templateDefinition) {
      throw new Error(`Template "${selectedTemplate}" is missing from schema.`);
    }

    const payload = {
      template: selectedTemplate
    };

    const variables = templateDefinition.variables || {};
    for (const [key, definition] of Object.entries(variables)) {
      const memoryDefault = preferences.default_fields[key];
      const schemaDefault = definition.default;
      const computedDefault = key === "date"
        ? memoryDefault || schemaDefault || dateStamp()
        : memoryDefault !== undefined ? memoryDefault : schemaDefault;
      const value = await askField(rl, key, definition, computedDefault);
      payload[key] = value;
    }

    if (!payload.date) {
      payload.date = dateStamp();
    }

    return {
      payload,
      safeFields: safeFieldsFromPayload(payload, templateDefinition)
    };
  } finally {
    rl.close();
  }
}

module.exports = {
  collectInput
};
