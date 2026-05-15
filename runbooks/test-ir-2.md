# test-ir-2 — Incident Response Runbook

**Date:** 2026-05-15
**Severity:** High
**Lead:** lead@example.com
**Affected System:** payments-api

## Summary

Credential stuffing attack

## Containment Steps

- Block IP range
- Enable WAF rule

## Recovery Steps

- Rotate user creds
- Add MFA enforcement

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
