Build a minimal CLI/TUI tool for creating security runbooks.

Context:

- Focus on speed and simplicity
- Outputs stored in /runbooks/
- Templates in /templates/playbooks/
- System should improve over time by learning user preferences

---

Subagent Strategy:

1. ui-builder (PROACTIVELY use)

- CLI/TUI interaction flow
- Collect structured inputs (JSON/YAML)

Tools: Read, Write

---

2. template-engineer (PROACTIVELY use)

- Define templates + variable schema
- Render Markdown from inputs

Tools: Read, Write

---

3. integration-agent (PROACTIVELY use)

- Save + push runbooks via git/GitHub MCP

Tools: Read, Write, Bash

---

Memory System (Learning Layer):

Persist preferences across runs using:

1. File-based memory:

- /memory/runbook-preferences.yaml
  Stores:
  - preferred sections (e.g. “always include escalation”)
  - naming conventions
  - formatting styles
  - commonly used answers

2. Project memory (CLAUDE.md):

- High-level rules and conventions shared across team
- Example: “All incident runbooks must include severity matrix”

(Subagents should read from both before generating output)

---

Learning Loop:

After each run:

1. Detect user modifications:

- Compare generated runbook vs final saved version

2. Extract patterns:

- added/removed sections
- repeated edits
- formatting changes

3. Update memory:

- write structured updates to /memory/runbook-preferences.yaml
- only persist repeated patterns (avoid noise)

---

Hooks (Deterministic Automation):

Use Claude Code hooks for consistency:

1. PostToolUse hook:

- Trigger after runbook generation
- Log:
  - selected template
  - user inputs
  - generated output

2. Stop hook:

- Trigger at end of session
- Compare final runbook vs generated version
- Update memory file with learned preferences

(Security: avoid storing sensitive incident data)

---

Workflow:

1. template-engineer defines templates
2. ui-builder collects inputs
3. Load memory (preferences + CLAUDE.md)
4. template-engineer adjusts template based on preferences
5. Generate Markdown runbook
6. integration-agent saves + pushes
7. Hooks capture output + update memory

---

Constraints:

- No complex ML or external storage
- File-based memory only
- Keep learning simple and deterministic
- No sensitive data persistence

---

Verification:

- Run tool twice:
  1st run → baseline runbook
  2nd run → confirm improvements based on learned preferences

Success Criteria:

- System adapts to user structure preferences
- Reduced input needed over time
- Consistent output style across runbooks
