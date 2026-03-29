# ADR: Data Breach Response Plan

**Status:** Accepted
**Date:** 2026-03-29
**Deciders:** Repo owner + Claude
**Relates to:** Backlog Priority 4 — Privacy & Parent Safety (Cross-cutting: Breach Response)
**Legal basis:** GDPR Art. 33–34, UK GDPR Art. 33–34, COPPA 16 CFR 312, LGPD Art. 48, APPI (Japan), Privacy Act (Australia)

---

## Context

This app processes personal data for children under 13 in multiple jurisdictions. Breaches involving children's data are treated with heightened severity by regulators. A documented response plan is required before the privacy policy goes live and is a prerequisite for responsible operation.

---

## What constitutes a breach

A personal data breach is any accidental or unlawful:
- Destruction, loss, or alteration of personal data
- Unauthorised disclosure of or access to personal data stored in Supabase, transmitted through the backend, or cached in localStorage on a shared device

Examples specific to this app:
- Supabase credentials leaked (service role key exposed) — all data accessible
- `app_admin_settings.reset_pin_hash` exposed — PIN cracking risk
- Backend response inadvertently returns other players' data
- Misconfigured Supabase Row Level Security exposes player records to unauthenticated requests
- Third-party dependency with a known exploit that allows data exfiltration

---

## Notification timeline

| Jurisdiction | Authority | Individuals | Deadline |
|---|---|---|---|
| **GDPR (EU)** | Lead supervisory authority (DPA of owner's member state) | If high risk to rights/freedoms | **72 hours** from awareness |
| **UK GDPR** | ICO (ico.org.uk) | If high risk | **72 hours** from awareness |
| **COPPA (US)** | FTC (ftc.gov) | Per applicable state breach notification laws | **As soon as practicable** |
| **LGPD (Brazil)** | ANPD (gov.br/anpd) | If significant risk | **"Reasonable timeframe"** (ANPD guidance: 2 business days for serious breaches) |
| **APPI (Japan)** | PPC (ppc.go.jp) | If risk of harm | **Promptly** (guidance: within 30 days for report, 60 days for investigation) |
| **Privacy Act (Australia)** | OAIC (oaic.gov.au) | If serious harm likely | **As soon as practicable** |

**Conservative default:** Assume the 72-hour GDPR window applies for any breach affecting EU/UK users. Given the app is publicly accessible, treat all breaches as potentially affecting EU/UK users unless evidence clearly establishes otherwise.

---

## Response steps

### Step 1 — Detection

**How breaches may be detected:**
- Monitoring alert: unusual burst of reset/delete calls on admin endpoints
- Monitoring alert: elevated 401 / auth failure rate on admin endpoints
- Monitoring alert: elevated 5xx error rate from the backend
- Vendor security notification from Supabase, Render, or Google
- User report (parent notices unexpected score changes or unknown explorer names)
- Dependency vulnerability alert (Dependabot, npm audit)
- Routine security review finding

**Immediate action on detection:** Record the time of awareness. The 72-hour clock starts now.

### Step 2 — Assessment

Determine within the first hour:

1. **What data was exposed?** Explorer names, scores, attempts, events, admin PIN hash, FCM tokens — or a subset?
2. **How many children affected?** Check `test_scores` count.
3. **Is the exposure ongoing?** Is the vulnerability still active, or was it a one-time event?
4. **What is the likely harm?** Explorer names + scores = low direct harm. PIN hash exposure = risk of full reset by attacker. FCM tokens = push notification abuse risk.
5. **Is regulatory notification required?** Use the timeline table above. When in doubt, notify.

### Step 3 — Containment

Take the minimum effective action to stop the breach immediately:

| Scenario | Containment action |
|---|---|
| Supabase service role key leaked | Rotate the key immediately in Supabase dashboard → update `SUPABASE_SERVICE_ROLE_KEY` in Render environment → redeploy |
| Admin key leaked | Rotate `ADMIN_KEY` in Render environment → update GitHub Actions secret |
| Reset PIN compromised | Prompt owner to change PIN via the admin panel |
| Misconfigured RLS | Disable public access in Supabase dashboard → fix RLS policy → re-enable |
| Malicious dependency | `npm audit fix` or pin to safe version → rebuild → redeploy |
| Backend data leak | Disable the affected endpoint (Render → suspend service or remove route) until patched |

### Step 4 — Notification

**Notify the supervisory authority** (use the 72-hour GDPR window as the default deadline):
- UK: [ICO online breach report](https://ico.org.uk/for-organisations/report-a-breach/)
- EU: Contact the DPA of the owner's EU member state
- US: FTC breach reporting for COPPA: [ftc.gov/coppa](https://www.ftc.gov/enforcement/coppa)

**Notify affected individuals** if the breach poses high risk:
- For this app, individual notification means contacting parents. Since no parent contact information is collected, notification must be done via:
  1. A notice banner on the app (index.html)
  2. The privacy policy page
  3. Any other available communication channel

**Notification content must include:**
- Nature of the breach
- Categories of data affected
- Approximate number of children affected
- Likely consequences
- Measures taken to address the breach
- Contact email for questions (from the privacy policy)

### Step 5 — Remediation

- Deploy the fix.
- Run `npm.cmd run smoke:live` to confirm the live backend is healthy.
- Verify no residual exposure (check Supabase RLS, re-run `npm audit`).
- Confirm the containment action has been reversed if it was temporary (e.g., re-enable a suspended endpoint).

### Step 6 — Record-keeping

Document every breach (even non-notifiable ones) in a breach register. Maintain this register indefinitely.

**Register entry fields:**
- Date/time of awareness
- Date/time of discovery (may differ from awareness)
- Nature of the breach
- Data categories and approximate volume affected
- Likely consequences
- Containment actions taken and dates
- Notification decisions (notified / not notified, and why)
- Regulatory submissions (authority, reference number, date)
- Remediation summary

**Store the register:** Locally, outside the repository (it may contain sensitive incident details). Do not commit breach records to the GitHub repo.

---

## Monitoring and alerting (to be configured)

The following patterns should trigger alerts when monitoring is set up (Priority 5 work):

- More than 5 reset/delete calls within 5 minutes from a single IP
- More than 10 consecutive 401 errors on admin endpoints within 5 minutes
- Backend 5xx error rate above baseline for more than 2 minutes
- `npm audit` findings with high or critical severity (already reported by Dependabot)

---

## Consequences

- **Positive:** Documented plan satisfies GDPR Art. 33–34 preparedness expectations and reduces regulatory risk.
- **Positive:** Step-by-step containment guide reduces response time in a real incident.
- **Negative:** Individual notification is difficult because no parent contact information is collected. A breach notice banner is the only scalable notification path.
- **Negative:** Monitoring and alerting are not yet implemented (Priority 5). Until they are, detection depends on manual review or vendor notifications.
