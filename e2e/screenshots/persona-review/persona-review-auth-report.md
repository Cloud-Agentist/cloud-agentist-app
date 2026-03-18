# Authenticated Pages — 7-Persona Review

**Generated:** 2026-03-18T18:11:42.287Z

## Summary: 12 findings
Critical: 0 | High: 0 | Medium: 7 | Low: 5

| # | Severity | Page | Persona | Finding |
|---|----------|------|---------|---------|
| 1 | MEDIUM | /capabilities | End User | Action IDs shown without human-readable labels |
| 2 | MEDIUM | auth | Security | Auth flow may not be using PKCE (no code_challenge in URL) |
| 3 | MEDIUM | auth | Compliance | Auth0 login page has no privacy/terms links |
| 4 | MEDIUM | /dashboard | End User | Dashboard uses "actor" terminology — consider "your AI" or "assistant" |
| 5 | MEDIUM | /inbox | UX | Inbox shows neither approvals nor clear empty state |
| 6 | MEDIUM | /memories | UX | No visible way to add memories/goals from the memories page |
| 7 | MEDIUM | /memories | Compliance | No data export option on memories page — GDPR portability gap |
| 8 | LOW | / | PO | No Open Graph image — poor social sharing appearance |
| 9 | LOW | /capabilities | Security | Capabilities page accessible without auth — exposes system capabilities to unauthenticated users |
| 10 | LOW | nav | PO | Memories page not discoverable from main nav |
| 11 | LOW | /dashboard | Security | Full email displayed on dashboard — consider showing display name only |
| 12 | LOW | /settings | Security | Internal actor UUID exposed on settings page — not a risk but may confuse users |

## Console Errors (4)
- Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information. 

Check the top-level render c
- Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information. 

Check the top-level render c
- %c%s%c Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information. background: #e6e6e6;bac
- Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information. 

Check the top-level render c

## Network Errors (0)
