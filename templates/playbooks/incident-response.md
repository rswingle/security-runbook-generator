# {{runbook_name}} — Incident Response Runbook

**Date:** {{date}}
**Severity:** {{severity}}
**Lead:** {{lead}}
**Affected System:** {{affected_system}}

## Summary

{{summary}}

## Containment Steps

{{containment_steps_bullets}}

## Recovery Steps

{{recovery_steps_bullets}}

{{#include_escalation}}
## Escalation Matrix

| Level | Contact | Trigger |
|---|---|---|
| L1 | Security Operations | All incidents |
| L2 | Incident Commander | Severity High+ |
| L3 | Executive Leadership | Severity Critical |
{{/include_escalation}}

## Post-Incident Actions

- [ ] Create post-mortem document
- [ ] Open corrective action issues
- [ ] Update detection and response controls
