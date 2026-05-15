# test-ir — Incident Response Runbook

**Date:** 2026-05-15
**Severity:** High
**Lead:** lead@example.com
**Affected System:** auth-service

## Summary

Unauthorized token replay

## Containment Steps

- Rotate keys
- Disable endpoint

## Recovery Steps

- Patch service
- Monitor logs

## Escalation Matrix

| Level | Contact | Trigger |
|---|---|---|
| L1 | Security Operations | All incidents |
| L2 | Incident Commander | Severity High+ |
| L3 | Executive Leadership | Severity Critical |

## Post-Incident Actions

- [ ] Create post-mortem document
- [ ] Open corrective action issues
- [ ] Update detection and response controls
