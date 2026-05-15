const fs = require("fs");
const path = require("path");
const Mustache = require("mustache");

const { TEMPLATES_DIR } = require("../lib/paths");

function normalizeForTemplate(input) {
  const payload = { ...input };
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      payload[key] = value.join(", ");
      payload[`${key}_bullets`] = value.map((item) => `- ${item}`).join("\n");
    }
  }
  return payload;
}

function renderTemplate({ templateName, payload }) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.md`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  const templateRaw = fs.readFileSync(templatePath, "utf8");
  const rendered = Mustache.render(templateRaw, normalizeForTemplate(payload));
  return {
    templatePath,
    rendered: rendered.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"
  };
}

module.exports = {
  renderTemplate
};
