# Security Runbook Generator

A minimal, file-based CLI/TUI tool for creating security runbooks — fast. Built
on a three-agent pipeline with a learning layer that improves defaults over time
using only local files. No databases. No external services beyond optional git push.

---

## Features

- **Interactive TUI** — structured input collection with smart pre-filled defaults
- **Template-driven output** — clean, consistent Markdown runbooks every time
- **Learns your preferences** — Stop hook diffs your edits and updates memory after each run
- **Git-native** — auto-commits and pushes via CLI or GitHub MCP
- **Team conventions** — shared `CLAUDE.md` enforces org-wide runbook standards
- **Privacy-first** — no sensitive incident data is ever stored in memory

---

## Quick Start

### Prerequisites

- Node.js 18+
- Git configured with remote access (for push)
- Claude Code (for agent + hook execution)

### Install

```bash
git clone https://github.com/your-org/security-runbook-generator
cd security-runbook-generator
npm install
./runbook init          # Creates /runbooks/, /memory/, verifies /templates/
```

### First Runbook

```bash
./runbook new
```

The TUI will walk you through selecting a template and filling in the required
fields. On first run, all fields will be empty. After your first run, the tool
will begin pre-filling fields from what it has learned.

### Second Run

```bash
./runbook new
```

Fields you used last time will be pre-filled. Accept with `Enter`, override by
typing. The tool measures whether your edits match a pattern — after two
consistent runs, those patterns are locked into memory and the field is
permanently pre-filled with your preference.

---

## Usage

```bash
./runbook new                   # Create a new runbook interactively
./runbook list                  # List all runbooks in /runbooks/
./runbook edit <runbook-name>   # Open an existing runbook for editing
./runbook memory                # View or reset learned preferences
./runbook templates             # List available templates
./runbook init                  # Initialize directory structure
```

---

## Project Structure

```
security-runbook-generator/
├── CLAUDE.md                         # Team conventions (edit this for your org)
├── runbooks/                         # Generated outputs land here
├── templates/
│   └── playbooks/                    # Add your own templates here
│       ├── incident-response.md
│       ├── vulnerability-management.md
│       ├── access-review.md
│       └── _schema.yaml
├── memory/
│   └── runbook-preferences.yaml     # Auto-managed — do not edit while running
├── hooks/
│   ├── post-tool-use.js
│   └── stop.js
└── agents/
    ├── ui-builder.js
    ├── template-engineer.js
    └── integration-agent.js
```

---

## Templates

Templates live in `/templates/playbooks/` as Markdown files with `{{variable}}`
placeholders. Each template has a companion schema in `_schema.yaml`.

### Built-in Templates

| Template | Description |
|---|---|
| `incident-response` | Security incident response runbook |
| `vulnerability-management` | Vulnerability triage and remediation |
| `access-review` | Periodic access and permissions audit |

### Adding a Custom Template

1. Create `/templates/playbooks/my-template.md` with `{{variable}}` placeholders
2. Add variable definitions to `_schema.yaml`
3. Run `./runbook templates` to verify it appears

---

## Memory and Learning

The tool maintains preferences in `/memory/runbook-preferences.yaml`. This file
is auto-managed by the Stop hook and should not be edited manually while the tool
is running.

### What gets learned

- Preferred template
- Default field values (severity, lead, contacts)
- Sections you always add or remove
- Formatting style (checkbox lists, date format, etc.)
- Naming conventions

### What never gets stored

- Incident descriptions
- IP addresses, hostnames, or system details
- Any content from free-text input fields

### Resetting memory

```bash
./runbook memory --reset          # Wipe all learned preferences
./runbook memory --show           # Print current preferences
```

### Team conventions (`CLAUDE.md`)

Edit `CLAUDE.md` to set org-wide rules that all team members' runbooks will
follow. Examples:

```markdown
# Runbook Conventions

- All incident runbooks MUST include a severity matrix
- Runbook names follow: YYYY-MM-DD-system-type
- Lead field must be a full email address
- Post-incident action items must link to a GitHub issue
```

Commit `CLAUDE.md` to the shared repository so the whole team benefits.

---

## Git Integration

By default, `integration-agent` commits and pushes after each generation:

```bash
git add runbooks/{name}.md
git commit -m "runbook: add {name}"
git push origin main
```

### GitHub MCP (Optional)

For teams using Claude Code's GitHub MCP integration, set the following
environment variables for direct API-based pushes (no local git clone required):

```bash
export GITHUB_TOKEN=ghp_...
export GITHUB_REPO=org/repo-name
export GITHUB_BRANCH=main
```

If `GITHUB_TOKEN` is not set, the tool falls back to CLI git automatically.

### Disabling auto-push

```bash
./runbook new --no-push           # Generate and save locally, skip git
```

---

## Hooks

Hooks are registered in `.claude/settings.json` and run deterministically at
session boundaries — they are not AI calls.

| Hook | When | What it does |
|---|---|---|
| `PostToolUse` | After runbook is written to disk | Logs run metadata, snapshots generated output |
| `Stop` | End of Claude Code session | Diffs generated vs final runbook, updates memory |

Hooks run silently. Errors are logged to `/memory/run-log.jsonl` and do not
interrupt the main workflow.

---

## Verification

The PROMPT.md spec calls for a two-run verification to confirm the learning
loop is working:

**Run 1:**
```bash
./runbook new
# Fill in all fields manually
# Note the generated runbook
# Make 1–2 edits after generation (e.g., expand a section, add escalation)
```

**Run 2:**
```bash
./runbook new
# Verify: previously-filled fields are pre-populated
# Verify: structure matches your edits from run 1
# Confirm: fewer keystrokes needed
```

If the second run does not show improvement, check `/memory/runbook-preferences.yaml`
to see what was persisted after run 1. The confidence threshold requires the same
pattern to appear in 2 consecutive runs before it is locked in.

---

## Design Documents

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and component breakdown |
| [DESIGN.md](./DESIGN.md) | UX design, template format, memory schema |
| [DATA_FLOW.md](./DATA_FLOW.md) | End-to-end data flow diagrams |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Integration reference and dependency map |

---

## Contributing

1. Fork the repo and create a feature branch
2. Edit templates in `/templates/playbooks/` or agents in `/agents/`
3. Test with `./runbook new` — verify both generation and push
4. Update `CLAUDE.md` if your change introduces a new convention
5. Submit a PR with a description of what the change improves

---

## Security Notes

- Memory files contain structural preferences only — never incident content
- Run logs store input hashes, not raw values
- `CLAUDE.md` and templates should be reviewed before sharing externally
- The `.claude/settings.json` hook configuration should be committed to the repo
  so all team members get consistent hook behavior

---

## License

MIT
