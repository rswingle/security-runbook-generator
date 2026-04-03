# Design — Security Runbook Generator

## Design Philosophy

The tool must feel like a fast command-line workflow, not a web form. Every
interaction should reduce the amount of typing required compared to the previous
run. The learning layer exists specifically to make the second run noticeably
easier than the first.

---

## User Experience Goals

| Goal | Metric |
|---|---|
| First runbook in < 3 minutes | End-to-end from `run` to pushed Markdown |
| Second run noticeably faster | Pre-filled defaults reduce keystrokes by 30%+ |
| Zero ambiguity in prompts | Every field has an example value |
| One command to start | `./runbook new` or `npm start` |

---

## CLI/TUI Interaction Design

### Entry Point

```bash
./runbook new                  # Start interactive runbook creation
./runbook list                 # List existing runbooks
./runbook edit <name>          # Open an existing runbook for editing
./runbook memory               # View/edit current learned preferences
./runbook templates            # List available templates
```

### Input Collection Flow (`ui-builder`)

The TUI presents fields in a structured sequence. Fields are grouped into logical
sections. Memory-supplied defaults are displayed inline so users can accept or override.

```
╔══════════════════════════════════════════════════════╗
║         Security Runbook Generator  v1.0             ║
╠══════════════════════════════════════════════════════╣
║  Template      › [incident-response] (remembered)    ║
║  Runbook Name  › ___________________________         ║
║  Severity      › [High] (remembered)                 ║
║  Affected Sys  › ___________________________         ║
║  Lead          › [ray@company.com] (remembered)      ║
║  Include ESC?  › [Yes] (remembered)                  ║
╠══════════════════════════════════════════════════════╣
║  [Enter] Accept   [Tab] Next   [Ctrl+E] Edit memory  ║
╚══════════════════════════════════════════════════════╝
```

Fields marked `(remembered)` are pre-filled from `/memory/runbook-preferences.yaml`.
The user can press Enter to accept or type to override.

### Field Types

| Type | Description | Example |
|---|---|---|
| `text` | Free-form string | Runbook name, affected system |
| `select` | Enum choice | Template, severity level |
| `boolean` | Yes/No toggle | Include escalation matrix? |
| `multiline` | Paragraph input | Incident description |
| `list` | Comma-separated items | Affected services |

---

## Template Design (`template-engineer`)

### Template Format

Templates are Markdown files with `{{variable}}` placeholders and optional
conditional blocks:

```markdown
# {{runbook_name}} — Incident Response Runbook

**Severity:** {{severity}}
**Date:** {{date}}
**Lead:** {{lead}}

## Summary

{{summary}}

## Affected Systems

{{affected_systems}}

{{#if include_escalation}}
## Escalation Matrix

| Level | Contact | Threshold |
|---|---|---|
| L1 | {{l1_contact}} | All incidents |
| L2 | {{l2_contact}} | Severity High+ |
| L3 | {{l3_contact}} | Severity Critical |
{{/if}}

## Timeline

| Time | Action | Owner |
|---|---|---|
| T+0 | Detection | {{lead}} |

## Resolution Steps

{{resolution_steps}}

## Post-Incident Actions

- [ ] Write post-mortem
- [ ] Update runbook
- [ ] Review detection gaps
```

### Template Schema (`_schema.yaml`)

Each template is accompanied by a schema file that declares variables, types,
required status, and default values:

```yaml
template: incident-response
variables:
  runbook_name:
    type: text
    required: true
  severity:
    type: select
    options: [Low, Medium, High, Critical]
    required: true
    default: High
  include_escalation:
    type: boolean
    default: true
  lead:
    type: text
    required: true
```

---

## Memory Design

### `/memory/runbook-preferences.yaml`

Structured YAML that accumulates learned preferences over time. Never stores
incident-specific or sensitive data — only structural and formatting patterns.

```yaml
# Auto-managed by Stop hook — do not edit manually while tool is running
version: 1
updated_at: "2025-04-01T14:22:00Z"

preferred_template: incident-response
preferred_severity: High
naming_convention: "{date}-{system}-{type}"

always_include:
  - escalation_matrix
  - post_incident_actions
  - timeline_table

formatting:
  header_style: h1_with_separator
  date_format: ISO8601
  use_checkboxes: true

remembered_fields:
  lead: ray@company.com
  l1_contact: soc@company.com

repeated_edits:
  - field: resolution_steps
    pattern: always_expanded_to_numbered_list
    confidence: 0.8
```

### `CLAUDE.md` (Team Conventions)

Human-maintained file shared across the team. Read by all agents before generation.
Example:

```markdown
# Runbook Conventions

- All incident runbooks MUST include a severity matrix
- Runbook names follow: YYYY-MM-DD-system-type
- Post-incident action items use GitHub issue links
- Lead field must be a full email address
```

---

## Output Design

Generated runbooks are saved to `/runbooks/` using the naming convention stored
in memory (default: `{date}-{system}-{type}.md`). Output is pure Markdown for
maximum portability — renderable in GitHub, Obsidian, Notion, or any editor.

---

## Learning Loop Design

The learning loop is intentionally conservative to avoid persisting noise:

1. **Diff detection** — After the user edits a generated runbook, the Stop hook
   diffs the generated file against the saved file.
2. **Pattern extraction** — Structural changes (added sections, reordered blocks,
   removed fields) are extracted as candidate patterns.
3. **Confidence gating** — A pattern is only persisted to memory if it has been
   observed in **2 or more consecutive runs** (configurable threshold).
4. **Safe fields only** — Only non-sensitive structural preferences are written
   (never incident descriptions, IPs, credentials, names of affected parties).

---

## Error States and Recovery

| Scenario | Behavior |
|---|---|
| Template not found | Prompt user to select from available templates |
| Git push fails | Save locally, display push command for manual retry |
| Memory file corrupted | Fall back to defaults, log warning, offer to reset |
| Missing required field | Block generation, highlight missing field in TUI |
| No git repo initialized | Skip push step, warn user, save locally only |
