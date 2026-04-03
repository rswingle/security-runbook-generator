# Data Flow — Security Runbook Generator

## Overview

This document traces every data transformation from the moment a user invokes
the tool to the moment a runbook is committed to the repository and preferences
are updated in memory.

---

## Primary Data Flow: Runbook Generation

```
User invokes: ./runbook new
        │
        ▼
┌─────────────────────────────────────────────────┐
│                  STARTUP PHASE                   │
│                                                  │
│  Read /memory/runbook-preferences.yaml           │
│    → defaults: template, severity, lead, etc.   │
│                                                  │
│  Read CLAUDE.md                                  │
│    → team rules: required sections, naming, etc.│
│                                                  │
│  Output: merged_context = {defaults, rules}     │
└──────────────────────┬──────────────────────────┘
                       │ merged_context
                       ▼
┌─────────────────────────────────────────────────┐
│              ui-builder PHASE                    │
│                                                  │
│  Display TUI form pre-filled with defaults       │
│  Collect user overrides and new values           │
│  Validate against template schema (_schema.yaml) │
│                                                  │
│  Output: input_payload.json                      │
│  {                                               │
│    template: "incident-response",               │
│    runbook_name: "2025-04-01-api-breach",       │
│    severity: "High",                            │
│    lead: "ray@company.com",                     │
│    include_escalation: true,                    │
│    ...                                          │
│  }                                               │
└──────────────────────┬──────────────────────────┘
                       │ input_payload.json
                       ▼
┌─────────────────────────────────────────────────┐
│           template-engineer PHASE                │
│                                                  │
│  Read selected template from /templates/         │
│    playbooks/{template}.md                      │
│                                                  │
│  Merge input_payload into template variables     │
│  Apply memory formatting preferences            │
│  Evaluate conditional blocks ({{#if ...}})      │
│                                                  │
│  Output: rendered_runbook.md (in-memory)         │
└──────────────────────┬──────────────────────────┘
                       │ rendered_runbook.md
                       ▼
┌─────────────────────────────────────────────────┐
│         PostToolUse HOOK (logging)               │
│                                                  │
│  Log to /memory/run-log.jsonl:                   │
│  {                                               │
│    ts: "...", template: "incident-response",    │
│    input_hash: "abc123",                        │
│    output_path: "/runbooks/2025-04-01-..."      │
│  }                                               │
│                                                  │
│  Write generated_runbook snapshot to:           │
│    /memory/.last-generated.md                   │
└──────────────────────┬──────────────────────────┘
                       │ rendered_runbook.md
                       ▼
┌─────────────────────────────────────────────────┐
│          integration-agent PHASE                 │
│                                                  │
│  Determine output filename from naming           │
│    convention in memory                         │
│                                                  │
│  Write to /runbooks/{name}.md                   │
│                                                  │
│  git add /runbooks/{name}.md                    │
│  git commit -m "Add runbook: {name}"            │
│  git push origin main   (via GitHub MCP)        │
│                                                  │
│  Output: committed + pushed runbook              │
└──────────────────────┬──────────────────────────┘
                       │ User edits runbook (optional)
                       ▼
┌─────────────────────────────────────────────────┐
│               Stop HOOK (learning)               │
│                                                  │
│  Read /memory/.last-generated.md                │
│  Read /runbooks/{name}.md (current saved state) │
│                                                  │
│  Diff: generated vs final                       │
│  Extract structural patterns from diff          │
│                                                  │
│  For each pattern:                               │
│    if pattern.count >= threshold (default: 2):  │
│      append to /memory/runbook-preferences.yaml │
│                                                  │
│  Clean up /memory/.last-generated.md            │
└─────────────────────────────────────────────────┘
```

---

## Data Entities

### `input_payload` (transient, in-memory)

Produced by `ui-builder`, consumed by `template-engineer`.

```json
{
  "template": "incident-response",
  "runbook_name": "2025-04-01-api-breach",
  "severity": "High",
  "lead": "ray@company.com",
  "affected_systems": ["api-gateway", "auth-service"],
  "include_escalation": true,
  "summary": "Unauthorized access detected...",
  "date": "2025-04-01"
}
```

### `merged_context` (transient, in-memory)

Produced at startup by merging memory preferences with CLAUDE.md rules.
Passed to both `ui-builder` (for defaults) and `template-engineer` (for formatting).

```json
{
  "defaults": {
    "template": "incident-response",
    "severity": "High",
    "lead": "ray@company.com"
  },
  "team_rules": [
    "All incident runbooks must include a severity matrix",
    "Naming convention: YYYY-MM-DD-system-type"
  ],
  "formatting": {
    "date_format": "ISO8601",
    "use_checkboxes": true
  }
}
```

### `run-log.jsonl` (append-only, persistent)

One JSON line per run. Used for debugging and future analytics.

```jsonl
{"ts":"2025-04-01T10:00:00Z","template":"incident-response","output":"/runbooks/2025-04-01-api-breach.md","input_hash":"abc123"}
{"ts":"2025-04-01T14:30:00Z","template":"incident-response","output":"/runbooks/2025-04-01-auth-failure.md","input_hash":"def456"}
```

### `runbook-preferences.yaml` (persistent, learning store)

See `DESIGN.md → Memory Design` for full schema.

---

## Data Flow: Second Run (Improved Defaults)

On the second run, the startup phase loads preferences updated by the Stop hook
from the first run. The delta is:

```
First run:
  lead field → user typed "ray@company.com"
  include_escalation → user toggled to true (was false in template)

Stop hook after first run:
  → detected: lead was provided, include_escalation was enabled
  → persisted both to runbook-preferences.yaml (confidence: 1/2)

Second run:
  → lead field pre-filled: "ray@company.com"
  → include_escalation pre-set: true

After second run with same edits:
  Stop hook: confidence reaches 2/2 → pattern confirmed and locked in
```

---

## File Read/Write Matrix

| File | ui-builder | template-engineer | integration-agent | PostToolUse hook | Stop hook |
|---|---|---|---|---|---|
| `/memory/runbook-preferences.yaml` | R | R | — | — | W |
| `CLAUDE.md` | R | R | — | — | — |
| `/templates/playbooks/*.md` | — | R | — | — | — |
| `/templates/playbooks/_schema.yaml` | R | R | — | — | — |
| `/runbooks/*.md` | — | — | W | — | R |
| `/memory/.last-generated.md` | — | — | — | W | R/D |
| `/memory/run-log.jsonl` | — | — | — | W | — |

*R = Read, W = Write, D = Delete*

---

## Security Boundaries

- **No sensitive data crosses the memory boundary.** The Stop hook's pattern
  extractor operates on structural diffs only (section names, ordering, boolean
  fields) — never on field content like summaries, IPs, or contact details.
- **Input payload is never persisted.** It lives only in memory for the duration
  of a single run and is discarded after `integration-agent` completes.
- **Run log stores only hashes.** Input content is hashed before logging;
  the original values are never written to `run-log.jsonl`.
